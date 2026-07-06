/**
 * Sakura Coder AI Worker
 *
 * Provider order:
 * 1. OpenRouter :free models
 * 2. Cloudflare Workers AI through AI Gateway
 *
 * Free-only policy: configured paid-capable routes are not used. If all free
 * routes are missing, rate-limited, or exhausted, the worker returns a fail-
 * closed 503 with waterfall metadata instead of silently switching to paid use.
 */

type ProviderName = 'openrouter' | 'cloudflare';
type AttemptStatus = 'skipped' | 'ok' | 'error' | 'quota-exhausted';
type Fetcher = typeof fetch;

interface ChatMessage {
  role: string;
  content: unknown;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  [key: string]: unknown;
}

export interface WaterfallAttempt {
  provider: ProviderName;
  model: string;
  status: AttemptStatus;
  httpStatus?: number;
  reason?: string;
  retryAfter?: string | null;
  usage?: unknown;
}

export interface SakuraModelMetadata {
  providerUsed: ProviderName | null;
  modelUsed: string | null;
  quotaStatus: 'ok' | 'degraded' | 'exhausted' | 'unknown';
  usage?: unknown;
  waterfallAttempts: WaterfallAttempt[];
}

interface Env {
  AI?: {
    run: (model: string, input: unknown, options?: unknown) => Promise<unknown>;
  };
  GATEWAY_ID?: string;
  SAKURA_ALLOWED_ORIGINS?: string;
  SAKURA_WORKER_AUTH_TOKEN?: string;
  SAKURA_MAX_REQUEST_BYTES?: string;
  SAKURA_MAX_OUTPUT_TOKENS?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_FREE_MODELS?: string;
}

const DEFAULT_OPENROUTER_FREE_MODELS = [
  'qwen/qwen3-coder:free',
  'minimax/minimax-m2.5:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
];

const CLOUDFLARE_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const DEFAULT_MAX_REQUEST_BYTES = 256_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
const MAX_MESSAGES = 80;
const MAX_MESSAGE_CHARS = 120_000;

const QUOTA_MARKERS = [
  'quota',
  'rate limit',
  'rate_limit',
  'too many requests',
  'exhausted',
  'free tier',
  'AllocationQuota.FreeTierOnly',
  'insufficient credits',
  'daily limit',
  'usage limit',
];

const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sakura-Worker-Token',
  'Vary': 'Origin',
};

