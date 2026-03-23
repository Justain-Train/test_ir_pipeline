import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { TranscriptionClient } from '../services/transcriptionClient';
import type { N8nTurnItem, N8nTurnWrapper } from '../types/n8nTurnPayload.types';

export interface SessionPatient {
  id: string;
  name: string;
  age: string;
}

/** Raw turn captured from the backend transcript_update events */
interface RawTurn {
  speaker: string;
  text: string;
  timestamp: string;
}

export type UseLiveTranscriptionResult = {
  // State
  transcript: string;
  isRecording: boolean;
  isConnected: boolean;
  sessionID: string | null;
  error: string | null;
  isFinished: boolean;
  /** Structured n8n-compatible turn array, populated after session finishes */
  n8nTurns: N8nTurnWrapper[];

  // Methods
  startSession: (patient: SessionPatient) => Promise<void>;
  finishSession: () => Promise<void>;
  resetSession: () => void;
};

const TARGET_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096; // Not used with AudioWorklet, but kept for reference
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'ws://localhost:8000/ws/session';
const BASE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: TARGET_SAMPLE_RATE,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function resampleTo16k(input: Float32Array, sourceSampleRate: number): Float32Array {
  if (sourceSampleRate === TARGET_SAMPLE_RATE) {
    return input;
  }

  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.min(input.length, Math.round((offsetResult + 1) * ratio));
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
      accum += input[i];
      count++;
    }

    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stopAudioPipeline(
  workletNodeRef: MutableRefObject<AudioWorkletNode | null>,
  sourceNodeRef: MutableRefObject<MediaStreamAudioSourceNode | null>,
  mediaStreamRef: MutableRefObject<MediaStream | null>,
  audioContextRef: MutableRefObject<AudioContext | null>
): Promise<void> {
  workletNodeRef.current?.disconnect();
  sourceNodeRef.current?.disconnect();
  mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  mediaStreamRef.current = null;

  if (audioContextRef.current) {
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    return ctx.close().catch(() => {
      // Ignore close errors during cleanup.
    });
  }

  return Promise.resolve();
}

// ============================================================================
// Role mapping helpers (mirrors offline pipeline)
// ============================================================================

const ROLE_MAP: Record<string, "CLINICIAN" | "PATIENT"> = {
  Clinician: "CLINICIAN",
  Patient: "PATIENT",
};

/**
 * Convert the accumulated raw turns into the n8n-compatible item array
 * that matches the offline pipeline format.
 */
function buildN8nTurns(
  transcriptId: string,
  turns: RawTurn[]
): N8nTurnWrapper[] {
  const createdAt = new Date().toISOString();

  return turns.map((turn, idx) => {
    const role: "CLINICIAN" | "PATIENT" | "UNKNOWN" =
      ROLE_MAP[turn.speaker] || "UNKNOWN";

    const item: N8nTurnItem = {
      transcript_id: transcriptId,
      created_at: createdAt,

      turn_id: `${transcriptId}_turn_${idx}`,
      turn_index: idx,

      speaker_label: turn.speaker,
      role,

      start_ms: null, // live stream doesn't provide ms-level timing
      end_ms: null,
      confidence: null,

      text: turn.text,

      combined_text: turn.text,
      patient_text: role === "PATIENT" ? turn.text : null,
      clinician_text: role === "CLINICIAN" ? turn.text : null,

      route_combined: true,
      route_patient: role === "PATIENT",
      route_clinician: role === "CLINICIAN",
    };

    return { json: item };
  });
}



