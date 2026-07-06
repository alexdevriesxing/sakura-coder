import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { SAKURA_AGENT_TOOLS } from './agentTools';
import type { AgentRequest, AgentResponse, GeneratedAsset, GeneratedAudio, AudioGenerationRequest, LlmMetadata } from '../types/sakura';

const QWEN_WORKER_URL = import.meta.env.VITE_QWEN_WORKER_URL || 'https://qwen-coder-worker.alexdevriesxing.workers.dev/';
const FLUX_WORKER_URL = import.meta.env.VITE_FLUX_WORKER_URL || 'https://flux-image-worker.alexdevriesxing.workers.dev/';
const MINIMAX_MUSIC_WORKER_URL = import.meta.env.VITE_MINIMAX_MUSIC_WORKER_URL || 'https://minimax-music-worker.alexdevriesxing.workers.dev/';
const PROVIDER_MODE = (import.meta.env.VITE_AI_PROVIDER_MODE || 'mock') as 'mock' | 'live';

export interface ProviderHealth {
  qwen: 'unknown' | 'ok' | 'error';
  flux: 'unknown' | 'ok' | 'error';
  minimax: 'unknown' | 'ok' | 'error';
  llm: 'unknown' | 'ok' | 'error';
  latency: {
    qwen: number;
    flux: number;
    minimax: number;
    llm: number;
  };
  modelUsed?: string | null;
  providerUsed?: string | null;
  quotaStatus?: string;
  waterfallAttempts?: unknown[];
  details?: string;
}

let lastLlmMetadata: LlmMetadata | null = null;

export function getLastLlmMetadata(): LlmMetadata | null {
  return lastLlmMetadata;
}

function setLastLlmMetadata(metadata: LlmMetadata | null) {
  lastLlmMetadata = metadata;
}

/**
 * Custom fetch wrapper that uses Tauri's native HTTP plugin to bypass CORS issues.
 * Note: tauri-apps/plugin-http does not support a connectTimeout option — a
 * manual AbortController-based timeout is used instead.
 */
async function fetchWithTimeout(url: string, options: any, timeout = 30000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await tauriFetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    console.error(`[aiClient] Native fetch error for ${url}:`, error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkProviderHealth(): Promise<ProviderHealth> {
  if (PROVIDER_MODE === 'mock') return { qwen: 'ok', flux: 'ok', minimax: 'ok', llm: 'ok', latency: { qwen: 0, flux: 0, minimax: 0, llm: 0 }, details: 'Mock provider mode enabled.' };

  const health: ProviderHealth = { 
    qwen: 'unknown', 
    flux: 'unknown', 
    minimax: 'unknown', 
    llm: 'unknown',
    latency: { qwen: 0, flux: 0, minimax: 0, llm: 0 } 
  };
  
  const check = async (url: string, key: keyof ProviderHealth['latency']) => {
    const start = performance.now();
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' });
      if (res.ok) {
        if (key === 'llm') health.llm = 'ok';
        else health[key] = 'ok';
        health.latency[key] = Math.round(performance.now() - start);
        if (key === 'llm') {
          const data = await res.json().catch(() => null) as any;
          const firstConfigured = data?.providers?.find?.((provider: any) => provider.configured);
          health.providerUsed = firstConfigured?.name ?? null;
          health.modelUsed = firstConfigured?.models?.[0] ?? null;
          health.quotaStatus = data?.policy ?? 'unknown';
        }
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (error) {
      if (key === 'llm') health.llm = 'error';
      else health[key] = 'error';
      health.details = `${health.details || ''} ${key.toUpperCase()} check failed: ${(error as Error).message}`.trim();
    }
  };

  await Promise.all([
    check(QWEN_WORKER_URL, 'qwen'),
    check(QWEN_WORKER_URL, 'llm'),
    check(FLUX_WORKER_URL, 'flux'),
    check(MINIMAX_MUSIC_WORKER_URL, 'minimax')
  ]);

  return health;
}

async function postJsonWithRetry<T>(
  url: string,
  payload: unknown,
  extraHeaders?: Record<string, string>,
  retries = 2,
  timeoutMs = 60_000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`[aiClient] Sending request to ${url} (Attempt ${i + 1}/${retries + 1})`);
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(payload),
      }, timeoutMs);

      if (!response.ok) {
        const body = await response.text();
        console.error(`[aiClient] Worker error (${response.status}):`, body);
        throw new Error(`Worker request failed (${response.status}): ${body}`);
      }
      
      const data = await response.json() as T;
      console.log(`[aiClient] Request successful`);
      return data;
    } catch (error) {
      lastError = error as Error;
      console.error(`[aiClient] Request failed:`, lastError.message);
      
      if (i < retries) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error('Request failed after retries');
}

