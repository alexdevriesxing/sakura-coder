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
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response('Flux Image Worker OK', {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
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

      const gatewayOpts = env.GATEWAY_ID
        ? { gateway: { id: env.GATEWAY_ID, skipCache: false } }
        : undefined;

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
}
