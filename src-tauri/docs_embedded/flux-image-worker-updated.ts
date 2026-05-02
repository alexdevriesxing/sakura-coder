export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET') {
      return new Response('Flux Image Worker OK', { status: 200 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as { prompt: string; negativePrompt?: string; num_steps?: number };
      const { prompt, negativePrompt, num_steps = 4 } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Run Flux model - uses multipart/form-data
      const form = new FormData();
      form.append('prompt', prompt);
      if (negativePrompt) {
        form.append('negative_prompt', negativePrompt);
      }
      form.append('steps', String(num_steps));

      const formResponse = new Response(form);
      const result = await env.AI.run('@cf/black-forest-labs/flux-2-dev', {
        multipart: {
          body: formResponse.body!,
          contentType: formResponse.headers.get('content-type')!,
        },
      }) as { image: string };

      // Return JSON with data URI instead of binary
      return new Response(JSON.stringify({
        image: `data:image/png;base64,${result.image}`,
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