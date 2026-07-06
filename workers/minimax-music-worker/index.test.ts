import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

function musicRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://minimax.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('minimax-music-worker security and BYOK behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows the BYOK header in CORS preflight', async () => {
    const response = await worker.fetch(new Request('https://minimax.test/', {
      method: 'OPTIONS',
      headers: { Origin: 'https://sakura.test' },
    }), {
      AI: {},
      SAKURA_ALLOWED_ORIGINS: 'https://sakura.test',
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://sakura.test');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Minimax-Api-Key');
  });

  it('rejects oversized requests before calling Minimax', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(musicRequest({ prompt: 'x'.repeat(500) }), {
      AI: {},
      MINIMAX_API_KEY: 'env-key',
      SAKURA_MAX_REQUEST_BYTES: '80',
    });

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses client BYOK before env key and returns base64 audio', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer client-key');
      return new Response(JSON.stringify({
        data: { audio: '00ff' },
        base_resp: { status_code: 0, status_msg: 'ok' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(musicRequest({ prompt: 'lofi sakura' }, {
      'x-minimax-api-key': 'client-key',
    }), {
      AI: {},
      MINIMAX_API_KEY: 'env-key',
    });

    const json = await response.json() as any;
    expect(response.status).toBe(200);
    expect(json.audio).toMatch(/^data:audio\/mpeg;base64,/);
  });
});
