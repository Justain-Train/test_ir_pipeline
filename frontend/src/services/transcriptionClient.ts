/**
 * WebSocket client for real-time transcription
 * Handles connection to FastAPI backend WebSocket endpoint
 */

interface PatientInfo {
  name: string;
  age: number;
  patientID: string;
}

interface TranscriptMessage {
  type: "transcript_update";
  text: string;
  speaker: string;
  timestamp: string;
  is_final: boolean;
}

interface SessionStartedMessage {
  type: "session_started";
  sessionID: string;
}

interface SessionFinishedMessage {
  type: "session_finished";
  sessionID: string;
  final_transcript: string;
  n8n_sent: boolean;
}

interface ErrorMessage {
  type: "error";
  message: string;
}

type ServerMessage = TranscriptMessage | SessionStartedMessage | SessionFinishedMessage | ErrorMessage;

export class TranscriptionClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private sessionID: string | null = null;
  private isConnected: boolean = false;

  // Callbacks
  onTranscriptUpdate: (text: string, isFinal: boolean, speaker: string, timestamp: string) => void = () => {};
  onSessionStarted: (sessionID: string) => void = () => {};
  onSessionFinished: (transcript: string, n8nSent: boolean) => void = () => {};
  onError: (message: string) => void = () => {};
  onConnected: () => void = () => {};
  onDisconnected: () => void = () => {};

  constructor(wsUrl: string = "ws://localhost:8000/ws/session") {
    this.wsUrl = wsUrl;
  }

  /**
   * Connect to WebSocket and start session
   */
  async startSession(patientInfo: PatientInfo): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.onConnected();

          // Send start session message
          this.ws!.send(
            JSON.stringify({
              type: "start_session",
              patient: patientInfo,
            })
          );
        };

        this.ws.onmessage = (event: MessageEvent) => {
          const message: ServerMessage = JSON.parse(event.data);

          if (message.type === "session_started") {
            this.sessionID = (message as SessionStartedMessage).sessionID;
            this.onSessionStarted(this.sessionID);
            resolve(this.sessionID);
          } else if (message.type === "transcript_update") {
            const tm = message as TranscriptMessage;
            this.onTranscriptUpdate(tm.text, tm.is_final, tm.speaker, tm.timestamp);
          } else if (message.type === "session_finished") {
            const fm = message as SessionFinishedMessage;
            this.onSessionFinished(fm.final_transcript, fm.n8n_sent);
          } else if (message.type === "error") {
            const em = message as ErrorMessage;
            this.onError(em.message);
            reject(new Error(em.message));
          }
        };

        this.ws.onerror = (event: Event) => {
          this.onError("WebSocket connection error");
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.onDisconnected();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send audio chunk as raw binary WebSocket frame (no base64/JSON overhead).
   */
  sendAudioBinary(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(audioData);
  }

  /**
   * Send audio chunk to backend (legacy JSON+base64 path, kept for compatibility)
   */
  sendAudioChunk(audioData: ArrayBuffer | string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError("WebSocket is not connected");
      return;
    }

    let data: string;

    if (audioData instanceof ArrayBuffer) {
      const bytes = new Uint8Array(audioData);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      data = btoa(binary);
    } else {
      data = audioData;
    }

    this.ws.send(
      JSON.stringify({
        type: "audio_chunk",
        data: data,
      })
    );
  }

  /**
   * Finish the session and send final transcript to n8n
   */
  async finishSession(): Promise<string> {
    const ws = this.ws;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    return new Promise((resolve, reject) => {
      const originalOnMessage = ws.onmessage;

      ws.onmessage = (event: MessageEvent) => {
        const message: ServerMessage = JSON.parse(event.data);

        if (message.type === "session_finished") {
          const fm = message as SessionFinishedMessage;
          this.onSessionFinished(fm.final_transcript, fm.n8n_sent);
          ws.close();
          resolve(fm.final_transcript);
        } else if (message.type === "error") {
          const em = message as ErrorMessage;
          reject(new Error(em.message));
        } else if (originalOnMessage) {
          // Keep handling other messages
          originalOnMessage.call(ws, event);
        }
      };

      // Send finish session message
      ws.send(
        JSON.stringify({
          type: "finish_session",
        })
      );
    });
  }

  /**
   * Check if connected
   */
  isSessionActive(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current session ID
   */
  getSessionID(): string | null {
    return this.sessionID;
  }

  /**
   * Close connection manually
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}
