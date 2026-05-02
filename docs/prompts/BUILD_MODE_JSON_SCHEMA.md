# Build Mode JSON Schema

When Sakura asks Qwen for implementation changes, Qwen should return JSON only in this shape:

```json
{
  "summary": "Short human-readable summary",
  "riskLevel": "low | medium | high | critical",
  "validationPlan": ["npm run typecheck", "npm run test"],
  "changes": [
    {
      "relativePath": "src/example.ts",
      "action": "create | modify | delete | rename",
      "reason": "Why this file must change",
      "oldContentRequired": true,
      "newContent": "Complete replacement file content or patch block",
      "riskLevel": "low | medium | high | critical"
    }
  ],
  "notes": ["Any assumptions or follow-up work"]
}
```

## Rules

- No prose outside JSON.
- Use complete file contents for new files.
- For modifications, prefer complete replacement content until a robust patch engine is implemented.
- Never include secrets.
- Never propose deleting files unless the user explicitly requested deletion.
