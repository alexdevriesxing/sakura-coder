import type { AgentRequest, AgentResponse, GeneratedAsset, GeneratedAudio } from '../types/sakura';

const QWEN_WORKER_URL = import.meta.env.VITE_QWEN_WORKER_URL || 'https://qwen-coder-worker.alexdevriesxing.workers.dev/';
const FLUX_WORKER_URL = import.meta.env.VITE_FLUX_WORKER_URL || 'https://flux-image-worker.alexdevriesxing.workers.dev/';
const MINIMAX_MUSIC_WORKER_URL = import.meta.env.VITE_MINIMAX_MUSIC_WORKER_URL || 'https://minimax-music-worker.alexdevriesxing.workers.dev/';
const PROVIDER_MODE = (import.meta.env.VITE_AI_PROVIDER_MODE || 'mock') as 'mock' | 'live';

export interface ProviderHealth {
  qwen: 'unknown' | 'ok' | 'error';
  flux: 'unknown' | 'ok' | 'error';
  minimax: 'unknown' | 'ok' | 'error';
  details?: string;
}

export const providerConfig = {
  qwenUrl: QWEN_WORKER_URL,
  fluxUrl: FLUX_WORKER_URL,
  minimaxUrl: MINIMAX_MUSIC_WORKER_URL,
  mode: PROVIDER_MODE,
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Worker request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function checkProviderHealth(): Promise<ProviderHealth> {
  if (PROVIDER_MODE === 'mock') return { qwen: 'ok', flux: 'ok', minimax: 'ok', details: 'Mock provider mode enabled.' };

  const health: ProviderHealth = { qwen: 'unknown', flux: 'unknown', minimax: 'unknown' };
  try {
    await fetch(QWEN_WORKER_URL, { method: 'GET' });
    health.qwen = 'ok';
  } catch (error) {
    health.qwen = 'error';
    health.details = `Qwen health check failed: ${(error as Error).message}`;
  }

  try {
    await fetch(FLUX_WORKER_URL, { method: 'GET' });
    health.flux = 'ok';
  } catch (error) {
    health.flux = 'error';
    health.details = `${health.details || ''} Flux health check failed: ${(error as Error).message}`.trim();
  }

  try {
    await fetch(MINIMAX_MUSIC_WORKER_URL, { method: 'GET' });
    health.minimax = 'ok';
  } catch (error) {
    health.minimax = 'error';
    health.details = `${health.details || ''} Minimax health check failed: ${(error as Error).message}`.trim();
  }

  return health;
}

export async function callQwenAgent(request: AgentRequest): Promise<AgentResponse> {
  if (PROVIDER_MODE === 'mock') return mockAgentResponse(request);

  // Qwen Worker schema: { messages: [...], max_tokens?, temperature? } 
  // Returns: { response: string, usage: { prompt_tokens, completion_tokens, total_tokens } }
  const result = await postJson<{ response: string; usage: unknown }>(QWEN_WORKER_URL, {
    messages: [{ role: 'user', content: request.input }],
    max_tokens: 4096,
    temperature: 0.7,
  });

  return {
    kind: 'text',
    content: result.response,
    summary: 'Qwen response',
    riskLevel: 'low',
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

  // Flux Worker schema: { prompt, negativePrompt, num_steps? } 
  // Returns: { image: "data:image/png;base64,..." } (data URI)
  const result = await postJson<{ image: string }>(FLUX_WORKER_URL, {
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    num_steps: 4,
  });

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
    previewUrl: result.image, // data URI for display
  };
}

export async function callMinimaxMusicWorker(input: {
  prompt: string;
  negativePrompt: string;
  filename: string;
  audioType: string;
  duration?: number;
  loop?: boolean;
  bpm?: number;
  key?: string;
}): Promise<GeneratedAudio> {
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

  // Minimax Music Worker schema: { prompt, lyrics?, is_instrumental?, lyrics_optimizer?, format?: "mp3"|"wav", sample_rate? }
  // Returns: { audio: "data:audio/mpeg;base64,..." } (data URI)
  const result = await postJson<{ audio: string }>(MINIMAX_MUSIC_WORKER_URL, {
    prompt: input.prompt,
    is_instrumental: true,
    format: 'mp3',
    sample_rate: 32000,
  });

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
    previewUrl: result.audio, // data URI for playback
  };
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
