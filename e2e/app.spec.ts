import { test, expect } from '@playwright/test';

test.describe('Sakura Coder App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads main page without crash', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    console.log('Page title:', title);
  });

  test('shows project launcher UI', async ({ page }) => {
    await expect(page.getByText('Sakura Coder')).toBeVisible();
    await expect(page.getByText('Project root path')).toBeVisible();
    await expect(page.getByText('Mission Control')).toBeVisible();
  });

  test('shows mission control panel', async ({ page }) => {
    await expect(page.getByText('Mission Control')).toBeVisible();
    await expect(page.getByText('Project')).toBeVisible();
    await expect(page.getByText('Workflow')).toBeVisible();
    await expect(page.getByText('Mode')).toBeVisible();
  });

  test('shows approval mode buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /YOLO/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Step/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Auto/i })).toBeVisible();
  });

  test('shows run to complete button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Run to Complete/i })).toBeVisible();
  });

  test('shows file tree panel', async ({ page }) => {
    await expect(page.getByText('File Tree')).toBeVisible();
    await expect(page.getByText('No project loaded')).toBeVisible();
  });

  test('shows asset studio panel', async ({ page }) => {
    await expect(page.getByText('Asset Studio')).toBeVisible();
    await expect(page.getByText('Generate images using Flux')).toBeVisible();
  });

  test('shows audio studio panel', async ({ page }) => {
    await expect(page.getByText('Audio Studio')).toBeVisible();
    await expect(page.getByText('Generate audio using Minimax')).toBeVisible();
  });

  test('has input for project root path', async ({ page }) => {
    const input = page.getByLabel('Project root path');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('C:/Projects/sakura-demo');
  });

  test('has input for project name', async ({ page }) => {
    const input = page.getByLabel('Project name');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Sakura Demo Project');
  });

  test('has create project button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Create Project/i })).toBeVisible();
  });

  test('has open existing button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Open Existing/i })).toBeVisible();
  });
});

test.describe('Mode Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows all mode tabs', async ({ page }) => {
    const modes = ['ask', 'plan', 'build', 'debug', 'asset', 'release'];
    for (const mode of modes) {
      await expect(page.getByRole('button', { name: new RegExp(mode, 'i') })).toBeVisible();
    }
  });

  test('can click build mode', async ({ page }) => {
    await page.getByRole('button', { name: /build/i }).click();
    await expect(page.getByRole('button', { name: /build/i })).toHaveClass(/active/);
  });

  test('can click asset mode', async ({ page }) => {
    await page.getByRole('button', { name: /asset/i }).click();
    await expect(page.getByRole('button', { name: /asset/i })).toHaveClass(/active/);
  });
});

test.describe('Responsive Layout', () => {
  test('works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.locator('.workspace-grid')).toBeVisible();
  });

  test('shows layout on smaller viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto('/');
    await expect(page.locator('.launcher')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('handles empty page', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page.locator('body')).toBeVisible();
  });
});