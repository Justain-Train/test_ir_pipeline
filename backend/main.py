import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import os
from urllib.parse import urlencode
from dotenv import load_dotenv
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import websockets
from websockets.exceptions import WebSocketException


load_dotenv()
app = FastAPI(title="Iris Real-time Transcription API")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Configuration
# ============================================================================

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "https://your-n8n-instance/webhook/transcript"
)
ASSEMBLYAI_WS_BASE_URL = "wss://streaming.assemblyai.com/v3/ws"
ASSEMBLYAI_SPEECH_MODEL = os.getenv("ASSEMBLYAI_SPEECH_MODEL", "u3-rt-pro")
ASSEMBLYAI_WS_PARAMS = {
    "sample_rate": 16000,
    "speech_model": ASSEMBLYAI_SPEECH_MODEL,
    "format_turns": "true",
    "end_of_turn_confidence_threshold": 0.4,
    "min_end_of_turn_silence_when_confident": 400,
    "max_turn_silence": 1200,
    "vad_threshold": 0.4,
    "speaker_labels": "true",
    "language_detection": "false",
}

ASSEMBLYAI_WS_URL = f"{ASSEMBLYAI_WS_BASE_URL}?{urlencode(ASSEMBLYAI_WS_PARAMS)}"

# ============================================================================
# Session Management
# ============================================================================

class SessionState:
    """In-memory session storage"""
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
    
    def create_session(self, patient_info: dict) -> str:
        """Create a new session and return sessionID"""
        session_id = str(uuid.uuid4())
        import time
        self.sessions[session_id] = {
            "sessionID": session_id,
            "patient": patient_info,
            "transcript_chunks": [],
            "diarized_lines": [],  # list of {"timestamp": str, "speaker": str, "text": str}
            "start_time": time.monotonic(),
            "created_at": datetime.now().isoformat(),
            "aai_ws": None,  # AssemblyAI WebSocket connection
        }
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        return self.sessions.get(session_id)
    
    def append_transcript(self, session_id: str, text: str) -> None:
        """Append transcript chunk to session"""
        session = self.sessions.get(session_id)
        if session:
            session["transcript_chunks"].append(text)

    def append_diarized_line(self, session_id: str, timestamp: str, speaker: str, text: str) -> None:
        """Append a diarized transcript line"""
        session = self.sessions.get(session_id)
        if session:
            session["diarized_lines"].append({
                "timestamp": timestamp,
                "speaker": speaker,
                "text": text,
            })

    def get_final_transcript(self, session_id: str) -> str:
        """Get combined final transcript formatted with diarization"""
        session = self.sessions.get(session_id)
        if not session:
            return ""
        if session["diarized_lines"]:
            return "\n".join(
                f'[{line["timestamp"]}] {line["speaker"]}: "{line["text"]}"'
                for line in session["diarized_lines"]
            )
        return " ".join(session["transcript_chunks"])
    
    def set_aai_ws(self, session_id: str, ws) -> None:
        """Store AssemblyAI WebSocket connection"""
        session = self.sessions.get(session_id)
        if session:
            session["aai_ws"] = ws
    
    def get_aai_ws(self, session_id: str):
        """Get AssemblyAI WebSocket connection"""
        session = self.sessions.get(session_id)
        if session:
            return session["aai_ws"]
        return None
    
    def delete_session(self, session_id: str) -> None:
        """Clean up session"""
        if session_id in self.sessions:
            del self.sessions[session_id]


sessions = SessionState()

# ============================================================================
# AssemblyAI Integration
# ============================================================================

async def connect_to_assemblyai(session_id: str):
    """
    Connect to AssemblyAI streaming API.
    Returns WebSocket connection or None on failure.
    """
    try:
        if not ASSEMBLYAI_API_KEY:
            print("Failed to connect to AssemblyAI: ASSEMBLYAI_API_KEY is not set")
            return None

        ws = await websockets.connect(
            ASSEMBLYAI_WS_URL,
            additional_headers={"Authorization": ASSEMBLYAI_API_KEY},
            ping_interval=20,
            ping_timeout=20,
            compression=None,
            max_queue=8,
            write_limit=2**16,
        )
        sessions.set_aai_ws(session_id, ws)
        return ws
    except Exception as e:
        error_text = str(e)
        if "410" in error_text:
            print(
                "Failed to connect to AssemblyAI: HTTP 410 (endpoint/protocol deprecated). "
                "Using v3 endpoint with Authorization header and query params is required. "
                f"Raw error: {error_text}"
            )
        else:
            print(f"Failed to connect to AssemblyAI: {error_text}")
        return None


