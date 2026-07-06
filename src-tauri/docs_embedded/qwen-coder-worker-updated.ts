/**
 * Sakura Coder AI Worker — powered by Kimi K2.6 via OpenRouter
 *
 * wrangler.toml bindings required:
 *   [ai]
 *   binding = "AI"  (kept for fallback)
 *
 * Secrets required (set via: wrangler secret put OPENROUTER_API_KEY):
 *   OPENROUTER_API_KEY — free key from https://openrouter.ai/keys
 *
 * Model: qwen/qwen3-coder:free
 *   - Free tier, no credits needed
 *   - 262k context window, purpose-built for code generation
 *   - Qwen's dedicated coding model — better than qwen3-30b-a3b for code tasks
 *
 * Falls back to Cloudflare Workers AI (Qwen3) if OPENROUTER_API_KEY is not set.
 *
 * API: OpenAI-compatible chat completions
 * Docs: https://openrouter.ai/docs/quickstart
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
      const model = env.OPENROUTER_API_KEY
        ? 'qwen/qwen3-coder:free → minimax/minimax-m2.5:free → openai/gpt-oss-120b:free → ... (OpenRouter waterfall)'
        : '@cf/qwen/qwen3-30b-a3b-fp8 (Cloudflare AI fallback)';
      return new Response(
        JSON.stringify({ status: 'Qwen Coder Worker OK', model }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
        stream?: boolean;
      };

      const { messages, max_tokens = 8192, temperature = 0.7, stream = false } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages array is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // --- OpenRouter path — waterfall through free models by coding strength ---
      if (env.OPENROUTER_API_KEY) {
        const FREE_MODEL_WATERFALL = [
          'qwen/qwen3-coder:free',           // 1. Dedicated coder, 262k ctx
          'minimax/minimax-m2.5:free',        // 2. Strong general + code, 196k ctx
          'openai/gpt-oss-120b:free',         // 3. OpenAI open-weight 120B
          'nvidia/nemotron-3-super-120b-a12b:free', // 4. NVIDIA 120B, 262k ctx
          'meta-llama/llama-3.3-70b-instruct:free', // 5. Llama 70B
          'google/gemma-4-31b-it:free',       // 6. Last resort, 262k ctx
        ];

        for (const model of FREE_MODEL_WATERFALL) {
          const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://sakura-coder.app',
              'X-Title': 'Sakura Coder',
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens,
              temperature,
              stream,
            }),
          });

          // On rate limit or upstream error, try next model in waterfall
          if (orResp.status === 429 || orResp.status === 503) continue;

          if (!orResp.ok) {
            const errText = await orResp.text();
            // If it's a 404 (model not found), skip to next
            if (orResp.status === 404) continue;
            return new Response(
              JSON.stringify({ error: `OpenRouter error (${orResp.status}): ${errText}` }),
              { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }

          if (stream) {
            return new Response(orResp.body, {
              headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Model-Used': model,
              },
            });
          }

          const result = await orResp.json() as any;
          // Inject which model actually served the request
          result._sakura_model_used = model;
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // All OpenRouter free models exhausted — fall through to Cloudflare AI
      }

      // --- Cloudflare Workers AI fallback (Qwen3) ---
      const gatewayOpts = env.GATEWAY_ID
        ? { gateway: { id: env.GATEWAY_ID, skipCache: false } }
        : undefined;

      if (stream) {
        const streamResult = await env.AI.run(
          '@cf/qwen/qwen3-30b-a3b-fp8',
          { messages, max_tokens, temperature, stream: true },
          gatewayOpts,
        ) as ReadableStream;

        return new Response(streamResult, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }

      const result = await env.AI.run(
        '@cf/qwen/qwen3-30b-a3b-fp8',
        { messages, max_tokens, temperature },
        gatewayOpts,
      ) as { choices: Array<{ message: { content: string | null; reasoning_content?: string } }> };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  },
};

interface Env {
  AI: any;
  GATEWAY_ID?: string;
  OPENROUTER_API_KEY?: string;
}