function allowedOrigins(env: Env): string[] {
  return (env.SAKURA_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeadersForRequest(request: Request, env: Env): Record<string, string> {
  const origins = allowedOrigins(env);
  if (origins.length === 0) return defaultCorsHeaders;
  const origin = request.headers.get('Origin') ?? '';
  return {
    ...defaultCorsHeaders,
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
  };
}

function originIsAllowed(request: Request, env: Env): boolean {
  const origins = allowedOrigins(env);
  if (origins.length === 0) return true;
  const origin = request.headers.get('Origin');
  return Boolean(origin && origins.includes(origin));
}

function tokenIsAllowed(request: Request, env: Env): boolean {
  if (!env.SAKURA_WORKER_AUTH_TOKEN) return true;
  const bearer = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerToken = request.headers.get('X-Sakura-Worker-Token');
  return bearer === env.SAKURA_WORKER_AUTH_TOKEN || headerToken === env.SAKURA_WORKER_AUTH_TOKEN;
}

function accessPolicyError(request: Request, env: Env, corsHeaders: Record<string, string>): Response | null {
  if (!originIsAllowed(request, env)) {
    return jsonResponse({ error: 'Origin is not allowed for this Sakura worker.' }, { status: 403 }, corsHeaders);
  }
  if (!tokenIsAllowed(request, env)) {
    return jsonResponse({ error: 'Sakura worker authorization failed.' }, { status: 401 }, corsHeaders);
  }
  return null;
}

function numericEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function jsonResponse(payload: unknown, init: ResponseInit = {}, corsHeaders = defaultCorsHeaders): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export function parseModelList(value: string | undefined, fallback: string[]): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export function isQuotaLikeError(status: number | undefined, body: string): boolean {
  if (status === 402 || status === 408 || status === 409 || status === 425 || status === 429 || status === 503) {
    return true;
  }
  const lower = body.toLowerCase();
  return QUOTA_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

function isModelNotFound(status: number | undefined, body: string): boolean {
  if (status === 404) return true;
  const lower = body.toLowerCase();
  return lower.includes('model not found') || lower.includes('no endpoints found');
}

function compactReason(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 240) || 'No response body';
}

function buildProviderPayload(body: ChatRequestBody, model: string): Record<string, unknown> {
  const { messages, max_tokens = 8192, temperature = 0.7, stream = false, ...rest } = body;
  return {
    ...rest,
    model,
    messages,
    max_tokens,
    temperature,
    stream,
  };
}

async function parseAndValidateChatRequest(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<ChatRequestBody | Response> {
  const maxBytes = numericEnv(env.SAKURA_MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES);
  const raw = await request.text();
  if (raw.length > maxBytes) {
    return jsonResponse({ error: `Request body exceeds ${maxBytes} bytes.` }, { status: 413 }, corsHeaders);
  }

  let body: ChatRequestBody;
  try {
    body = JSON.parse(raw) as ChatRequestBody;
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, { status: 400 }, corsHeaders);
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonResponse({ error: 'messages array is required' }, { status: 400 }, corsHeaders);
  }
  if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return jsonResponse({ error: `messages must contain 1-${MAX_MESSAGES} items.` }, { status: 400 }, corsHeaders);
  }

  let totalMessageChars = 0;
  for (const message of body.messages) {
    if (!message || typeof message !== 'object') {
      return jsonResponse({ error: 'Each message must be an object.' }, { status: 400 }, corsHeaders);
    }
    if (!['system', 'user', 'assistant', 'tool'].includes(String(message.role))) {
      return jsonResponse({ error: `Unsupported message role: ${String(message.role)}` }, { status: 400 }, corsHeaders);
    }
    totalMessageChars += typeof message.content === 'string'
      ? message.content.length
      : JSON.stringify(message.content ?? '').length;
  }
  if (totalMessageChars > MAX_MESSAGE_CHARS) {
    return jsonResponse({ error: `Message content exceeds ${MAX_MESSAGE_CHARS} characters.` }, { status: 413 }, corsHeaders);
  }

  const maxOutputTokens = numericEnv(env.SAKURA_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS);
  const requestedTokens = Number(body.max_tokens ?? maxOutputTokens);
  body.max_tokens = Math.min(
    Number.isFinite(requestedTokens) && requestedTokens > 0 ? requestedTokens : maxOutputTokens,
    maxOutputTokens,
  );
  body.temperature = typeof body.temperature === 'number' && Number.isFinite(body.temperature)
    ? Math.max(0, Math.min(body.temperature, 2))
    : undefined;
  body.stream = Boolean(body.stream);
  return body;
}

function summarizeAttempts(attempts: WaterfallAttempt[]): string {
  return attempts
    .map((attempt) => {
      const status = attempt.httpStatus ? `${attempt.status}:${attempt.httpStatus}` : attempt.status;
      return `${attempt.provider}/${attempt.model}/${status}`;
    })
    .join('|')
    .slice(0, 1200);
}

function metadataHeaders(metadata: SakuraModelMetadata): Record<string, string> {
  return {
    'X-Sakura-Provider-Used': metadata.providerUsed ?? '',
    'X-Sakura-Model-Used': metadata.modelUsed ?? '',
    'X-Sakura-Quota-Status': metadata.quotaStatus,
    'X-Sakura-Waterfall-Attempts': summarizeAttempts(metadata.waterfallAttempts),
  };
}

function withMetadata(result: unknown, metadata: SakuraModelMetadata): unknown {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return { ...(result as Record<string, unknown>), _sakura: metadata };
  }
  return { result, _sakura: metadata };
}

