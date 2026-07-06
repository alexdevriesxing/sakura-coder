/**
 * Flux Image Worker — deploy to Cloudflare Workers
 *
 * wrangler.toml bindings required:
 *   [ai]
 *   binding = "AI"
 *
 * Optional AI Gateway:
 *   [vars]
 *   GATEWAY_ID = "code-gen-gateway"
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
      return new Response(JSON.stringify({
        status: 'Flux Image Worker OK',
        model: '@cf/black-forest-labs/flux-2-dev',
        gatewayConfigured: Boolean(env.GATEWAY_ID),
        gatewayBypassedForMultipart: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const parsed = await parseLimitedJson(request, env, corsHeaders);
      if (parsed instanceof Response) return parsed;
      const body = parsed as {
        prompt: string;
        negativePrompt?: string;
        num_steps?: number;
      };
      const { prompt, negativePrompt, num_steps = 4 } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // flux-2-dev requires multipart form data.
      // NOTE: AI Gateway does not support ReadableStream bodies, so we skip
      // the gateway for Flux and call the AI binding directly.
      const form = new FormData();
      form.append('prompt', prompt);
      if (negativePrompt) form.append('negative_prompt', negativePrompt);
      form.append('steps', String(num_steps));

      const formResponse = new Response(form);
      const result = await env.AI.run(
        '@cf/black-forest-labs/flux-2-dev',
        {
          multipart: {
            body: formResponse.body!,
            contentType: formResponse.headers.get('content-type')!,
          },
        },
        // No gateway opts — AI Gateway doesn't support ReadableStream yet
      ) as { image: string };

      if (!result?.image) {
        return new Response(JSON.stringify({ error: 'Model returned no image data' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        image: `data:image/png;base64,${result.image}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

interface Env {
  AI: any;
  GATEWAY_ID?: string;
  SAKURA_ALLOWED_ORIGINS?: string;
  SAKURA_WORKER_AUTH_TOKEN?: string;
  SAKURA_MAX_REQUEST_BYTES?: string;
}

const DEFAULT_MAX_REQUEST_BYTES = 64_000;

function allowedOrigins(env: Env): string[] {
  return (env.SAKURA_ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function corsHeadersForRequest(request: Request, env: Env): Record<string, string> {
  const origins = allowedOrigins(env);
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origins.length === 0 ? '*' : origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sakura-Worker-Token',
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