async def send_audio_to_assemblyai(aai_ws, audio_chunk: bytes) -> None:
    """Send raw audio chunk to AssemblyAI"""
    if aai_ws and audio_chunk:
        try:
            # AssemblyAI streaming expects binary PCM/compressed frames, not JSON-wrapped audio.
            await aai_ws.send(audio_chunk)
        except Exception as e:
            print(f"Error sending audio to AssemblyAI: {e}")


def _format_elapsed(session_id: str) -> str:
    """Return [MM:SS] timestamp relative to session start."""
    import time
    session = sessions.get_session(session_id)
    if not session:
        return "[00:00]"
    elapsed = time.monotonic() - session["start_time"]
    minutes = int(elapsed) // 60
    seconds = int(elapsed) % 60
    return f"{minutes:02d}:{seconds:02d}"


def _speaker_label(speaker_raw) -> str:
    """Map AssemblyAI speaker id to a human-friendly label."""
    if speaker_raw is None or speaker_raw == "":
        return "Speaker"
    s = str(speaker_raw).upper()
    if s in ("A", "0", "SPEAKER_A", "SPEAKER_0"):
        return "Clinician"
    if s in ("B", "1", "SPEAKER_B", "SPEAKER_1"):
        return "Patient"
    # Fallback for more than 2 speakers
    return f"Speaker {s}"


def _extract_speaker_from_turn(data: dict) -> str:
    """
    Extract speaker from an AssemblyAI v3 Turn message.
    v3 uses 'speaker_label' at the top level of Turn messages.
    """
    # v3: speaker_label is the correct field on Turn messages
    speaker = data.get("speaker_label")
    if speaker is not None and speaker != "":
        return _speaker_label(speaker)

    # Fallback: try older 'speaker' field
    speaker = data.get("speaker")
    if speaker is not None and speaker != "":
        return _speaker_label(speaker)

    return "Speaker"


async def receive_from_assemblyai(
    session_id: str,
    aai_ws,
    client_manager: "ClientConnectionManager"
) -> None:
    """
    Listen for transcripts from AssemblyAI and relay to frontend.
    Runs concurrently with audio streaming.
    """
    last_final_transcript = ""

    try:
        async for message in aai_ws:
            if isinstance(message, bytes):
                # Binary data - skip
                continue

            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue

            # Handle current v3 messages and older message_type variants.
            msg_type = data.get("type") or data.get("message_type")

            if msg_type in {"Begin", "SessionBegins"}:
                print(f"[{session_id}] AssemblyAI session started")

            elif msg_type in ("PartialTranscript", "FinalTranscript"):
                # Ignore these — we rely on Turn messages for diarized output.
                pass

            elif msg_type == "Turn":
                transcript_text = (data.get("transcript") or "").strip()
                if transcript_text:
                    is_final_turn = bool(data.get("end_of_turn"))
                    timestamp = _format_elapsed(session_id)

                    if is_final_turn:
                        speaker = _extract_speaker_from_turn(data)
                        # Avoid duplicate final appends
                        if transcript_text != last_final_transcript:
                            sessions.append_transcript(session_id, transcript_text)
                            sessions.append_diarized_line(session_id, timestamp, speaker, transcript_text)
                            last_final_transcript = transcript_text

                        await client_manager.send_personal(
                            session_id,
                            {
                                "type": "transcript_update",
                                "text": transcript_text,
                                "speaker": speaker,
                                "timestamp": timestamp,
                                "is_final": True,
                            }
                        )
                    else:
                        # Partial turn — no speaker label yet, show as in-progress
                        await client_manager.send_personal(
                            session_id,
                            {
                                "type": "transcript_update",
                                "text": transcript_text,
                                "speaker": "",
                                "timestamp": timestamp,
                                "is_final": False,
                            }
                        )

            elif msg_type in {"Termination", "SessionTerminated"}:
                print(f"[{session_id}] AssemblyAI session terminated")
                break

            elif msg_type == "Error":
                print(f"[{session_id}] AssemblyAI error event: {data}")
                break

    except Exception as e:
        print(f"[{session_id}] Error receiving from AssemblyAI: {e}")
    finally:
        try:
            await aai_ws.close()
        except Exception:
            pass