function makeMetadata(input: {
  providerUsed: ProviderName | null;
  modelUsed: string | null;
  attempts: WaterfallAttempt[];
  usage?: unknown;
}): SakuraModelMetadata {
  const exhausted = input.attempts.length > 0 && input.attempts.every((attempt) => {
    return attempt.status === 'quota-exhausted' || attempt.status === 'skipped';
  });

  return {
    providerUsed: input.providerUsed,
    modelUsed: input.modelUsed,
    quotaStatus: input.providerUsed ? 'ok' : exhausted ? 'exhausted' : 'degraded',
    usage: input.usage,
    waterfallAttempts: input.attempts,
  };
}

async function tryOpenAiCompatibleProvider(input: {
  provider: ProviderName;
  endpoint: string;
  apiKey: string;
  model: string;
  body: ChatRequestBody;
  attempts: WaterfallAttempt[];
  fetcher: Fetcher;
  corsHeaders: Record<string, string>;
  extraHeaders?: Record<string, string>;
}): Promise<Response | null> {
  const { provider, endpoint, apiKey, model, body, attempts, fetcher, corsHeaders, extraHeaders } = input;
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(buildProviderPayload(body, model)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const attempt: WaterfallAttempt = {
      provider,
      model,
      status: isQuotaLikeError(response.status, errorBody) || isModelNotFound(response.status, errorBody)
        ? 'quota-exhausted'
        : 'error',
      httpStatus: response.status,
      retryAfter: response.headers.get('Retry-After'),
      reason: compactReason(errorBody),
    };
    attempts.push(attempt);
    return null;
  }

  const okAttempt: WaterfallAttempt = { provider, model, status: 'ok', httpStatus: response.status };

  if (body.stream) {
    attempts.push(okAttempt);
    const metadata = makeMetadata({ providerUsed: provider, modelUsed: model, attempts });
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...metadataHeaders(metadata),
      },
    });
  }

  const result = await response.json() as Record<string, unknown>;
  okAttempt.usage = result.usage;
  attempts.push(okAttempt);
  const metadata = makeMetadata({ providerUsed: provider, modelUsed: model, attempts, usage: result.usage });
  return jsonResponse(withMetadata(result, metadata), {
    headers: metadataHeaders(metadata),
  }, corsHeaders);
}

async function tryOpenRouter(body: ChatRequestBody, env: Env, attempts: WaterfallAttempt[], fetcher: Fetcher, corsHeaders: Record<string, string>): Promise<Response | null> {
  if (!env.OPENROUTER_API_KEY) {
    attempts.push({
      provider: 'openrouter',
      model: parseModelList(env.OPENROUTER_FREE_MODELS, DEFAULT_OPENROUTER_FREE_MODELS).join(','),
      status: 'skipped',
      reason: 'OPENROUTER_API_KEY is not configured.',
    });
    return null;
  }

  const models = parseModelList(env.OPENROUTER_FREE_MODELS, DEFAULT_OPENROUTER_FREE_MODELS)
    .filter((model) => model.endsWith(':free'));

  if (models.length === 0) {
    attempts.push({
      provider: 'openrouter',
      model: env.OPENROUTER_FREE_MODELS ?? '',
      status: 'skipped',
      reason: 'OPENROUTER_FREE_MODELS contains no :free models.',
    });
    return null;
  }

  for (const model of models) {
    const response = await tryOpenAiCompatibleProvider({
      provider: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
      model,
      body,
      attempts,
      fetcher,
      corsHeaders,
      extraHeaders: {
        'HTTP-Referer': 'https://sakura-coder.app',
        'X-Title': 'Sakura Coder',
      },
    });
    if (response) return response;
  }

  return null;
}

