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
      return new Response('Minimax Music Worker OK', { 
        status: 200,
        headers: corsHeaders
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
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
        sample_rate = 32000,
      } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Run Minimax music model
      const result = await env.AI.run('minimax/music-2.6', {
        prompt,
        lyrics,
        is_instrumental,
        lyrics_optimizer,
        format,
        sample_rate,
      }) as { audio: string };

      if (!result || !result.audio) {
        return new Response(JSON.stringify({
          error: 'Minimax model returned no audio. Ensure the minimax/music-2.6 model is enabled in your Cloudflare Workers AI dashboard.',
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return JSON with data URI instead of binary
      const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
      return new Response(JSON.stringify({
        audio: `data:${mimeType};base64,${result.audio}`,
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
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
}