# ============================================================================
# n8n Integration
# ============================================================================

async def send_to_n8n(
    session_id: str,
    patient_id: str,
    patient_name: str,
    patient_age: int,
    final_transcript: str,
    turns: list[dict],
) -> bool:
    """
    Send final transcript to n8n webhook.
    Includes a structured per-turn JSON array that matches the offline pipeline
    so downstream n8n workflows can iterate the same schema.
    Returns True on success, False on failure.
    """
    created_at = datetime.now().isoformat() + "Z"

    # Build the per-turn items that mirror the offline pipeline output
    n8n_items = []
    role_map = {"Clinician": "CLINICIAN", "Patient": "PATIENT"}
    for idx, turn in enumerate(turns):
        speaker = turn.get("speaker", "Speaker")
        role = role_map.get(speaker, "UNKNOWN")
        text = turn.get("text", "")
        n8n_items.append({
            "transcript_id": session_id,
            "created_at": created_at,
            "turn_id": f"{session_id}_turn_{idx}",
            "turn_index": idx,
            "speaker_label": speaker,
            "role": role,
            "start_ms": None,
            "end_ms": None,
            "confidence": None,
            "text": text,
            "combined_text": text,
            "patient_text": text if role == "PATIENT" else None,
            "clinician_text": text if role == "CLINICIAN" else None,
            "route_combined": True,
            "route_patient": role == "PATIENT",
            "route_clinician": role == "CLINICIAN",
        })

    payload = {
        "patientID": patient_id,
        "name": patient_name,
        "age": patient_age,
        "final_transcript": final_transcript,
        "turns": n8n_items,
        "timestamp": created_at,
        "sessionID": session_id,
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(N8N_WEBHOOK_URL, json=payload)
            
            if response.status_code in [200, 201, 202]:
                print(f"[{session_id}] Successfully sent transcript to n8n")
                return True
            else:
                print(f"[{session_id}] n8n webhook returned {response.status_code}")
                return False
    
    except Exception as e:
        print(f"[{session_id}] Error sending to n8n: {e}")
        return False


# ============================================================================
# WebSocket Client Manager
# ============================================================================

class ClientConnectionManager:
    """Manage WebSocket connections for each session"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Register a client connection"""
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str) -> None:
        """Unregister a client connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_personal(self, session_id: str, message: dict) -> None:
        """Send message to specific client"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                print(f"Error sending to {session_id}: {e}")
                self.disconnect(session_id)


client_manager = ClientConnectionManager()

# ============================================================================
# WebSocket Handler
# ============================================================================