async function tryCloudflare(body: ChatRequestBody, env: Env, attempts: WaterfallAttempt[], corsHeaders: Record<string, string>): Promise<Response | null> {
  if (!env.AI?.run) {
    attempts.push({
      provider: 'cloudflare',
      model: CLOUDFLARE_MODEL,
      status: 'skipped',
      reason: 'Cloudflare AI binding is not configured.',
    });
    return null;
  }

  const { messages, max_tokens = 8192, temperature = 0.7, stream = false } = body;
  const gatewayOpts = env.GATEWAY_ID
    ? { gateway: { id: env.GATEWAY_ID, skipCache: false } }
    : undefined;

  try {
    const result = await env.AI.run(
      CLOUDFLARE_MODEL,
      { messages, max_tokens, temperature, stream },
      gatewayOpts,
    );

    attempts.push({ provider: 'cloudflare', model: CLOUDFLARE_MODEL, status: 'ok' });
    const metadata = makeMetadata({
      providerUsed: 'cloudflare',
      modelUsed: CLOUDFLARE_MODEL,
      attempts,
      usage: result && typeof result === 'object' ? (result as Record<string, unknown>).usage : undefined,
    });

    if (stream) {
      return new Response(result as ReadableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...metadataHeaders(metadata),
        },
      });
    }

    return jsonResponse(withMetadata(result, metadata), {
      headers: metadataHeaders(metadata),
    }, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    attempts.push({
      provider: 'cloudflare',
      model: CLOUDFLARE_MODEL,
      status: isQuotaLikeError(undefined, message) ? 'quota-exhausted' : 'error',
      reason: compactReason(message),
    });
    return null;
  }
}

function failClosedResponse(attempts: WaterfallAttempt[], corsHeaders: Record<string, string>): Response {
  const metadata = makeMetadata({ providerUsed: null, modelUsed: null, attempts });
  return jsonResponse({
    error: 'All configured free LLM routes are unavailable or quota-exhausted. Sakura stopped to avoid paid usage.',
    _sakura: metadata,
  }, {
    status: 503,
    headers: metadataHeaders(metadata),
  }, corsHeaders);
}

export async function handleQwenWorkerRequest(request: Request, env: Env, fetcher: Fetcher = fetch): Promise<Response> {
  const corsHeaders = corsHeadersForRequest(request, env);

  if (request.method === 'OPTIONS') {
    const policyError = accessPolicyError(request, env, corsHeaders);
    if (policyError) return policyError;
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const policyError = accessPolicyError(request, env, corsHeaders);
  if (policyError) return policyError;

  if (request.method === 'GET') {
    return jsonResponse({
      status: 'Sakura Qwen Worker OK',
      policy: 'free-only-fail-closed',
      providers: [
        {
          name: 'openrouter',
          configured: Boolean(env.OPENROUTER_API_KEY),
          models: parseModelList(env.OPENROUTER_FREE_MODELS, DEFAULT_OPENROUTER_FREE_MODELS).filter((model) => model.endsWith(':free')),
        },
        {
          name: 'cloudflare',
          configured: Boolean(env.AI?.run),
          models: [CLOUDFLARE_MODEL],
          gateway: env.GATEWAY_ID ?? null,
        },
      ],
    }, {}, corsHeaders);
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const parsed = await parseAndValidateChatRequest(request, env, corsHeaders);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  const attempts: WaterfallAttempt[] = [];

  const openRouter = await tryOpenRouter(body, env, attempts, fetcher, corsHeaders);
  if (openRouter) return openRouter;

  const cloudflare = await tryCloudflare(body, env, attempts, corsHeaders);
  if (cloudflare) return cloudflare;

  return failClosedResponse(attempts, corsHeaders);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleQwenWorkerRequest(request, env);
    } catch (error) {
      const corsHeaders = corsHeadersForRequest(request, env);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 },
        corsHeaders,
      );
    }
  },
};
