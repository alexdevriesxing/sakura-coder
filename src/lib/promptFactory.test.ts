import { describe, expect, it } from 'vitest';
import { createSystemPrompt, createWorkflowAssetPrompt, createWorkflowAudioPrompt, getWorkflowAssetTypes, getWorkflowAudioTypes } from './promptFactory';

describe('prompt factory', () => {
  describe('createSystemPrompt', () => {
    it('includes workflow when provided', () => {
      const prompt = createSystemPrompt('build', null, 'game-development');
      expect(prompt).toContain('GAME DEVELOPMENT STUDIO');
      expect(prompt).toContain('Phaser');
    });

    it('includes mode information', () => {
      const prompt = createSystemPrompt('build', null, null);
      expect(prompt).toContain('BUILD MODE');
    });

    it('includes workspace rules', () => {
      const prompt = createSystemPrompt('ask', null, null);
      expect(prompt).toContain('NON-NEGOTIABLE WORKSPACE RULES');
    });
  });

  describe('createWorkflowAssetPrompt', () => {
    it('creates asset prompt for game-development', () => {
      const result = createWorkflowAssetPrompt({
        projectName: 'MyGame',
        workflowId: 'game-development',
        assetType: 'character_sprite',
        subject: 'warrior character',
        style: 'pixel art',
      });

      expect(result.filename).toContain('mygame');
      expect(result.filename).toContain('character_sprite');
      expect(result.prompt).toContain('warrior character');
      expect(result.outputFolder).toContain('sprites');
    });

    it('creates asset prompt for website-webapp', () => {
      const result = createWorkflowAssetPrompt({
        projectName: 'MySite',
        workflowId: 'website-webapp',
        assetType: 'homepage_hero',
        subject: 'hero section',
      });

      expect(result.outputFolder).toContain('web/hero');
      expect(result.negativePrompt).toBeDefined();
    });

    it('creates asset prompt for asset-generation', () => {
      const result = createWorkflowAssetPrompt({
        projectName: 'AssetPack',
        workflowId: 'asset-generation',
        assetType: 'character_pack',
        subject: 'elves',
      });

      expect(result.outputFolder).toContain('asset-studio');
    });

    it('falls back to default for unknown workflow', () => {
      const result = createWorkflowAssetPrompt({
        projectName: 'Test',
        workflowId: 'unknown' as any,
        assetType: 'test',
        subject: 'test',
      });

      expect(result.outputFolder).toContain('assets/generated');
    });
  });

  describe('createWorkflowAudioPrompt', () => {
    it('creates audio prompt for game-development', () => {
      const result = createWorkflowAudioPrompt({
        projectName: 'MyGame',
        workflowId: 'game-development',
        audioType: 'jump_sound',
        subject: 'cartoon jump',
        mood: 'playful',
        duration: 0.5,
      });

      expect(result.filename).toContain('mygame');
      expect(result.filename).toContain('jump_sound');
      expect(result.outputFolder).toContain('audio/game');
      expect(result.duration).toBe(0.5);
    });

    it('creates audio prompt for audio-generation', () => {
      const result = createWorkflowAudioPrompt({
        projectName: 'MusicPack',
        workflowId: 'audio-generation',
        audioType: 'music_loop',
        subject: 'ambient',
        mood: 'calm',
        bpm: 90,
      });

      expect(result.outputFolder).toContain('audio/studio');
      expect(result.bpm).toBe(90);
    });

    it('defaults duration from workflow', () => {
      const result = createWorkflowAudioPrompt({
        projectName: 'Test',
        workflowId: 'game-development',
        audioType: 'level_music',
        subject: 'test',
      });

      expect(result.duration).toBeDefined();
    });

    it('sets loop from workflow config', () => {
      const result = createWorkflowAudioPrompt({
        projectName: 'Test',
        workflowId: 'game-development',
        audioType: 'level_music',
        subject: 'test',
      });

      expect(result.loop).toBe(true);
    });
  });

  describe('getWorkflowAssetTypes', () => {
    it('returns asset types for game-development', () => {
      const types = getWorkflowAssetTypes('game-development');
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.id === 'character_sprite')).toBeDefined();
    });

    it('returns asset types for website-webapp', () => {
      const types = getWorkflowAssetTypes('website-webapp');
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.id === 'homepage_hero')).toBeDefined();
    });

    it('returns empty for unknown workflow', () => {
      const types = getWorkflowAssetTypes('unknown' as any);
      expect(types).toHaveLength(0);
    });
  });

  describe('getWorkflowAudioTypes', () => {
    it('returns audio types for game-development', () => {
      const types = getWorkflowAudioTypes('game-development');
      expect(types.length).toBeGreaterThan(0);
    });

    it('returns audio types for audio-generation', () => {
      const types = getWorkflowAudioTypes('audio-generation');
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.id === 'music_loop')).toBeDefined();
    });

    it('returns empty for unknown workflow', () => {
      const types = getWorkflowAudioTypes('unknown' as any);
      expect(types).toHaveLength(0);
    });
  });
});