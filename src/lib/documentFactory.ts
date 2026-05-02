import type { ContextQuestion, SakuraMemory, SakuraProjectTemplate } from '../types/sakura';

export function defaultContextQuestions(template: SakuraProjectTemplate): ContextQuestion[] {
  const shared: ContextQuestion[] = [
    { id: 'goal', question: 'What should this project achieve in one clear sentence?', category: 'product', required: true },
    { id: 'audience', question: 'Who is the target user or audience?', category: 'audience', required: true },
    { id: 'platform', question: 'Which platform should be targeted first?', category: 'technical', required: true },
    { id: 'must_have', question: 'What must be included in the MVP?', category: 'product', required: true },
    { id: 'avoid', question: 'What should the agent avoid doing?', category: 'safety', required: false },
  ];

  if (template.includes('phaser')) {
    return [
      ...shared,
      { id: 'inspiration', question: 'Which classic or modern games inspire the core loop?', category: 'gameplay', required: true },
      { id: 'core_loop', question: 'Describe the 30-second gameplay loop.', category: 'gameplay', required: true },
      { id: 'art_style', question: 'What art style should generated assets follow?', category: 'asset', required: true },
      { id: 'asset_priority', question: 'Which assets should be generated first?', category: 'asset', required: false },
    ];
  }

  return [
    ...shared,
    { id: 'auth', question: 'Does it need login, roles or accounts?', category: 'technical', required: false },
    { id: 'data', question: 'What data must be stored?', category: 'technical', required: true },
    { id: 'integrations', question: 'Which external services or APIs are required?', category: 'technical', required: false },
    { id: 'business', question: 'How should this create business value?', category: 'business', required: false },
  ];
}

export function createContextMarkdown(input: {
  projectName: string;
  template: SakuraProjectTemplate;
  answers: ContextQuestion[];
}): string {
  const answered = input.answers.filter((q) => q.answer?.trim());
  const unanswered = input.answers.filter((q) => !q.answer?.trim());

  return [
    `# ${input.projectName} — Project Context`,
    '',
    `Template: ${input.template}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Answered Context',
    ...answered.map((q) => `### ${q.question}\n\n${q.answer}`),
    '',
    '## Open Questions',
    ...unanswered.map((q) => `- ${q.question}`),
    '',
    '## Agent Notes',
    '- Treat this file as the source of truth for planning.',
    '- Update this file whenever the user makes a major decision.',
  ].join('\n');
}

export function createAgentRulesMarkdown(): string {
  return [
    '# Sakura Agent Rules',
    '',
    '## Core Rules',
    '- Plan before coding.',
    '- Use diff approval for code changes.',
    '- Create checkpoints before applying edits.',
    '- Keep patches small and reviewable.',
    '- Never deploy, publish or delete without exact approval.',
    '- Never edit outside the active workspace.',
    '',
    '## Qwen Coder Compensation Rules',
    '- Provide explicit file paths and expected output.',
    '- Avoid vague multi-step instructions.',
    '- Prefer JSON or structured Markdown for file-change proposals.',
    '- Re-read relevant context before changing code.',
    '- Validate after each patch.',
  ].join('\n');
}

export function createDefaultMemory(projectName: string): SakuraMemory {
  return {
    projectName,
    stack: ['Tauri 2', 'React', 'TypeScript', 'Cloudflare Workers', 'Flux'],
    rules: [
      'local-first',
      'checkpoint before edit',
      'diff before apply',
      'no destructive commands',
      'original non-infringing generated assets only',
    ],
    decisions: [{ date: new Date().toISOString(), decision: 'Initialized Sakura Coder project memory.' }],
    openQuestions: [],
    workerEndpoints: {
      qwen: import.meta.env.VITE_QWEN_WORKER_URL || 'https://qwen-coder-worker.alexdevriesxing.workers.dev/',
      flux: import.meta.env.VITE_FLUX_WORKER_URL || 'https://flux-image-worker.alexdevriesxing.workers.dev/',
    },
  };
}
