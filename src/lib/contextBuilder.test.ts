import { describe, expect, it } from 'vitest';
import { buildContextMessage } from './contextBuilder';
import type { ProjectContextBundle } from '../types/sakura';

const projectContext: ProjectContextBundle = {
  files: [
    { relativePath: 'package.json', content: '{"scripts":{"test":"vitest"}}', reason: 'priority project file', truncated: false },
    { relativePath: 'src/App.tsx', content: 'export default function App() { return null; }', reason: 'search hit', truncated: false },
  ],
  fileTreeSummary: ['package.json', 'src/', 'src/App.tsx'],
  searchResults: [{ path: '/repo/src/App.tsx', relativePath: 'src/App.tsx', lineNumber: 1, lineContent: 'export default function App()' }],
  diffSummaries: ['20260505_pending-diff.json'],
  truncated: false,
  droppedFiles: [],
};

describe('buildContextMessage', () => {
  it('injects repo files, repo map, search hits, diffs, and visual annotations', () => {
    const result = buildContextMessage({
      userMessage: 'Fix the app',
      openFile: null,
      memory: { projectName: 'Sakura', workflowId: 'general-coding', stack: ['React'] },
      projectContext,
      visualAnnotations: [{ id: 'a1', x: 50, y: 25, text: 'Button overlaps' }],
    });

    expect(result.injectedMessage).toContain('<repo_map>');
    expect(result.injectedMessage).toContain('<search_hits>');
    expect(result.injectedMessage).toContain('<recent_diffs>');
    expect(result.injectedMessage).toContain('<visual_preview_annotations>');
    expect(result.injectedMessage).toContain('File: package.json');
    expect(result.contextFiles.map((file) => file.relativePath)).toContain('src/App.tsx');
  });

  it('does not duplicate the open file when project context also includes it', () => {
    const result = buildContextMessage({
      userMessage: 'Review open file',
      openFile: {
        name: 'App.tsx',
        absolutePath: '/repo/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: 'open content',
        language: 'tsx',
        dirty: false,
      },
      projectContext,
    });

    expect(result.contextFiles.filter((file) => file.relativePath === 'src/App.tsx')).toHaveLength(1);
    expect(result.injectedMessage).toContain('open content');
  });

  it('drops large context files to stay within the total cap', () => {
    const largeContext: ProjectContextBundle = {
      ...projectContext,
      files: [
        { relativePath: 'a.ts', content: 'a'.repeat(500), reason: 'search hit', truncated: false },
        { relativePath: 'b.ts', content: 'b'.repeat(500), reason: 'search hit', truncated: false },
      ],
    };

    const result = buildContextMessage({
      userMessage: 'Small cap',
      openFile: null,
      projectContext: largeContext,
      maxTotalChars: 400,
    });

    expect(result.truncated).toBe(true);
    expect(result.droppedFiles.length).toBeGreaterThan(0);
  });
});
