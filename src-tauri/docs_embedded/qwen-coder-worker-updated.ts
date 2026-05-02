export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET') {
      return new Response('Qwen Coder Worker OK', { status: 200 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
      };

      const { messages, max_tokens = 4096, temperature = 0.7 } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages array is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Build chat history for the model
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Run Qwen model
      const result = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
        messages: chatHistory,
        max_tokens,
        temperature,
      }) as { response: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };

      // Return JSON directly - already correct format
      return new Response(JSON.stringify(result), {
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