export const providerConfig = {
  qwenUrl: QWEN_WORKER_URL,
  fluxUrl: FLUX_WORKER_URL,
  minimaxUrl: MINIMAX_MUSIC_WORKER_URL,
  mode: PROVIDER_MODE,
};

/**
 * Normalize the Qwen worker response.
 *
 * Cloudflare Workers AI now returns an OpenAI-compatible chat completion object:
 *   { choices: [{ message: { content: string | null, reasoning_content: string } }] }
 *
 * The legacy shape was: { response: string }
 *
 * Qwen3 models run in "thinking" mode by default — content is null until reasoning
 * completes. We disable thinking in the worker payload, but fall back to
 * reasoning_content here in case it slips through.
 */
function extractQwenText(raw: unknown): string {
  const r = raw as any;
  // OpenAI-compatible shape (current Cloudflare AI)
  if (r?.choices?.[0]?.message) {
    const msg = r.choices[0].message;
    return msg.content ?? msg.reasoning_content ?? '';
  }
  // Legacy shape
  if (typeof r?.response === 'string') return r.response;
  return '';
}

export interface QwenToolMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export interface QwenToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface QwenToolTurn {
  content: string;
  toolCalls: QwenToolCall[];
  metadata: LlmMetadata | null;
}

function extractQwenToolCalls(raw: unknown): QwenToolCall[] {
  const calls = (raw as any)?.choices?.[0]?.message?.tool_calls;
  if (!Array.isArray(calls)) return [];
  return calls
    .map((call: any, index: number) => {
      const name = call?.function?.name;
      if (typeof name !== 'string' || !name) return null;
      let args: Record<string, unknown> = {};
      const rawArgs = call?.function?.arguments;
      if (typeof rawArgs === 'string' && rawArgs.trim()) {
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = { rawArguments: rawArgs };
        }
      } else if (rawArgs && typeof rawArgs === 'object') {
        args = rawArgs;
      }
      return {
        id: typeof call?.id === 'string' ? call.id : `tool-${index}`,
        name,
        args,
      };
    })
    .filter(Boolean) as QwenToolCall[];
}

function metadataFromRaw(raw: unknown): LlmMetadata | null {
  const metadata = (raw as any)?._sakura;
  if (!metadata || typeof metadata !== 'object') return null;
  return {
    providerUsed: metadata.providerUsed ?? null,
    modelUsed: metadata.modelUsed ?? null,
    quotaStatus: metadata.quotaStatus ?? 'unknown',
    usage: metadata.usage,
    waterfallAttempts: Array.isArray(metadata.waterfallAttempts) ? metadata.waterfallAttempts : [],
  };
}

function headerValue(response: any, name: string): string | null {
  return response.headers?.get?.(name) ?? response.headers?.[name] ?? null;
}

function metadataFromHeaders(response: any): LlmMetadata | null {
  const modelUsed = headerValue(response, 'X-Sakura-Model-Used') || headerValue(response, 'x-sakura-model-used');
  const providerUsed = headerValue(response, 'X-Sakura-Provider-Used') || headerValue(response, 'x-sakura-provider-used');
  const quotaStatus = headerValue(response, 'X-Sakura-Quota-Status') || headerValue(response, 'x-sakura-quota-status');
  const attemptsSummary = headerValue(response, 'X-Sakura-Waterfall-Attempts') || headerValue(response, 'x-sakura-waterfall-attempts');
  if (!modelUsed && !providerUsed && !attemptsSummary) return null;
  return {
    providerUsed: providerUsed || null,
    modelUsed: modelUsed || null,
    quotaStatus: quotaStatus || 'unknown',
    waterfallAttempts: attemptsSummary
      ? attemptsSummary.split('|').filter(Boolean).map((item) => ({ provider: item, model: '', status: 'unknown' }))
      : [],
  };
}

