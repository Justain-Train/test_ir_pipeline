# Iris — Real-Time Clinical Interview Transcription & AI Summary

A full-stack application for real-time clinical interview transcription with speaker diarization, AI-powered summaries, and doctor follow-up Q&A — all powered by AssemblyAI, n8n workflows, and Groq.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Dashboard    │  │ New Session  │  │  Upload Audio (offline)│ │
│  │  (HomePage)   │  │ (LiveSession)│  │  → n8n webhook         │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘ │
│                           │                                     │
│           WebSocket       │   HTTP POST                         │
│           (audio stream)  │   (summary / Q&A)                   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────────┐
              │             ▼                     │
              │     BACKEND (FastAPI)             │
              │                                   │
              │  ┌─────────────────────────┐      │
              │  │  WebSocket /ws/session   │      │
              │  │  • Receives PCM audio    │      │
              │  │  • Streams to AssemblyAI │      │
              │  │  • Speaker diarization   │      │
              │  │  • Returns turns live    │      │
              │  └────────────┬────────────┘      │
              │               │                   │
              └───────────────┼───────────────────┘
                              │
                 ┌────────────┼────────────────┐
                 │            ▼                │
                 │   AssemblyAI v3 Streaming   │
                 │   Model: u3-rt-pro          │
                 │   • Real-time transcription │
                 │   • Speaker labels (A/B)    │
                 │   • Turn-based diarization  │
                 └────────────┬────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              │               ▼                   │
              │          n8n Workflows            │
              │                                   │
              │  ┌──────────────────────────────┐ │
              │  │  Summary Webhook             │ │
              │  │  POST { transcript }          │ │
              │  │  → Groq LLM → summary_text   │ │
              │  └──────────────────────────────┘ │
              │                                   │
              │  ┌──────────────────────────────┐ │
              │  │  Q&A Webhook                 │ │
              │  │  POST { question,            │ │
              │  │    transcript_id, scope, k } │ │
              │  │  → Supabase RAG → Groq LLM  │ │
              │  │  → answer_text               │ │
              │  └──────────────────────────────┘ │
              │                                   │
              │  ┌──────────────────────────────┐ │
              │  │  Upload Webhook              │ │
              │  │  POST multipart/form-data    │ │
              │  │  → AssemblyAI offline        │ │
              │  │  → Supabase storage          │ │
              │  └──────────────────────────────┘ │
              │                                   │
              │  ┌──────────────────────────────┐ │
              │  │  Transcript Delivery Webhook │ │
              │  │  POST { session_id,          │ │
              │  │    patient_*, transcript,     │ │
              │  │    turns[] }                 │ │
              │  └──────────────────────────────┘ │
              └───────────────────────────────────┘
