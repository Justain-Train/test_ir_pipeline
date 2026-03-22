# Medical IR Pipeline - Real-time Transcription

A real-time medical transcription and information retrieval pipeline using FastAPI, LiveKit Agents, Speechmatics, and n8n.

## Architecture

```
├── backend/
│   ├── main.py              # FastAPI app with CORS
│   ├── routes/
│   │   └── livekit.py       # Token generation & webhooks
│   └── agent.py             # LiveKit Agent worker (STT + diarization)
└── frontend/
    └── index.html           # LiveKit client UI
```

## Features

- **Single-microphone ambient capture** with speaker diarization
- **Real-time transcription** using Speechmatics medical model
- **Speaker separation** (Doctor vs Patient)
- **Dual output**: LiveKit Data Track (frontend) + n8n webhook (backend)
- **Patient ID tracking** via room metadata

## Setup

### 1. Install Dependencies

Activate your virtual environment:
```bash
source .venv/bin/activate  # macOS/Linux
```

Install packages:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required variables:
- `LIVEKIT_API_KEY` & `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`
- `SPEECHMATICS_API_KEY`
- `N8N_WEBHOOK_URL`

### 3. Run the Backend

```bash
cd backend
python main.py
```

API will be available at `http://localhost:8000`

### 4. Run the LiveKit Agent

In a separate terminal:
```bash
cd backend
python agent.py dev
```

### 5. Open the Frontend

Open `frontend/index.html` in your browser or serve it with:
```bash
cd frontend
python -m http.server 8080
```

Then navigate to `http://localhost:8080`

## Usage

1. Click **"Start Medical Session"** in the frontend
2. Allow microphone access when prompted
3. The agent will:
   - Transcribe speech in real-time
   - Separate speakers (S1 = Doctor, S2 = Patient)
   - Display transcripts in the frontend
   - Send transcripts to your n8n webhook

## API Endpoints

### `POST /livekit/token`
Generate a LiveKit access token

**Request:**
```json
{
  "room_name": "test-medical-room",
  "participant_name": "Dr_Test_User",
  "patient_id": "patient_123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://...",
  "room_name": "test-medical-room"
}
```

### `POST /livekit/webhook`
Handle LiveKit events (room_finished, participant_joined, etc.)

## n8n Webhook Payload

The agent sends this JSON to your n8n webhook:
```json
{
  "type": "transcript",
  "text": "Patient reports chest pain",
  "speaker_id": "S2",
  "patient_id": "patient_123",
  "room_name": "test-medical-room",
  "timestamp": 1234567890
}
```

## Troubleshooting

### Agent not receiving audio
- Check that the frontend is using the correct LiveKit URL
- Verify microphone permissions in browser
- Ensure agent is running before starting the session

### No speaker diarization
- Verify `SPEECHMATICS_API_KEY` is valid
- Check that Speechmatics supports medical model in your region
- Review agent logs for STT errors

### n8n not receiving data
- Test webhook URL with curl/Postman
- Check agent logs for HTTP errors
- Verify n8n workflow is active

## License

MIT
