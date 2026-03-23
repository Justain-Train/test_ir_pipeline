/**
 * Represents a single turn item formatted for n8n ingestion.
 * Mirrors the offline pipeline's per-utterance output so that the
 * same n8n workflow can loop over both live and offline transcripts.
 */
export interface N8nTurnItem {
  transcript_id: string;
  created_at: string;

  turn_id: string;
  turn_index: number;

  speaker_label: string;
  role: "CLINICIAN" | "PATIENT" | "UNKNOWN";

  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;

  text: string;

  combined_text: string;
  patient_text: string | null;
  clinician_text: string | null;

  route_combined: boolean;
  route_patient: boolean;
  route_clinician: boolean;
}

export interface N8nTurnWrapper {
  json: N8nTurnItem;
}
