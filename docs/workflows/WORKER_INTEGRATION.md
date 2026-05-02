# Worker Integration

## Qwen Worker

Location:

```txt
https://qwen-coder-worker.alexdevriesxing.workers.dev/
```

The frontend uses `src/lib/aiClient.ts`.

Antigravity should inspect the current Worker contract and add a response normalizer.

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
