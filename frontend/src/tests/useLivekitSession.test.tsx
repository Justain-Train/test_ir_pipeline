import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLivekitSession } from '@/hooks/useLivekitSession';
import { STATUS_MESSAGES } from '@/lib/constants';

const {
  fetchLivekitTokenMock,
  createLivekitRoomMock,
  connectLivekitRoomMock,
  enableMicrophoneMock,
  logCurrentParticipantsMock
} = vi.hoisted(() => ({
  fetchLivekitTokenMock: vi.fn(),
  createLivekitRoomMock: vi.fn(),
  connectLivekitRoomMock: vi.fn(),
  enableMicrophoneMock: vi.fn(),
  logCurrentParticipantsMock: vi.fn()
}));

vi.mock('@/services/livekitTokenService', () => ({
  fetchLivekitToken: fetchLivekitTokenMock
}));

vi.mock('@/services/livekitRoomService', () => ({
  createLivekitRoom: createLivekitRoomMock,
  connectLivekitRoom: connectLivekitRoomMock,
  enableMicrophone: enableMicrophoneMock,
  logCurrentParticipants: logCurrentParticipantsMock
}));

describe('useLivekitSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reaches live status after successful start flow', async () => {
    fetchLivekitTokenMock.mockResolvedValue({ token: 'token', url: 'ws://url' });
    createLivekitRoomMock.mockReturnValue({ disconnect: vi.fn() });
    connectLivekitRoomMock.mockResolvedValue(undefined);
    enableMicrophoneMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLivekitSession());

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.status).toBe(STATUS_MESSAGES.live);
    expect(result.current.isStarted).toBe(true);
    expect(logCurrentParticipantsMock).toHaveBeenCalledTimes(1);
  });
});