export async function callQwenAgent(request: AgentRequest): Promise<AgentResponse> {
  if (PROVIDER_MODE === 'mock') return mockAgentResponse(request);

  const raw = await postJsonWithRetry<unknown>(QWEN_WORKER_URL, {
    messages: [
      { role: 'system', content: request.systemPrompt || 'You are Sakura, a helpful AI assistant.' },
      { role: 'user', content: request.input }
    ],
    max_tokens: 8192,  // High enough for reasoning + response to both complete
    temperature: 0.7,
    tools: SAKURA_AGENT_TOOLS,
  }, undefined, 1, 90_000);

  setLastLlmMetadata(metadataFromRaw(raw));
  const text = extractQwenText(raw);
  if (!text) {
    console.error('[aiClient] Qwen returned empty content. Raw response:', JSON.stringify(raw));
    throw new Error('Qwen returned an empty response. Check worker logs.');
  }

  return {
    kind: 'text',
    content: text,
    summary: 'Qwen response',
    riskLevel: 'low',
    metadata: { llm: getLastLlmMetadata() },
  };
}

export async function callQwenToolTurn(messages: QwenToolMessage[]): Promise<QwenToolTurn> {
  if (PROVIDER_MODE === 'mock') {
    setLastLlmMetadata({
      providerUsed: 'mock',
      modelUsed: 'mock-sakura-agent',
      quotaStatus: 'ok',
      waterfallAttempts: [{ provider: 'mock', model: 'mock-sakura-agent', status: 'ok' }],
    });
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    return {
      content: `Sakura mock agent completed the local tool loop. Request: ${String(lastUser).slice(0, 500)}`,
      toolCalls: [],
      metadata: getLastLlmMetadata(),
    };
  }

  const raw = await postJsonWithRetry<unknown>(QWEN_WORKER_URL, {
    messages,
    max_tokens: 8192,
    temperature: 0.35,
    tools: SAKURA_AGENT_TOOLS,
    tool_choice: 'auto',
  }, undefined, 1, 90_000);

  const metadata = metadataFromRaw(raw);
  setLastLlmMetadata(metadata);
  return {
    content: extractQwenText(raw),
    toolCalls: extractQwenToolCalls(raw),
    metadata,
  };
}

export async function callFluxImageWorker(input: {
  prompt: string;
  negativePrompt: string;
  filename: string;
  assetType: string;
  width?: number;
  height?: number;
}): Promise<GeneratedAsset> {
  if (PROVIDER_MODE === 'mock') {
    return {
      id: crypto.randomUUID(),
      filename: input.filename,
      relativePath: `assets/generated/${input.filename}`,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      assetType: input.assetType,
      model: 'mock-flux',
      sourceWorker: FLUX_WORKER_URL,
      createdAt: new Date().toISOString(),
      status: 'prompted',
      previewUrl: undefined,
    };
  }

  const result = await postJsonWithRetry<{ image: string }>(FLUX_WORKER_URL, {
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    num_steps: 4,
  }, undefined, 0, 120_000);

  return {
    id: crypto.randomUUID(),
    filename: input.filename,
    relativePath: `assets/generated/${input.filename}`,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    assetType: input.assetType,
    model: 'flux-2-dev',
    sourceWorker: FLUX_WORKER_URL,
    createdAt: new Date().toISOString(),
    status: 'generated',
    previewUrl: result.image,
  };
}

export async function callMinimaxMusicWorker(input: AudioGenerationRequest, minimaxApiKey?: string): Promise<GeneratedAudio> {
  if (PROVIDER_MODE === 'mock') {
    return {
      id: crypto.randomUUID(),
      filename: input.filename,
      relativePath: `assets/generated/audio/${input.filename}`,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      audioType: input.audioType,
      provider: MINIMAX_MUSIC_WORKER_URL,
      createdAt: new Date().toISOString(),
      status: 'prompted',
      durationSeconds: input.duration,
      loop: input.loop ?? false,
      bpm: input.bpm,
      key: input.key,
      previewUrl: undefined,
    };
  }

  const result = await postJsonWithRetry<{ audio: string }>(MINIMAX_MUSIC_WORKER_URL, {
    prompt: input.referenceUrl ? `${input.prompt}. Style Reference: ${input.referenceUrl}` : input.prompt,
    lyrics: input.lyrics,
    is_instrumental: input.isInstrumental ?? true,
    format: 'mp3',
    sample_rate: 32000,
    duration: input.duration,
  }, minimaxApiKey ? { 'x-minimax-api-key': minimaxApiKey } : undefined, 0, 180_000);

  return {
    id: crypto.randomUUID(),
    filename: input.filename,
    relativePath: `assets/generated/audio/${input.filename}`,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    audioType: input.audioType,
    provider: MINIMAX_MUSIC_WORKER_URL,
    createdAt: new Date().toISOString(),
    status: 'generated',
    durationSeconds: input.duration,
    loop: input.loop ?? false,
    bpm: input.bpm,
    key: input.key,
    previewUrl: result.audio,
  };
}

