import { describe, expect, it, vi } from 'vitest';
import worker from './index';

function imageRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://flux.test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('flux-image-worker security and gateway posture', () => {
  it('reports gateway posture without exposing secrets', async () => {
    const response = await worker.fetch(new Request('https://flux.test/'), {
      AI: { run: vi.fn() },
      GATEWAY_ID: 'code-gen-gateway',
    });

    const json = await response.json() as any;
    expect(json.gatewayConfigured).toBe(true);
    expect(json.gatewayBypassedForMultipart).toBe(true);
    expect(JSON.stringify(json)).not.toContain('secret');
  });

  it('allows BYO origin/token policy for deployed workers', async () => {
    const response = await worker.fetch(imageRequest({ prompt: 'sakura' }, {
      Origin: 'https://evil.test',
    }), {
      AI: { run: vi.fn() },
      SAKURA_ALLOWED_ORIGINS: 'https://sakura.test',
      SAKURA_WORKER_AUTH_TOKEN: 'token',
    });

    expect(response.status).toBe(403);
  });

  it('rejects oversized prompts before calling Workers AI', async () => {
    const run = vi.fn();
    const response = await worker.fetch(imageRequest({ prompt: 'x'.repeat(500) }), {
      AI: { run },
      SAKURA_MAX_REQUEST_BYTES: '80',
    });

    expect(response.status).toBe(413);
    expect(run).not.toHaveBeenCalled();
  });

  it('calls Flux through the AI binding and returns a data URI', async () => {
    const run = vi.fn(async () => ({ image: 'ZmFrZQ==' }));
    const response = await worker.fetch(imageRequest({ prompt: 'pink IDE', num_steps: 2 }), {
      AI: { run },
    });

    const json = await response.json() as any;
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith('@cf/black-forest-labs/flux-2-dev', expect.objectContaining({
      multipart: expect.any(Object),
    }));
    expect(json.image).toBe('data:image/png;base64,ZmFrZQ==');
  });
});
