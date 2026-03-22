export type TranscriptSpeakerId = 'S1' | 'S2' | string;

export type IncomingTranscriptPayload = {
  type: 'transcript' | string;
  text: string;
  speaker_id: TranscriptSpeakerId;
  timestamp?: string | number | null;
};

export type TranscriptItem = {
  id: string;
  timestamp?: string | number | null;
  speakerName: string;
  speakerClass: string;
  text: string;
};