```

---

## Project Structure

```
test_ir_pipeline-1/
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── main.py                    # FastAPI server + WebSocket handler
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Backend container
│   ├── .env                       # Runtime config (not committed)
│   ├── .env.example               # Config template
│   └── test_validation.py         # Backend tests
│
└── frontend/
    ├── index.html                 # Vite entry point
    ├── package.json               # Node dependencies
    ├── vite.config.js             # Vite bundler config
    ├── tailwind.config.js         # Tailwind CSS config
    ├── postcss.config.js          # PostCSS config
    ├── tsconfig.json              # TypeScript config
    ├── .env                       # Runtime config (not committed)
    ├── .env.example               # Config template
    │
    └── src/
        ├── main.tsx               # React entry point
        ├── vite-env.d.ts          # Vite type declarations
        ├── svg.d.ts               # SVG import types
        │
        ├── components/
        │   ├── AppLayout.tsx          # Shell layout with sidebar
        │   ├── IrisDashboard.tsx      # Dashboard view
        │   ├── LiveSession.tsx        # Live session orchestrator
        │   ├── PatientRecordCard.tsx   # Patient info card
        │   ├── Sidebar.tsx            # Navigation sidebar
        │   ├── StartSessionButton.tsx  # Start session entry point
        │   ├── UploadAudio.tsx        # Offline audio upload to n8n
        │   │
        │   └── ui/
        │       ├── Badge.tsx                  # Generic badge
        │       ├── Button.tsx                 # Reusable button
        │       ├── Card.tsx                   # Card container
        │       ├── EntityPill.tsx             # Entity tag pill
        │       ├── ExistingPatientPicker.tsx   # Patient dropdown
        │       ├── FormField.tsx              # Form input wrapper
        │       ├── Header.tsx                 # Page header
        │       ├── LiveTranscriptionPreview.tsx # Live transcript display
        │       ├── NewPatientModal.tsx         # New patient form modal
        │       ├── RiskBadge.tsx              # Risk level badge
        │       ├── Section.tsx                # Section wrapper
        │       ├── SectionLabel.tsx           # Section label
        │       ├── SessionActions.tsx         # Start/Finish/Cancel buttons
        │       ├── SessionModeToggle.tsx      # Existing/New patient toggle
        │       ├── SessionSummary.tsx         # AI summary + Q&A panel
        │       ├── SidebarNavItem.tsx         # Sidebar nav link
        │       ├── StatusBadge.tsx            # Status indicator
        │       └── StatusBanner.tsx           # Connection status banner
        │
        ├── hooks/
        │   └── useLiveTranscription.ts    # WebSocket + transcription state
        │
        ├── lib/
        │   ├── constants.ts               # App-wide constants
        │   └── env.ts                     # Environment variable helpers
        │
        ├── pages/
        │   ├── HomePage.tsx               # Dashboard page
        │   └── NewSessionPage.tsx         # New session page
        │
        ├── public/
        │   ├── audioicon.svg              # Audio nav icon
        │   ├── dashboardicon.svg          # Dashboard nav icon
        │   └── newsessionicon.svg         # New session nav icon
        │
        ├── services/
        │   └── transcriptionClient.ts     # WebSocket client service
        │
        ├── styles/
        │   └── tailwind.css               # Global styles
        │
        ├── tests/
        │   ├── livekitTokenService.test.ts    # Legacy tests
        │   └── useLivekitSession.test.tsx     # Legacy tests
        │
        └── types/
            ├── n8nTurnPayload.types.ts        # n8n turn JSON schema
            ├── sessionPayload.types.ts        # Session payload types
            └── transcriptPayload.types.ts     # Transcript payload types
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Vite | UI framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Backend** | Python, FastAPI, uvicorn | WebSocket server |
| **Transcription** | AssemblyAI v3 Streaming (`u3-rt-pro`) | Real-time speech-to-text with speaker diarization |
| **AI Summaries** | Groq LLM (via n8n) | Clinical interview summarisation |
| **RAG Retrieval** | Supabase (via n8n) | Vector search for Q&A context |
| **Orchestration** | n8n | Workflow automation for summaries, Q&A, uploads |
| **Containerisation** | Docker, Docker Compose | Deployment |

---

## Features

### Real-Time Transcription
- Live audio capture from browser microphone (PCM 16-bit, 16kHz)
- Streamed via WebSocket to FastAPI backend → AssemblyAI v3
- Speaker diarization with Clinician/Patient role mapping
- Turn-by-turn transcript display with timestamps

### Patient Management
- Select from existing patients or create new ones
- Patient ID, name, and age tracked per session

### AI Summary (Post-Session)
- After finishing a session, generate an AI summary of the interview
- Full transcript sent to n8n → Groq LLM
- Summary displayed in a clean card below the transcript

### Doctor Q&A (Post-Session)
- Ask follow-up questions about the interview after it ends
- Question + transcript_id sent to n8n → Supabase RAG → Groq LLM
- Answers displayed with supporting evidence turns
- Full Q&A history preserved in scrollable list

### Offline Audio Upload
- Upload pre-recorded audio files (.wav, .mp3, .m4a, .ogg, .webm, .flac, .mp4)
- Files sent to n8n webhook for offline AssemblyAI transcription
- Input validation: file type, max 100MB, non-empty

