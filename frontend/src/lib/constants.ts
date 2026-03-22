import type { TokenRequestPayload } from '@/types/sessionPayload.types';

export const APP_NAME = 'medical-ir-frontend';
export const LIVEKIT_TOKEN_PATH = '/livekit/token';

export const DEFAULT_TOKEN_REQUEST: TokenRequestPayload = {
	room_name: 'test-room4',
	participant_name: 'Dr_Test_User',
	patient_id: 'patient_id_123'
};

export const STATUS_MESSAGES = {
	disconnected: 'Status: Disconnected',
	fetchingToken: 'Status: Fetching token...',
	microphoneError: 'Status: Microphone error - see console',
	live: 'Status: LIVE (Recording & Separating Speakers)',
	errorPrefix: 'Status: Error - '
} as const;
