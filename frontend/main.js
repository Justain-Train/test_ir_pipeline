import { Room, RoomEvent } from 'livekit-client';

const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');
const transcriptBox = document.getElementById('transcript-box');

let room;

startBtn.addEventListener('click', async () => {
    statusDiv.innerText = "Status: Fetching token...";
    
    try {
        // 1. Get Token from your FastAPI
        const response = await fetch('http://localhost:8000/livekit/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_name: "test-room6",
                participant_name: "Dr_Test_User",
                patient_id: "patient_id_123"
            })
        });
        const { token, url } = await response.json();

        // 2. Initialize the Room
        room = new Room();

        // Helpful debug listeners (defensive about participants)
        room.on(RoomEvent.Connected, () => {
            const participantsArray = Array.from(room.participants?.values?.() ?? room.participants ?? []);
            const count = participantsArray.length ?? 0;
            console.log('Room connected', { url, participants: count });
        });
        room.on(RoomEvent.ParticipantConnected, (p) => {
            console.log('Participant connected:', p.identity, p.sid);
        });
        room.on(RoomEvent.ParticipantDisconnected, (p) => {
            console.log('Participant disconnected:', p.identity, p.sid);
        });

        // 3. Listen for Transcripts from the Agent (Speechmatics)
        room.on(RoomEvent.DataReceived, (payload, participant) => {
            try {
                const decoder = new TextDecoder();
                const data = JSON.parse(decoder.decode(payload));
                console.debug('DataReceived', { data, from: participant?.identity });
                console.log('Received data payload:', data.text);
                if (data.type === 'transcript') {
                    const p = document.createElement('p');
                    const speakerClass = data.speaker_id === 'S1' ? 'speaker-doctor' : 'speaker-patient';
                    const speakerName = data.speaker_id === 'S1' ? 'Doctor' : 'Patient';
                    
                    p.innerHTML = `<span class="${speakerClass}">${speakerName}:</span> ${data.text}`;
                    transcriptBox.appendChild(p);
                    transcriptBox.scrollTop = transcriptBox.scrollHeight;
                }
            } catch (err) {
                console.error('Failed to decode DataReceived payload', err);
            }
        });

        // 4. Connect to LiveKit Cloud (or your self-hosted server)
        await room.connect(url, token);
        
        // 5. Enable the single microphone for ambient capture
        // request mic and publish local audio
        try {
            await room.localParticipant.setMicrophoneEnabled(true);
            // Log published local tracks safely
            const tracks = Array.from(room.localParticipant?.audioTracks?.values?.() ?? []);
            console.log('Local audio tracks:', tracks.map(t => ({
                trackKind: t.track?.kind,
                trackSid: t.trackSid,
                published: t.isPublished
            })));
        } catch (err) {
            console.error('Error enabling microphone:', err);
            statusDiv.innerText = "Status: Microphone error - see console";
            return;
        }

        // show participants + agent presence (defensive)
        const participantsList = Array.from(room.participants?.values?.() ?? []);
        console.log('Current participants:', participantsList.map(p => ({ identity: p.identity, sid: p.sid, metadata: p.metadata })));

        statusDiv.innerText = "Status: LIVE (Recording & Separating Speakers)";
        startBtn.disabled = true;

    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Status: Error - " + (error?.message ?? String(error));
    }
});