/**
 * Parse SSE lines from a text chunk and extract content tokens.
 * Exported for unit testing.
 */
export function parseSseLines(text: string): { tokens: string[]; done: boolean } {
  const tokens: string[] = [];
  let done = false;
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') {
      done = true;
      break;
    }
    try {
      const parsed = JSON.parse(data);
      const content = parsed?.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        tokens.push(content);
      }
    } catch {
      // Ignore malformed SSE lines
    }
  }
  return { tokens, done };
}

/**
 * Streaming variant. Returns an async generator that yields string tokens.
 * Sends { stream: true } in the POST body.
 * Falls back to non-streaming if the response Content-Type is application/json.
 */
export async function* streamQwenAgent(request: AgentRequest): AsyncGenerator<string, void, unknown> {
  if (PROVIDER_MODE === 'mock') {
    setLastLlmMetadata({
      providerUsed: 'mock',
      modelUsed: 'mock-sakura-agent',
      quotaStatus: 'ok',
      waterfallAttempts: [{ provider: 'mock', model: 'mock-sakura-agent', status: 'ok' }],
    });
    yield* mockStreamQwenAgent(request);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let response: any;
  try {
    response = await tauriFetch(QWEN_WORKER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: request.systemPrompt || 'You are Sakura, a helpful AI assistant.' },
          { role: 'user', content: request.input },
        ],
        max_tokens: 8192,
        temperature: 0.7,
        stream: true,
        tools: SAKURA_AGENT_TOOLS,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }

  if (!response.ok) {
    clearTimeout(timer);
    const raw = await response.text();
    throw new Error(`Worker request failed (${response.status}): ${raw}`);
  }

  // Fall back to non-streaming if worker returns JSON
  const contentType: string = response.headers?.get?.('content-type') ?? response.headers?.['content-type'] ?? '';
  setLastLlmMetadata(metadataFromHeaders(response));
  if (!contentType.includes('text/event-stream')) {
    clearTimeout(timer);
    const raw = await response.json();
    setLastLlmMetadata(metadataFromRaw(raw) ?? metadataFromHeaders(response));
    const text = extractQwenText(raw);
    if (text) yield text;
    return;
  }

  // Stream SSE body
  const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (double newline separated)
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const { tokens, done: streamDone } = parseSseLines(part + '\n\n');
        for (const token of tokens) yield token;
        if (streamDone) return;
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const { tokens } = parseSseLines(buffer);
      for (const token of tokens) yield token;
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

/**
 * Mock streaming variant for PROVIDER_MODE === 'mock'.
 * Splits the mock response into words and yields them with a 30ms delay.
 */
export async function* mockStreamQwenAgent(request: AgentRequest): AsyncGenerator<string, void, unknown> {
  const response = mockAgentResponse(request);
  const words = response.content.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield (i === 0 ? '' : ' ') + words[i];
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

function mockAgentResponse(request: AgentRequest): AgentResponse {
  if (request.mode === 'context' || request.mode === 'docs' || request.mode === 'plan') {
    return {
      kind: 'plan',
      riskLevel: 'low',
      summary: 'Mock plan generated. Switch VITE_AI_PROVIDER_MODE=live when Worker schemas are verified.',
      content: [
        '# Sakura Coder Generated Plan',
        '',
        `Goal: ${request.goal || 'Not provided'}`,
        '',
        '## Assumptions',
        '- The user wants a local-first desktop IDE.',
        '- File changes should use checkpoint + diff approval.',
        '- Qwen Worker and Flux Worker are external providers.',
        '',
        '## Next Steps',
        '1. Confirm project template.',
        '2. Generate/update docs in /docs.',
        '3. Produce a small implementation patch.',
        '4. Validate with typecheck/tests.',
      ].join('\n'),
    };
  }

  return {
    kind: 'text',
    riskLevel: 'low',
    summary: 'Mock assistant response.',
    content: `Sakura mock response in ${request.mode} mode. Input received: ${request.input.slice(0, 500)}`,
  };
}
