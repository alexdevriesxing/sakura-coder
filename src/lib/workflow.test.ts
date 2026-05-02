import { describe, expect, it } from 'vitest';
import { WORKFLOW_REGISTRY, getWorkflowProfile, getWorkflowIds } from '../workflows';

describe('workflow registry', () => {
  it('has all 7 workflow profiles', () => {
    const ids = getWorkflowIds();
    expect(ids).toHaveLength(7);
  });

  it('includes general-coding workflow', () => {
    const profile = getWorkflowProfile('general-coding');
    expect(profile.id).toBe('general-coding');
    expect(profile.displayName).toBe('General Coding');
  });

  it('includes game-development workflow', () => {
    const profile = getWorkflowProfile('game-development');
    expect(profile.imageAssetTypes.length).toBeGreaterThan(0);
    expect(profile.audioAudioTypes.length).toBeGreaterThan(0);
  });

  it('includes website-webapp workflow', () => {
    const profile = getWorkflowProfile('website-webapp');
    expect(profile.recommendedStacks).toContain('Next.js');
  });

  it('includes app-development workflow', () => {
    const profile = getWorkflowProfile('app-development');
    expect(profile.recommendedStacks).toContain('Tauri');
  });

  it('includes ai-cloudflare workflow', () => {
    const profile = getWorkflowProfile('ai-cloudflare');
    expect(profile.recommendedStacks).toContain('Cloudflare Workers');
  });

  it('includes asset-generation workflow', () => {
    const profile = getWorkflowProfile('asset-generation');
    expect(profile.imageAssetTypes.length).toBeGreaterThan(0);
  });

  it('includes audio-generation workflow', () => {
    const profile = getWorkflowProfile('audio-generation');
    expect(profile.audioAudioTypes.length).toBeGreaterThan(0);
  });

  it('throws for unknown workflow', () => {
    expect(() => getWorkflowProfile('unknown' as any)).toThrow();
  });

  it('game-development has sprite asset types', () => {
    const profile = getWorkflowProfile('game-development');
    const spriteTypes = profile.imageAssetTypes.filter(a => a.id.includes('sprite'));
    expect(spriteTypes.length).toBeGreaterThan(0);
  });

  it('game-development has music audio types', () => {
    const profile = getWorkflowProfile('game-development');
    const musicTypes = profile.audioAudioTypes.filter(a => a.id.includes('music'));
    expect(musicTypes.length).toBeGreaterThan(0);
  });

  it('all workflows have system prompts', () => {
    const ids = getWorkflowIds();
    for (const id of ids) {
      const profile = getWorkflowProfile(id);
      expect(profile.systemPrompt.length).toBeGreaterThan(0);
    }
  });

  it('all workflows have guardrails', () => {
    const ids = getWorkflowIds();
    for (const id of ids) {
      const profile = getWorkflowProfile(id);
      expect(profile.guardrails.length).toBeGreaterThan(0);
    }
  });

  it('all workflows have output folders', () => {
    const ids = getWorkflowIds();
    for (const id of ids) {
      const profile = getWorkflowProfile(id);
      expect(profile.outputFolders.images).toBeDefined();
      expect(profile.outputFolders.audio).toBeDefined();
    }
  });
});