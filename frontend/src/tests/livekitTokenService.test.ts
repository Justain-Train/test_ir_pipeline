import { describe, expect, it, vi } from 'vitest';
import { fetchLivekitToken } from '@/services/livekitTokenService';
import { DEFAULT_TOKEN_REQUEST, LIVEKIT_TOKEN_PATH } from '@/lib/constants';
import { API_BASE_URL } from '@/lib/env';

describe('fetchLivekitToken', () => {
  it('posts request payload and returns credentials', async () => {
    const mockJson = vi.fn().mockResolvedValue({ token: 'abc', url: 'ws://example' });
    const fetchMock = vi.fn().mockResolvedValue({
      json: mockJson
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLivekitToken(DEFAULT_TOKEN_REQUEST);

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}${LIVEKIT_TOKEN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_TOKEN_REQUEST)
    });
    expect(result).toEqual({ token: 'abc', url: 'ws://example' });

    vi.unstubAllGlobals();
  });
});
