# Iris — Real-time Medical Transcription Pipeline

A real-time clinical transcription and information retrieval pipeline.  
A **React + Vite** frontend captures microphone audio, streams it over a **WebSocket** to a **FastAPI** backend, which proxies it to **AssemblyAI Streaming v3** (`u3-rt-pro` model) for diarized speech-to-text, then delivers a structured per-turn transcript to an **n8n** webhook for downstream AI processing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER  (React 18 · Vite · TailwindCSS)                      │
│                                                                 │
│  Mic → AudioWorklet (PCM 16-bit 16 kHz) ──► WebSocket client   │
│                                              │                  │
│  LiveTranscriptionPreview  ◄── transcript_update (JSON)         │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ ws://…/ws/session
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND  (FastAPI · Uvicorn)                                   │
│                                                                 │
│  WebSocket handler                                              │
│    ├─ start_session  → creates session, opens AssemblyAI WS     │
│    ├─ binary frames  → forwards PCM audio to AssemblyAI         │
│    └─ finish_session → terminates AAI, builds turns, POSTs n8n  │
│                                                                 │
│  AssemblyAI Streaming v3  (u3-rt-pro)                           │
│    └─ Turn messages with speaker_labels → diarized transcript   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ HTTP POST (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  n8n  (webhook)                                                 │
│                                                                 │
│  Receives per-turn structured JSON:                             │
│    turns[] → combined_text / patient_text / clinician_text      │
│  Loop over items → route to downstream AI nodes                 │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app — WebSocket handler, AAI proxy, n8n sender
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Container image
│   ├── .env.example         # Environment template
│   └── test_validation.py   # WebSocket integration smoke-test
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI (LiveSession, SessionActions, …)
│   │   ├── hooks/
│   │   │   └── useLiveTranscription.ts   # Audio capture + WS client hook
│   │   ├── services/
│   │   │   └── transcriptionClient.ts    # WebSocket protocol client
│   │   ├── types/
│   │   │   └── n8nTurnPayload.types.ts   # Structured turn types
│   │   └── styles/          # TailwindCSS
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── docker-compose.yml
├── setup.sh / setup.ps1
└── README.md
```

---

## Features

- **Single-microphone ambient capture** via `AudioWorklet` — 16 kHz PCM, sent as raw binary WebSocket frames (zero base64 overhead)
- **Real-time streaming STT** through AssemblyAI v3 with the `u3-rt-pro` speech model
- **Speaker diarization** — speakers mapped to **Clinician** / **Patient** roles
- **Live transcript preview** in the browser with partial (in-progress) and final (committed) turns
- **Structured n8n turn payload** — each turn emitted as `{ transcript_id, role, combined_text, patient_text, clinician_text, route_* }`, identical schema to the offline audio pipeline so the same n8n workflow handles both
- **Session lifecycle** — Start → Record → Finish, with UI state management (disabled buttons, recording indicator)
- **Docker-ready** with `docker-compose.yml`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · TailwindCSS |
| Audio | `AudioWorkletNode` · PCM s16le @ 16 kHz |
| Transport | Native WebSocket (binary frames) |
| Backend | Python 3.11 · FastAPI · Uvicorn |
| STT | AssemblyAI Streaming v3 (`u3-rt-pro`) |
| Automation | n8n (webhook receiver) |
| Infra | Docker · Docker Compose |

---

## Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- An **AssemblyAI** API key ([assemblyai.com](https://www.assemblyai.com/))
- An **n8n** instance with a webhook trigger

### 1. Clone & configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# → fill in ASSEMBLYAI_API_KEY and N8N_WEBHOOK_URL

# Frontend
cp frontend/.env.example frontend/.env
# → adjust VITE_BACKEND_URL if not running locally
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The API will be available at **http://localhost:8000**.

Or use the setup helper:
```bash
bash setup.sh
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173** (Vite default).

### 4. Docker (optional)

```bash
docker compose up --build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ASSEMBLYAI_API_KEY` | ✅ | Your AssemblyAI API key |
| `ASSEMBLYAI_SPEECH_MODEL` | — | Speech model (default: `u3-rt-pro`) |
| `ASSEMBLYAI_SAMPLE_RATE` | — | Sample rate (default: `16000`) |
| `N8N_WEBHOOK_URL` | ✅ | n8n webhook endpoint to receive transcripts |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_BACKEND_URL` | — | Backend WebSocket URL (default: `ws://localhost:8000/ws/session`) |

---

## Usage

1. Open the frontend and select or create a patient
2. Click **Start Session** — the button disables, microphone activates, and audio streams to the backend
3. Speak — live partial and final turns appear in the transcript pane with speaker labels (Clinician / Patient)
4. Click **Finish Session** — audio stops, the backend sends the full structured transcript to n8n
5. The n8n webhook receives the payload and can loop over `turns[]` to extract `combined_text`, `patient_text`, and `clinician_text`

---

## WebSocket Protocol

All communication happens over a single WebSocket at `/ws/session`.

### Client → Server

| Message | Format |
|---|---|
| Start session | `{"type": "start_session", "patient": {"name": "…", "age": 42, "patientID": "…"}}` |
| Audio | Raw binary frame (Int16 PCM LE, 16 kHz mono) |
| Finish session | `{"type": "finish_session"}` |

### Server → Client

| Message | Description |
|---|---|
| `session_started` | `{"type": "session_started", "sessionID": "uuid"}` |
| `transcript_update` | `{"type": "transcript_update", "text": "…", "speaker": "Clinician", "timestamp": "01:23", "is_final": true}` |
| `session_finished` | `{"type": "session_finished", "sessionID": "…", "final_transcript": "…", "n8n_sent": true}` |
| `error` | `{"type": "error", "message": "…"}` |

---

## n8n Webhook Payload

When a session finishes, the backend POSTs this JSON to your n8n webhook:

```json
{
  "patientID": "PT-1032",
  "name": "Ava Brown",
  "age": 42,
  "final_transcript": "[00:05] Clinician: \"What brings you in today?\"\n[00:12] Patient: \"I've had chest pain for two days.\"",
  "turns": [
    {
      "transcript_id": "session-uuid",
      "created_at": "2026-03-23T10:00:00.000Z",
      "turn_id": "session-uuid_turn_0",
      "turn_index": 0,
      "speaker_label": "Clinician",
      "role": "CLINICIAN",
      "start_ms": null,
      "end_ms": null,
      "confidence": null,
      "text": "What brings you in today?",
      "combined_text": "What brings you in today?",
      "patient_text": null,
      "clinician_text": "What brings you in today?",
      "route_combined": true,
      "route_patient": false,
      "route_clinician": true
    }
  ],
  "timestamp": "2026-03-23T10:05:00.000Z",
  "sessionID": "session-uuid"
}
```

This matches the offline audio pipeline schema, so a single n8n workflow can handle both live and offline transcripts by looping over `turns[]`.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `WS` | `/ws/session` | Real-time transcription WebSocket |
| `GET` | `/health` | Health check (`{"status": "ok"}`) |

---

## Troubleshooting

### No audio / "Waiting for audio…" forever
- Check browser microphone permissions
- Ensure the backend is running and reachable at the `VITE_BACKEND_URL`
- Open DevTools → Console for WebSocket errors

### AssemblyAI connection fails
- Verify `ASSEMBLYAI_API_KEY` is set and valid in `backend/.env`
- Check backend logs for `Failed to connect to AssemblyAI` messages
- Ensure you have network access to `wss://streaming.assemblyai.com`

### n8n not receiving data
- Confirm `N8N_WEBHOOK_URL` is correct and the n8n workflow is **active**
- Test the webhook URL with `curl -X POST <url> -H "Content-Type: application/json" -d '{}'`
- Check backend logs for HTTP status codes

### Speaker labels showing "Speaker" instead of Clinician/Patient
- AssemblyAI needs enough audio context to distinguish speakers
- Ensure `speaker_labels` is enabled (it is by default)
- Longer conversations improve diarization accuracy

---

## License

MIT
