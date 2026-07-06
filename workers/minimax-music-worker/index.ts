/**
 * Minimax Music Worker — BYOK via Minimax direct API
 *
 * wrangler.toml bindings required:
 *   [ai]
 *   binding = "AI"
 *
 * Secrets required (set via: wrangler secret put MINIMAX_API_KEY):
 *   MINIMAX_API_KEY — your API key from https://platform.minimax.io
 *
 * Model used: music-2.6-free (available to all API key holders, no extra billing)
 * Upgrade to music-2.6 for higher RPM and paid plan features.
 *
 * API docs: https://platform.minimax.io/docs/api-reference/music-generation
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = corsHeadersForRequest(request, env);

    if (request.method === 'OPTIONS') {
      const policyError = accessPolicyError(request, env, corsHeaders);
      if (policyError) return policyError;
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const policyError = accessPolicyError(request, env, corsHeaders);
    if (policyError) return policyError;

    if (request.method === 'GET') {
      const hasKey = !!env.MINIMAX_API_KEY;
      return new Response(
        JSON.stringify({
          status: 'Minimax Music Worker OK',
          byok: hasKey,
          model: hasKey ? 'music-2.6-free' : 'not configured',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Require BYOK key — check header first (client-provided), then env secret
    const apiKey = request.headers.get('x-minimax-api-key') || env.MINIMAX_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Minimax API key not configured. Add your key in Sakura Coder Settings → AI Keys.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    try {
      const parsed = await parseLimitedJson(request, env, corsHeaders);
      if (parsed instanceof Response) return parsed;
      const body = parsed as {
        prompt: string;
        lyrics?: string;
        is_instrumental?: boolean;
        lyrics_optimizer?: boolean;
        format?: 'mp3' | 'wav';
        sample_rate?: number;
      };

      const {
        prompt,
        lyrics,
        is_instrumental = true,
        lyrics_optimizer = false,
        format = 'mp3',
        sample_rate = 44100,
      } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build Minimax API payload
      // music-2.6-free: free tier, available to all API key holders
      const minimaxPayload: Record<string, unknown> = {
        model: 'music-2.6-free',
        prompt,
        is_instrumental,
        lyrics_optimizer,
        output_format: 'hex',
        audio_setting: {
          sample_rate,
          bitrate: 256000,
          format,
        },
      };

      // Only include lyrics when not instrumental
      if (!is_instrumental && lyrics) {
        minimaxPayload.lyrics = lyrics;
      }

      const minimaxResp = await fetch('https://api.minimax.io/v1/music_generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(minimaxPayload),
      });

      if (!minimaxResp.ok) {
        const errText = await minimaxResp.text();
        return new Response(
          JSON.stringify({ error: `Minimax API error (${minimaxResp.status}): ${errText}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const result = await minimaxResp.json() as {
        data?: { audio?: string; status?: number };
        base_resp?: { status_code: number; status_msg: string };
      };

      if (result.base_resp?.status_code !== 0) {
        return new Response(
          JSON.stringify({ error: `Minimax error: ${result.base_resp?.status_msg}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const hexAudio = result.data?.audio;
      if (!hexAudio) {
        return new Response(
          JSON.stringify({ error: 'Minimax returned no audio data' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Convert hex → base64 for the client (matches existing aiClient.ts expectations)
      const bytes = hexToUint8Array(hexAudio);
      const base64 = uint8ArrayToBase64(bytes);
      const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';

      return new Response(
        JSON.stringify({ audio: `data:${mimeType};base64,${base64}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  },
};

/** Convert hex string to Uint8Array */
function hexToUint8Array(hex: string): Uint8Array {
  const len = hex.length / 2;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/** Convert Uint8Array to base64 string (Workers-compatible) */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface Env {
  AI: any;
  MINIMAX_API_KEY?: string;
  SAKURA_ALLOWED_ORIGINS?: string;
  SAKURA_WORKER_AUTH_TOKEN?: string;
  SAKURA_MAX_REQUEST_BYTES?: string;
}

const DEFAULT_MAX_REQUEST_BYTES = 96_000;

function allowedOrigins(env: Env): string[] {
  return (env.SAKURA_ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function corsHeadersForRequest(request: Request, env: Env): Record<string, string> {
  const origins = allowedOrigins(env);
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origins.length === 0 ? '*' : origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sakura-Worker-Token, X-Minimax-Api-Key',
    'Vary': 'Origin',
  };
}

function accessPolicyError(request: Request, env: Env, corsHeaders: Record<string, string>): Response | null {
  const origins = allowedOrigins(env);
  const origin = request.headers.get('Origin');
  if (origins.length > 0 && (!origin || !origins.includes(origin))) {
    return new Response(JSON.stringify({ error: 'Origin is not allowed for this Sakura worker.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (env.SAKURA_WORKER_AUTH_TOKEN) {
    const bearer = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const headerToken = request.headers.get('X-Sakura-Worker-Token');
    if (bearer !== env.SAKURA_WORKER_AUTH_TOKEN && headerToken !== env.SAKURA_WORKER_AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Sakura worker authorization failed.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  return null;
}

async function parseLimitedJson(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<unknown | Response> {
  const maxBytes = Number(env.SAKURA_MAX_REQUEST_BYTES ?? DEFAULT_MAX_REQUEST_BYTES);
  const raw = await request.text();
  if (raw.length > maxBytes) {
    return new Response(JSON.stringify({ error: `Request body exceeds ${maxBytes} bytes.` }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  try {
    return JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'Request body must be valid JSON.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
