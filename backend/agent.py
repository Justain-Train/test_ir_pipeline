"""
LiveKit Agent Worker
Handles real-time speech-to-text with Speechmatics
Performs speaker diarization and sends transcripts to n8n webhook
"""
import os
import json
import logging
import asyncio
import inspect
import aiohttp
from livekit import rtc
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import speechmatics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "https://your-n8n-instance.com/webhook/transcript")
SPEECHMATICS_API_KEY = os.getenv("SPEECHMATICS_API_KEY")
# Optional: periodically publish test pings to the room's data track to verify delivery
AGENT_PUBLISH_PINGS = False

if not SPEECHMATICS_API_KEY:
    logger.warning("SPEECHMATICS_API_KEY not set - agent will not perform STT")


async def entrypoint(ctx: JobContext):
    """
    Main entry point for the LiveKit Agent
    Runs for each room session
    """
    logger.info(f"Agent started for room: {ctx.room.name}")
    
    # Connect to the room first
    await ctx.connect()
    logger.info(f"Agent connected to room: {ctx.room.name}")
    
    # Extract patient_id from room metadata or participants
    patient_id = "unknown"
    
    # Wait for a participant to connect and publish audio
    participant = await ctx.wait_for_participant()
    logger.info(f"Tracking participant: {participant.identity}")
    
    # Try to extract patient_id from participant metadata
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            patient_id = metadata.get("patient_id", "unknown")
            logger.info(f"Patient ID: {patient_id}")
        except Exception as e:
            logger.warning(f"Could not parse participant metadata: {e}")
    
    # If no Speechmatics key, just log and return
    if not SPEECHMATICS_API_KEY:
        logger.warning("No SPEECHMATICS_API_KEY - agent will idle")
        # Keep the agent running but do nothing
        await asyncio.Event().wait()
        return
    
    # Initialize Speechmatics STT with medical model and diarization
    stt = speechmatics.STT(
        api_key=SPEECHMATICS_API_KEY,
        language="en",
        speaker_active_format="<{speaker_id}>{text}</{speaker_id}>",
        model="medical",  # Use medical-specific model
        enable_diarization=True,  # Enable speaker separation
        max_speakers=2,  # Doctor and Patient
    )
    
    logger.info("Speechmatics STT initialized with medical model and diarization")
    
    # Wait for audio track to be published
    audio_track = None
    for publication in participant.track_publications.values():
        if publication.kind == rtc.TrackKind.KIND_AUDIO:
            audio_track = publication.track
            break
    
    if not audio_track:
        logger.warning("No audio track found, waiting for publication...")
        
        # Use an event to signal when track is found
        track_ready = asyncio.Event()
        
        def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participanRemotet: rtc.RemoteParticipant):
            nonlocal audio_track
            if track.kind == rtc.TrackKind.KIND_AUDIO:
                audio_track = track
                logger.info(f"Audio track subscribed: {track.sid}")
                track_ready.set()
        
        # Listen for track subscription on the room
        ctx.room.on("track_subscribed", on_track_subscribed)
        
        # Wait up to 30 seconds for audio track
        try:
            await asyncio.wait_for(track_ready.wait(), timeout=30.0)
        except asyncio.TimeoutError:
            logger.error("No audio track found after 30 seconds")
            return
    
    logger.info(f"Processing audio from track: {audio_track.sid}")
    
    # Create audio stream
    audio_stream = rtc.AudioStream(audio_track)
    
    # Create STT stream
    stt_stream = stt.stream()
    
    # Process transcripts in background
    async def handle_transcripts():
        async for event in stt_stream:
            if event.type == "final_transcript":
        
                logger.info(event)
                text = event.alternatives[0].text
                speaker_id = event.alternatives[0].speaker_id if hasattr(event.alternatives[0], 'speaker_id') else "S1"

                if text.strip():
                    logger.info(f"[{speaker_id}] {text}")
                    
                    # Prepare transcript data
                    transcript_data = {
                        "type": "transcript",
                        "text": text,
                        "speaker_id": speaker_id,
                        "patient_id": "test_patient",
                        "room_name": ctx.room.name,
                        "timestamp": event.timestamp if hasattr(event, 'timestamp') else None
                    }
                    
                    # 1. Publish to room's Data Track for frontend
                    try:
                        await ctx.room.local_participant.publish_data(
                            json.dumps(transcript_data).encode('utf-8'),
                            reliable=True
                        )
                        logger.info(f"Published transcript to data track")
                    except Exception as e:
                        logger.error(f"Failed to publish data: {e}")
                    
                    # 2. Send to n8n webhook asynchronously
                    try:
                        async with aiohttp.ClientSession() as session:
                            async with session.post(
                                N8N_WEBHOOK_URL,
                                json=transcript_data,
                                timeout=aiohttp.ClientTimeout(total=5)
                            ) as response:
                                if response.status == 200:
                                    logger.info(f"Sent transcript to n8n webhook")
                                else:
                                    logger.warning(f"n8n webhook returned status {response.status}")
                    except Exception as e:
                        logger.error(f"Failed to send to n8n webhook: {e}")

    
    # Feed audio to STT in background
    async def feed_audio():
        async for frame in audio_stream:
            # The AudioStream yields an AudioFrameEvent-like object whose
            # structure can vary across LiveKit versions. The STT push_frame
            # expects an object with a `sample_rate` attribute (or raw bytes
            # in some implementations). Try to normalize common shapes.
            push_obj = None

            # If the event already has sample_rate, use it directly
            if hasattr(frame, "sample_rate"):
                push_obj = frame
            else:
                # Common wrapper attribute names to unwrap
                for attr in ("frame", "audio_frame", "payload", "data", "samples"):
                    if hasattr(frame, attr):
                        candidate = getattr(frame, attr)
                        if hasattr(candidate, "sample_rate") or isinstance(candidate, (bytes, bytearray)):
                            push_obj = candidate
                            break

            if push_obj is None:
                # Couldn't find an expected shape — log and skip this frame
                try:
                    logger.debug(f"Unexpected audio frame type, keys: {dir(frame)}")
                except Exception:
                    logger.debug("Unexpected audio frame and failed to inspect it")
                continue

            try:
                result = stt_stream.push_frame(push_obj)
                # push_frame may be sync or async depending on STT implementation
                if inspect.isawaitable(result):
                    await result
            except Exception as e:
                logger.error(f"Error pushing audio frame to STT: {e}")
    
    # Run tasks concurrently (include optional ping publisher)
    tasks = [handle_transcripts(), feed_audio()]

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
