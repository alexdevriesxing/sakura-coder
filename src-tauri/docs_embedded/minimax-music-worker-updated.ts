export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET') {
      return new Response('Minimax Music Worker OK', { status: 200 });
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
          headers: { 'Content-Type': 'application/json' },
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

      // Return JSON with data URI instead of binary
      const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
      return new Response(JSON.stringify({
        audio: `data:${mimeType};base64,${result.audio}`,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

interface Env {
  AI: any;
}