@app.websocket("/ws/session")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time transcription.
    
    Message formats:
    1. Start session:
       {"type": "start_session", "patient": {"name": str, "age": int, "patientID": str}}
    
    2. Audio chunk:
       {"type": "audio_chunk", "data": <base64-encoded audio>}
    
    3. Finish session:
       {"type": "finish_session"}
    """
    
    session_id: Optional[str] = None
    aai_ws = None
    aai_task: Optional[asyncio.Task] = None
    
    try:
        await websocket.accept()
        print("WebSocket connection accepted")
        
        while True:
            # Receive message from frontend — binary frames are audio,
            # text/JSON frames are control messages.
            ws_message = await websocket.receive()

            # --- Binary frame: raw PCM audio, forward immediately ---
            if "bytes" in ws_message and ws_message["bytes"]:
                if session_id and aai_ws:
                    await send_audio_to_assemblyai(aai_ws, ws_message["bytes"])
                continue

            # --- Text frame: JSON control message ---
            raw_text = ws_message.get("text")
            if not raw_text:
                continue
            message = json.loads(raw_text)
            msg_type = message.get("type")
            
            # ================================================================
            # START_SESSION: Initialize session and connect to AssemblyAI
            # ================================================================
            if msg_type == "start_session":
                patient_info = message.get("patient", {})
                
                # Create session
                session_id = sessions.create_session(patient_info)
                client_manager.connect(session_id, websocket)
                
                print(f"[{session_id}] Session started for patient: {patient_info.get('name')}")
                
                # Connect to AssemblyAI
                aai_ws = await connect_to_assemblyai(session_id)
                
                if aai_ws:
                    # Start receiving transcripts from AssemblyAI in background
                    aai_task = asyncio.create_task(
                        receive_from_assemblyai(session_id, aai_ws, client_manager)
                    )
                    
                    # Confirm to frontend
                    await websocket.send_json({
                        "type": "session_started",
                        "sessionID": session_id,
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to connect to transcription service",
                    })
            
            # ================================================================
            # AUDIO_CHUNK: Forward audio to AssemblyAI
            # ================================================================
            elif msg_type == "audio_chunk":
                if not session_id or not aai_ws:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session",
                    })
                    continue
                
                try:
                    # Audio data comes as base64 or binary
                    audio_data = message.get("data")
                    if isinstance(audio_data, str):
                        # Base64 encoded
                        import base64
                        audio_bytes = base64.b64decode(audio_data)
                    else:
                        audio_bytes = audio_data
                    
                    await send_audio_to_assemblyai(aai_ws, audio_bytes)
                
                except Exception as e:
                    print(f"[{session_id}] Error processing audio chunk: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Audio processing failed: {str(e)}",
                    })
            
            # ================================================================
            # FINISH_SESSION: Finalize and send to n8n
            # ================================================================
            elif msg_type == "finish_session":
                if not session_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session",
                    })
                    continue
                
                print(f"[{session_id}] Finishing session...")
                
                # Close AssemblyAI connection
                if aai_ws:
                    try:
                        print(f"[{session_id}] Sending AssemblyAI terminate event...")
                        await aai_ws.send(json.dumps({"type": "Terminate"}))
                    except Exception as e:
                        print(f"[{session_id}] Failed to send terminate message: {e}")
                
                # Wait for AssemblyAI receiver task to complete
                if aai_task:
                    try:
                        await asyncio.wait_for(aai_task, timeout=5)
                    except asyncio.TimeoutError:
                        print(f"[{session_id}] AssemblyAI receiver timeout")
                        aai_task.cancel()
                    except Exception as e:
                        print(f"[{session_id}] AssemblyAI receiver error: {e}")

                if aai_ws:
                    try:
                        print(f"[{session_id}] Closing AssemblyAI connection...")
                        await aai_ws.close()
                    except Exception:
                        pass
                
                # Get final transcript
                session = sessions.get_session(session_id)
                if session:
                    final_transcript = sessions.get_final_transcript(session_id)
                    patient = session["patient"]
                    diarized_lines = session.get("diarized_lines", [])
                    
                    # Send to n8n (includes structured per-turn items)
                    success = await send_to_n8n(
                        session_id=session_id,
                        patient_id=patient.get("patientID", ""),
                        patient_name=patient.get("name", ""),
                        patient_age=patient.get("age", 0),
                        final_transcript=final_transcript,
                        turns=diarized_lines,
                    )
                    
                    # Notify frontend
                    await websocket.send_json({
                        "type": "session_finished",
                        "sessionID": session_id,
                        "final_transcript": final_transcript,
                        "n8n_sent": success,
                    })
                
                # Clean up session
                sessions.delete_session(session_id)
                client_manager.disconnect(session_id)
                session_id = None
                break
    
    except WebSocketDisconnect:
        print(f"[{session_id}] WebSocket disconnected")
    
    except Exception as e:
        print(f"[{session_id}] Unexpected error: {e}")
    
    finally:
        # Cleanup on disconnect
        if aai_ws:
            try:
                await aai_ws.close()
            except Exception:
                pass
        
        if aai_task and not aai_task.done():
            aai_task.cancel()
        
        if session_id:
            sessions.delete_session(session_id)
            client_manager.disconnect(session_id)
        
        try:
            await websocket.close()
        except:
            pass
        
        print(f"[{session_id}] Cleanup complete")


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
