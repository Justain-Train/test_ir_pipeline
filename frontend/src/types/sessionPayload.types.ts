export type TokenRequestPayload = {
  room_name: string;
  participant_name: string;
  patient_id: string;
};

export type SessionCredentials = {
  token: string;
  url: string;
};