### n8n Integration
- Structured per-turn JSON sent on session finish (matches offline pipeline schema)
- Separate webhooks for: transcript delivery, summary, Q&A, audio upload

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ASSEMBLYAI_API_KEY` | ✅ | — | AssemblyAI API key |
| `ASSEMBLYAI_SAMPLE_RATE` | ❌ | `16000` | Audio sample rate |
| `ASSEMBLYAI_SPEECH_MODEL` | ❌ | `u3-rt-pro` | AssemblyAI streaming model |
| `ASSEMBLYAI_ENCODING` | ❌ | `pcm_s16le` | Audio encoding format |
| `N8N_WEBHOOK_URL` | ❌ | — | n8n webhook for final transcript delivery |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_BACKEND_URL` | ✅ | `ws://localhost:8000/ws/session` | Backend WebSocket URL |
| `VITE_N8N_UPLOAD_WEBHOOK_URL` | ❌ | — | n8n webhook for audio file uploads |
| `VITE_N8N_SUMMARY_WEBHOOK_URL` | ❌ | — | n8n webhook for AI summary generation |
| `VITE_N8N_QA_WEBHOOK_URL` | ❌ | — | n8n webhook for doctor follow-up Q&A |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **AssemblyAI** API key ([get one here](https://www.assemblyai.com/dashboard/signup))
- **n8n** instance (local or cloud) with workflows configured

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your AssemblyAI API key and n8n webhook URL

# Run
python main.py
# Server starts on http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your webhook URLs

# Run
npm run dev
# App starts on http://localhost:5173
```

### Docker Compose

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

---

## WebSocket Protocol

### Client → Server

| Message | Description |
|---------|-------------|
| `{ "type": "start_session", "patient_id": "...", "patient_name": "...", "patient_age": 42 }` | Start a new transcription session |
| `{ "type": "audio_data", "data": "<base64 PCM>" }` | Stream audio chunk |
| `{ "type": "finish_session" }` | End session, trigger final transcript + n8n delivery |
| `{ "type": "cancel_session" }` | Cancel session without saving |

### Server → Client

| Message | Description |
|---------|-------------|
| `{ "type": "session_started", "session_id": "..." }` | Session confirmed |
| `{ "type": "transcript_update", "text": "...", "speaker": "A", "is_final": true }` | Live transcript turn |
| `{ "type": "session_finished", "final_transcript": "...", "n8n_status": "sent" }` | Session complete |
| `{ "type": "session_cancelled" }` | Session cancelled |
| `{ "type": "error", "message": "..." }` | Error message |

---

## n8n Webhook Payloads

### Transcript Delivery (on session finish)

```json
{
  "session_id": "sess_abc123",
  "patient_id": "PT-1032",
  "patient_name": "Ava Brown",
  "patient_age": 42,
  "created_at": "2026-03-27T14:30:00.000Z",
  "final_transcript": "[00:05] Clinician: \"What brings you in today?\" ...",
  "turns": [
    {
      "json": {
        "transcript_id": "sess_abc123",
        "turn_id": "sess_abc123_turn_0",
        "turn_index": 0,
        "speaker_label": "A",
        "role": "CLINICIAN",
        "text": "What brings you in today?",
        "combined_text": "What brings you in today?",
        "patient_text": null,
        "clinician_text": "What brings you in today?",
        "route_combined": true,
        "route_patient": false,
        "route_clinician": true
      }
    }
  ]
}
```

### Summary Request

```json
{ "transcript": "[00:05] Clinician: \"What brings you in?\" ..." }
```

### Summary Response

```json
{
  "summary_text": "The patient presented with persistent headaches...",
  "transcript": "...",
  "safety_note": "Educational use only. No diagnosis or treatment recommendation."
}
```

### Q&A Request

```json
{
  "question": "What medications were discussed?",
  "scope": "combined",
  "k": 5,
  "transcript_id": "sess_abc123"
}
```

### Q&A Response

```json
{
  "question": "What medications were discussed?",
  "scope": "combined",
  "k": 5,
  "answer_text": "The clinician asked about current medications...",
  "supporting_turns": [
    {
      "rank": 1,
      "role": "CLINICIAN",
      "turn_id": "sess_abc123_turn_3",
      "turn_index": 3,
      "start_ms": 15000,
      "end_ms": 22000,
      "content": "Are you currently taking any medications?"
    }
  ],
  "safety_note": "Educational use only. No diagnosis or treatment recommendation."
}
```

---

## Usage Flow

1. **Navigate** to "New Session" in the sidebar
2. **Select** an existing patient or create a new one
3. **Click** "Start Session" — microphone access is requested
4. **Speak** — the transcript appears in real-time with speaker labels
5. **Click** "Finish Session" — transcript is finalised and sent to n8n
6. **Generate Summary** — click to get an AI-powered interview summary
7. **Ask Questions** — type follow-up questions and get RAG-powered answers
8. **Upload Audio** (optional) — upload a pre-recorded interview file for offline processing

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Microphone not working** | Check browser permissions. Chrome requires HTTPS in production. |
| **WebSocket connection failed** | Verify `VITE_BACKEND_URL` points to the running backend. Check CORS settings. |
| **No speaker labels** | AssemblyAI `u3-rt-pro` model supports diarization. Ensure two distinct speakers are present. |
| **Summary returns empty** | Verify n8n workflow is active. Check that the "Respond to Webhook" node is configured and the Webhook node's Respond is set to "Using Respond to Webhook Node". |
| **Q&A returns empty** | Same as above. Also verify Supabase has indexed turns for the transcript_id. |
| **JSON parse error** | n8n is returning an empty body. Ensure the Webhook trigger's "Respond" setting is "Using Respond to Webhook Node", not "Immediately". |
| **Audio upload rejected** | File must be an audio type (.wav, .mp3, .m4a, .ogg, .webm, .flac, .mp4) and under 100MB. |

---

## License

This project is for educational and research purposes.
