# Sakura Coder — Asset Bible

## Asset Philosophy

Generated assets must be original, non-infringing, project-aware and saved with metadata.

## Required Metadata

```json
{
  "id": "asset-id",
  "filename": "asset.png",
  "relativePath": "assets/generated/asset.png",
  "prompt": "...",
  "negativePrompt": "...",
  "assetType": "hero-image",
  "model": "flux",
  "createdAt": "ISO date",
  "sourceWorker": "worker URL",
  "status": "generated"
}
```

## Negative Prompt Baseline

```txt
copyrighted characters, protected logos, unreadable text, watermark, UI artifacts, distorted anatomy, low resolution, duplicate limbs, blurry, noisy, trademarked game characters, exact celebrity likeness
```

## File Naming

Use lowercase snake_case:

```txt
project_asset_type_subject_variant.png
```
