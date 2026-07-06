# Worker Integration

## Qwen Worker

Location:

```txt
https://qwen-coder-worker.alexdevriesxing.workers.dev/
```

The frontend uses `src/lib/aiClient.ts`.

The worker is a free-only, fail-closed waterfall router:

1. OpenRouter `:free` models
2. Cloudflare Workers AI through AI Gateway

Server-side configuration:

```txt
wrangler secret put OPENROUTER_API_KEY
```

Local helper:

```txt
npm run workers:configure
npm run workers:probe
npm run workers:probe:full
```

`workers:configure` reads `OPENROUTER_API_KEY` and `MINIMAX_API_KEY` from `.env`
or the shell and writes them to the correct Cloudflare Worker secrets without
printing values.

Optional vars:

```txt
OPENROUTER_FREE_MODELS=qwen/qwen3-coder:free,minimax/minimax-m2.5:free
```

Every non-streaming response includes `_sakura` metadata with the provider used,
model used, quota status, usage, and waterfall attempts. Streaming responses expose
the same route summary through `X-Sakura-*` headers.

If every configured free route is exhausted or unavailable, the worker returns 503
instead of silently switching to paid usage.

## Flux Worker

Location:

```txt
https://flux-image-worker.alexdevriesxing.workers.dev/
```

The Flux worker should ideally return either:

- base64 image data, or
- a temporary/public preview URL, or
- an R2 object URL if you add R2 later.

Sakura should save:

- image file into `assets/generated/`
- prompt metadata into `.sakura/image-generations/`

## Minimax Music Worker

Location:

```txt
https://minimax-music-worker.alexdevriesxing.workers.dev/
```

Server-side configuration:

```txt
wrangler secret put MINIMAX_API_KEY
```

If `MINIMAX_API_KEY` is not configured on the worker, Sakura can still send a
session-only BYOK key through `X-Minimax-Api-Key`. The key is not persisted by
the frontend.
