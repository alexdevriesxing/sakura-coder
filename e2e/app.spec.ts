import { test, expect, type Page } from '@playwright/test';

async function mockTauri(page: Page) {
  await page.evaluate(() => {
    const project = {
      name: 'Sakura Smoke Project',
      rootPath: 'C:/Projects/sakura-smoke',
      template: 'blank',
      workflowId: 'general-coding',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (window as any).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: any = {}) => {
        if (cmd.includes('plugin:dialog')) return 'C:/Projects/sakura-smoke';
        if (cmd === 'load_project' || cmd === 'create_project') return project;
        if (cmd === 'list_project_tree') return [{
          name: 'src',
          path: 'C:/Projects/sakura-smoke/src',
          relativePath: 'src',
          kind: 'directory',
          children: [{
            name: 'App.tsx',
            path: 'C:/Projects/sakura-smoke/src/App.tsx',
            relativePath: 'src/App.tsx',
            kind: 'file',
          }],
        }];
        if (cmd === 'git_status') return { branch: 'main', clean: true, files: [] };
        if (cmd === 'list_checkpoints') return ['20260505_smoke'];
        if (cmd === 'list_rules') return [{ id: 'agents-md', scope: '/', relativePath: 'AGENTS.md', content: 'Plan first.', enabled: true }];
        if (cmd === 'list_memories') return [];
        if (cmd === 'list_mcp_servers') return [];
        if (cmd === 'list_background_jobs') return [];
        if (cmd === 'run_preview_check') {
          return {
            id: 'preview-smoke',
            url: 'http://127.0.0.1:5173',
            status: 'inspected',
            notes: ['Detected dev server for smoke test.'],
            screenshotPath: null,
            createdAt: new Date().toISOString(),
          };
        }
        if (cmd === 'get_diagnostics') return [];
        if (cmd === 'build_project_context') {
          return {
            files: [],
            fileTreeSummary: ['src/App.tsx'],
            searchResults: [],
            memory: null,
            diffSummaries: [],
            truncated: false,
            droppedFiles: [],
          };
        }
        return args ?? null;
      },
      convertFileSrc: (path: string) => path,
      transformCallback: () => 1,
      unregisterCallback: () => {},
    };
  });
}

test.describe('Sakura Coder shell', () => {
  test('loads the launcher without crashing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sakura Coder')).toBeVisible();
    await expect(page.getByText('What would you like to build?')).toBeVisible();
    await expect(page.getByRole('button', { name: /OPEN LOCAL WORKSPACE/i })).toBeVisible();
  });

  test('mode tabs can switch behavior', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Build', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Build', exact: true })).toHaveClass(/active/);
  });
});

test.describe('Preview and agentic-core smoke', () => {
  test('opens a mocked workspace and inspects preview state', async ({ page }) => {
    await page.goto('/');
    await mockTauri(page);
    await page.getByRole('button', { name: /OPEN LOCAL WORKSPACE/i }).click();

    await expect(page.locator('.brand-lockup').getByText('Sakura Smoke Project')).toBeVisible();
    await expect(page.getByText('Sakura Agent')).toBeVisible();
    await expect(page.getByText('Agentic Core')).toBeVisible();

    const core = page.locator('.intelligence-panel');
    await core.getByRole('button', { name: /Preview/i }).click();
    await core.getByRole('button', { name: /Inspect Preview/i }).click();
    await expect(core.getByText('http://127.0.0.1:5173')).toBeVisible();
  });
});