export function useLiveTranscription(): UseLiveTranscriptionResult {
  // State
  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [sessionID, setSessionID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [n8nTurns, setN8nTurns] = useState<N8nTurnWrapper[]>([]);

  // Refs
  const clientRef = useRef<TranscriptionClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioChunkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Accumulates finalized turns during a live session */
  const rawTurnsRef = useRef<RawTurn[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioChunkTimeoutRef.current) {
        clearTimeout(audioChunkTimeoutRef.current);
      }
      stopAudioPipeline(
        workletNodeRef,
        sourceNodeRef,
        mediaStreamRef,
        audioContextRef
      );
      if (clientRef.current) {
        clientRef.current.close();
      }
    };
  }, []);

  /**
   * Initialize WebSocket client with callbacks
   */
  const initializeClient = (patient: SessionPatient): Promise<void> => {
    return new Promise((resolve, reject) => {
      clientRef.current = new TranscriptionClient(BACKEND_URL);

      // Handle connection open
      clientRef.current.onConnected = () => {
        setIsConnected(true);
        setError(null);
      };

      // Handle transcript updates
      clientRef.current.onTranscriptUpdate = (text: string, isFinal: boolean, speaker: string, timestamp: string) => {
        // Accumulate finalized turns for n8n payload
        if (isFinal) {
          rawTurnsRef.current.push({ speaker, text, timestamp });
        }

        setTranscript((prev) => {
          if (isFinal) {
            // Finalized turn with speaker label — permanent line
            const line = speaker
              ? `[${timestamp}] ${speaker}: "${text}"`
              : `[${timestamp}] "${text}"`;
            const lines = prev ? prev.split('\n') : [];
            // Remove trailing partial if present
            if (lines.length > 0 && lines[lines.length - 1].startsWith('> ')) {
              lines.pop();
            }
            lines.push(line);
            return lines.join('\n');
          }
          // Partial: replace the single in-progress line (no speaker shown)
          const partialLine = `> [${timestamp}] ${text}`;
          const lines = prev ? prev.split('\n') : [];
          if (lines.length > 0 && lines[lines.length - 1].startsWith('> ')) {
            lines[lines.length - 1] = partialLine;
          } else {
            lines.push(partialLine);
          }
          return lines.join('\n');
        });
      };

      // Handle session started
      clientRef.current.onSessionStarted = (id: string) => {
        setSessionID(id);
        setIsRecording(true);
        resolve();
      };

      // Handle session finished
      clientRef.current.onSessionFinished = (finalTranscript: string, n8nSent: boolean) => {
        setTranscript(finalTranscript);
        setIsRecording(false);
        setIsConnected(false);
        setIsFinished(true);

        // Build structured n8n turn array from accumulated turns
        const transcriptId = clientRef.current?.getSessionID() || 'unknown_transcript';
        const turns = buildN8nTurns(transcriptId, rawTurnsRef.current);
        setN8nTurns(turns);
        console.log('[n8n turns payload]', JSON.stringify(turns, null, 2));

        if (!n8nSent) {
          console.warn('Warning: n8n webhook may not have received the transcript');
        }
      };

      // Handle errors
      clientRef.current.onError = (message: string) => {
        setError(message);
        setIsRecording(false);
        reject(new Error(message));
      };

      // Handle disconnect
      clientRef.current.onDisconnected = () => {
        setIsConnected(false);
      };

      // Start the session with patient data
      clientRef.current
        .startSession({
          name: patient.name,
          age: parseInt(patient.age),
          patientID: patient.id,
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(`Failed to start session: ${message}`);
          reject(err);
        });
    });
  };

  /**
   * Request microphone access and start recording
   */
  // AudioWorkletProcessor code as a string (will be loaded dynamically)
  const workletProcessorCode = `
    class PCM16WorkletProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this._buffer = [];
        this._bufferSize = 8000; // 500ms of audio at 16kHz — full sentence chunks
      }
      process(inputs, outputs, parameters) {
        const input = inputs[0][0];
        if (input) {
          for (let i = 0; i < input.length; i++) {
            this._buffer.push(input[i]);
          }
          while (this._buffer.length >= this._bufferSize) {
            const chunk = this._buffer.slice(0, this._bufferSize);
            this._buffer = this._buffer.slice(this._bufferSize);
            // Convert Float32 [-1,1] to Int16 PCM LE
            const pcm16 = new Int16Array(chunk.length);
            for (let i = 0; i < chunk.length; i++) {
              let s = Math.max(-1, Math.min(1, chunk[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
          }
        }
        return true;
      }
    }
    registerProcessor('pcm16-worklet-processor', PCM16WorkletProcessor);
  `;

  const startAudioCapture = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: BASE_AUDIO_CONSTRAINTS })
        .then(async (stream) => {
          mediaStreamRef.current = stream;

          const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
          audioContextRef.current = audioContext;

          if (audioContext.state !== 'running') {
            await audioContext.resume();
          }

          if (audioContext.state !== 'running') {
            throw new Error('Audio context is suspended. Interact with the page and retry.');
          }

          // Dynamically add the AudioWorkletProcessor
          const blob = new Blob([workletProcessorCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await audioContext.audioWorklet.addModule(workletUrl);

          const sourceNode = audioContext.createMediaStreamSource(stream);
          sourceNodeRef.current = sourceNode;

          const workletNode = new AudioWorkletNode(audioContext, 'pcm16-worklet-processor');
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = (event) => {
            if (!clientRef.current || !clientRef.current.isSessionActive()) {
              return;
            }
            // event.data is an ArrayBuffer containing Int16 PCM LE — send as binary
            clientRef.current?.sendAudioBinary(event.data);
          };

          sourceNode.connect(workletNode);
          // Optionally connect to destination for monitoring, or skip for silence
          // workletNode.connect(audioContext.destination);

          resolve();
        })
        .catch((err) => {
          stopAudioPipeline(
            workletNodeRef,
            sourceNodeRef,
            mediaStreamRef,
            audioContextRef
          );

          const message =
            err.name === 'NotAllowedError'
              ? 'Microphone access denied. Please enable microphone permissions.'
              : `Microphone error: ${err.message}`;
          setError(message);
          reject(new Error(message));
        });
    });
  };

  /**
   * Start a new transcription session
   */
  const startSession = async (patient: SessionPatient): Promise<void> => {
    try {
      setError(null);
      setTranscript('');
      setIsFinished(false);
      setN8nTurns([]);
      rawTurnsRef.current = [];

      // Initialize WebSocket client
      await initializeClient(patient);

      // Start audio capture
      await startAudioCapture();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      setIsRecording(false);
      throw err;
    }
  };

  /**
   * Finish the transcription session
   */
  const finishSession = async (): Promise<void> => {
    try {
      // Stop audio graph and stream before closing session.
      await stopAudioPipeline(
        workletNodeRef,
        sourceNodeRef,
        mediaStreamRef,
        audioContextRef
      );

      // Send finish message to backend
      if (clientRef.current && clientRef.current.isSessionActive()) {
        await clientRef.current.finishSession();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finish session';
      setError(message);
      throw err;
    }
  };

  /**
   * Reset session state
   */
  const resetSession = (): void => {
    // Cleanup
    stopAudioPipeline(
      workletNodeRef,
      sourceNodeRef,
      mediaStreamRef,
      audioContextRef
    );
    if (clientRef.current) {
      clientRef.current.close();
    }
    if (audioChunkTimeoutRef.current) {
      clearTimeout(audioChunkTimeoutRef.current);
    }

    // Reset state
    setTranscript('');
    setIsRecording(false);
    setIsConnected(false);
    setSessionID(null);
    setError(null);
    setIsFinished(false);
    setN8nTurns([]);

    // Reset refs
    clientRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    sourceNodeRef.current = null;
    workletNodeRef.current = null;
    rawTurnsRef.current = [];
  };

  return {
    transcript,
    isRecording,
    isConnected,
    sessionID,
    error,
    isFinished,
    n8nTurns,
    startSession,
    finishSession,
    resetSession,
  };
}
