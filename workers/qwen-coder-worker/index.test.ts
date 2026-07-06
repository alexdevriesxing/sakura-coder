import { describe, expect, it, vi } from 'vitest';
import { handleQwenWorkerRequest, isQuotaLikeError, parseModelList } from './index';

const chatRequest = () => new Request('https://worker.test/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Help me code.' }],
    max_tokens: 128,
  }),
});

function queuedFetch(responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>): typeof fetch {
  const fn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('Unexpected fetch call');
    return new Response(typeof next.body === 'string' ? next.body : JSON.stringify(next.body), {
      status: next.status,
      headers: { 'Content-Type': 'application/json', ...(next.headers ?? {}) },
    });
  });
  return fn as unknown as typeof fetch;
}

function inspectingFetch(inspect: (payload: any) => void): typeof fetch {
  const fn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    inspect(JSON.parse(String(init?.body ?? '{}')));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return fn as unknown as typeof fetch;
}

describe('qwen-coder-worker waterfall', () => {
  it('parses configured model lists', () => {
    expect(parseModelList(' a, b ,,c ', ['fallback'])).toEqual(['a', 'b', 'c']);
    expect(parseModelList('', ['fallback'])).toEqual(['fallback']);
  });

  it('detects quota-like provider errors', () => {
    expect(isQuotaLikeError(429, '')).toBe(true);
    expect(isQuotaLikeError(400, 'AllocationQuota.FreeTierOnly')).toBe(true);
    expect(isQuotaLikeError(400, 'syntax error')).toBe(false);
  });

  it('uses OpenRouter free models first when one succeeds', async () => {
    const fetcher = queuedFetch([
      { status: 200, body: { choices: [{ message: { content: 'from openrouter' } }], usage: { total_tokens: 12 } } },
    ]);

    const response = await handleQwenWorkerRequest(chatRequest(), {
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/qwen3-coder:free',
    }, fetcher);

    const json = await response.json() as any;
    expect(response.status).toBe(200);
    expect(json._sakura.providerUsed).toBe('openrouter');
    expect(json._sakura.modelUsed).toBe('qwen/qwen3-coder:free');
    expect(response.headers.get('X-Sakura-Model-Used')).toBe('qwen/qwen3-coder:free');
  });

  it('skips exhausted OpenRouter free models and uses the next free model', async () => {
    const fetcher = queuedFetch([
      { status: 429, body: { error: 'daily quota exhausted' }, headers: { 'Retry-After': '60' } },
      { status: 200, body: { choices: [{ message: { content: 'from openrouter' } }] } },
    ]);

    const response = await handleQwenWorkerRequest(chatRequest(), {
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/qwen3-coder:free,minimax/minimax-m2.5:free',
    }, fetcher);

    const json = await response.json() as any;
    expect(response.status).toBe(200);
    expect(json._sakura.providerUsed).toBe('openrouter');
    expect(json._sakura.waterfallAttempts[0].status).toBe('quota-exhausted');
    expect(json._sakura.waterfallAttempts[0].retryAfter).toBe('60');
  });

  it('skips missing OpenRouter free models and falls back to Cloudflare', async () => {
    const fetcher = queuedFetch([
      { status: 404, body: { error: 'model not found' } },
    ]);

    const response = await handleQwenWorkerRequest(chatRequest(), {
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/missing:free',
      AI: {
        run: async () => ({ choices: [{ message: { content: 'from cloudflare' } }] }),
      },
      GATEWAY_ID: 'code-gen-gateway',
    }, fetcher);

    const json = await response.json() as any;
    expect(response.status).toBe(200);
    expect(json._sakura.providerUsed).toBe('cloudflare');
    expect(json._sakura.waterfallAttempts.some((attempt: any) => attempt.httpStatus === 404)).toBe(true);
  });

  it('fails closed when every free route is unavailable', async () => {
    const fetcher = queuedFetch([
      { status: 429, body: { error: 'quota exhausted' } },
      { status: 429, body: { error: 'rate limit' } },
    ]);

    const response = await handleQwenWorkerRequest(chatRequest(), {
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/qwen3-coder:free,minimax/minimax-m2.5:free',
    }, fetcher);

    const json = await response.json() as any;
    expect(response.status).toBe(503);
    expect(json._sakura.providerUsed).toBeNull();
    expect(json._sakura.quotaStatus).toBe('exhausted');
  });

  it('rejects requests from disallowed origins when an allowlist is configured', async () => {
    const request = new Request('https://worker.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
    });

    const response = await handleQwenWorkerRequest(request, {
      SAKURA_ALLOWED_ORIGINS: 'https://sakura.test',
    }, queuedFetch([]));

    expect(response.status).toBe(403);
  });

  it('requires the optional Sakura worker token when configured', async () => {
    const response = await handleQwenWorkerRequest(chatRequest(), {
      SAKURA_WORKER_AUTH_TOKEN: 'secret-token',
    }, queuedFetch([]));

    expect(response.status).toBe(401);
  });

  it('accepts configured origin and token while echoing a narrow CORS origin', async () => {
    const request = new Request('https://worker.test/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://sakura.test',
        'X-Sakura-Worker-Token': 'secret-token',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
    });

    const response = await handleQwenWorkerRequest(request, {
      SAKURA_ALLOWED_ORIGINS: 'https://sakura.test',
      SAKURA_WORKER_AUTH_TOKEN: 'secret-token',
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/qwen3-coder:free',
    }, queuedFetch([
      { status: 200, body: { choices: [{ message: { content: 'ok' } }] } },
    ]));

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://sakura.test');
  });

  it('caps requested output tokens before forwarding to providers', async () => {
    let forwarded: any = null;
    const request = new Request('https://worker.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 999_999,
        temperature: 99,
      }),
    });

    const response = await handleQwenWorkerRequest(request, {
      SAKURA_MAX_OUTPUT_TOKENS: '1024',
      OPENROUTER_API_KEY: 'or-key',
      OPENROUTER_FREE_MODELS: 'qwen/qwen3-coder:free',
    }, inspectingFetch((payload) => { forwarded = payload; }));

    expect(response.status).toBe(200);
    expect(forwarded.max_tokens).toBe(1024);
    expect(forwarded.temperature).toBe(2);
  });

  it('rejects oversized request bodies before provider calls', async () => {
    const fetcher = queuedFetch([]);
    const request = new Request('https://worker.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(200) }] }),
    });

    const response = await handleQwenWorkerRequest(request, {
      SAKURA_MAX_REQUEST_BYTES: '80',
    }, fetcher);

    expect(response.status).toBe(413);
    expect(vi.mocked(fetcher as any)).not.toHaveBeenCalled();
  });

  it('passes the configured Cloudflare AI Gateway id to Workers AI', async () => {
    const run = vi.fn(async () => ({ response: 'from cloudflare' }));
    const response = await handleQwenWorkerRequest(chatRequest(), {
      AI: { run },
      GATEWAY_ID: 'code-gen-gateway',
    }, queuedFetch([]));

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      '@cf/qwen/qwen3-30b-a3b-fp8',
      expect.any(Object),
      { gateway: { id: 'code-gen-gateway', skipCache: false } },
    );
  });
});
