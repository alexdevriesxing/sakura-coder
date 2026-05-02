import { WORKSPACE_RULES } from '../data/guardrails';
import { getModeDefinition } from '../data/modes';
import { WORKFLOW_REGISTRY } from '../workflows';
import type { SakuraMode, SakuraProject, WorkflowId, WorkflowProfile, ImageAssetType, AudioAudioType } from '../types/sakura';

export function createSystemPrompt(mode: SakuraMode, project?: SakuraProject | null, workflowId?: WorkflowId | null): string {
  const modeDef = getModeDefinition(mode);
  const workflow = workflowId ? WORKFLOW_REGISTRY[workflowId] : null;

  const sections = [
    'You are Sakura Coder, a cautious senior software architect, game designer and coding assistant.',
    '',
    `ACTIVE MODE: ${modeDef.label.toUpperCase()} MODE`,
    modeDef.summary,
    '',
  ];

  if (workflow) {
    sections.push(
      `WORKFLOW: ${workflow.displayName.toUpperCase()}`,
      workflow.description,
      '',
      'WORKFLOW SYSTEM PROMPT:',
      workflow.systemPrompt,
      '',
      'WORKFLOW GUARDRAILS:',
      ...workflow.guardrails.map((rule) => `- ${rule}`),
      '',
    );
  }

  sections.push(
    'PROJECT:',
    project ? `- Name: ${project.name}\n- Root: ${project.rootPath}\n- Template: ${project.template}` : '- No project loaded.',
    '',
    'NON-NEGOTIABLE WORKSPACE RULES:',
    ...WORKSPACE_RULES.map((rule) => `- ${rule}`),
    '',
    'OUTPUT DISCIPLINE:',
    '- Be specific and implementation-oriented.',
    '- When proposing edits, return structured file changes only.',
    '- Never claim a file was changed unless the host application confirms it.',
    '- For code generation, prefer small patches over giant rewrites.',
    '- For asset generation, produce original non-infringing prompts with negative prompts.',
    '',
    'RESPONSE FORMAT FOR IMPLEMENTATION TASKS:',
    '1. Summary',
    '2. Assumptions',
    '3. Files affected',
    '4. Proposed changes',
    '5. Validation plan',
    '6. Remaining risks',
  );

  return sections.join('\n');
}

export function createWorkflowAssetPrompt(input: {
  projectName: string;
  workflowId: WorkflowId;
  assetType: string;
  subject: string;
  style?: string;
  constraints?: string;
}) {
  const workflow = WORKFLOW_REGISTRY[input.workflowId];
  const assetTypeDef = workflow?.imageAssetTypes.find((a) => a.id === input.assetType);

  const filenameBase = `${input.projectName}_${input.assetType}_${input.subject}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);

  const template = workflow?.imagePromptTemplate || 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}.';
  const prompt = template
    .replace(/\{\{projectName\}\}/g, input.projectName)
    .replace(/\{\{assetType\}\}/g, input.assetType)
    .replace(/\{\{subject\}\}/g, input.subject)
    .replace(/\{\{style\}\}/g, input.style || 'clean, professional');

  const negativeTemplate = workflow?.imageNegativePromptTemplate || workflow?.imageNegativePromptTemplate || '';
  const negativePrompt = negativeTemplate
    .replace(/\{\{projectName\}\}/g, input.projectName)
    .replace(/\{\{assetType\}\}/g, input.assetType);

  return {
    filename: `${filenameBase || 'sakura_asset'}.png`,
    prompt: prompt + (input.constraints ? ` ${input.constraints}` : ''),
    negativePrompt: negativePrompt || workflow?.imageNegativePromptTemplate || 'copyrighted characters, protected logos, watermark, low quality',
    outputFolder: assetTypeDef?.outputFolder || workflow?.outputFolders.images || 'assets/generated',
  };
}

export function createWorkflowAudioPrompt(input: {
  projectName: string;
  workflowId: WorkflowId;
  audioType: string;
  subject: string;
  mood?: string;
  duration?: number;
  loop?: boolean;
  bpm?: number;
  key?: string;
  style?: string;
}) {
  const workflow = WORKFLOW_REGISTRY[input.workflowId];
  const audioTypeDef = workflow?.audioAudioTypes.find((a: AudioAudioType) => a.id === input.audioType);

  const filenameBase = `${input.projectName}_${input.audioType}_${input.subject}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);

  const template = workflow?.audioPromptTemplate || 'Create original {{audioType}} for {{projectName}}. Mood: {{mood}}. Duration: {{duration}}s. {{style}}.';
  const prompt = template
    .replace(/\{\{projectName\}\}/g, input.projectName)
    .replace(/\{\{audioType\}\}/g, input.audioType)
    .replace(/\{\{subject\}\}/g, input.subject)
    .replace(/\{\{mood\}\}/g, input.mood || 'calm')
    .replace(/\{\{duration\}\}/g, String(input.duration || audioTypeDef?.defaultDuration || 30))
    .replace(/\{\{style\}\}/g, input.style || 'professional');

  const negativeTemplate = workflow?.audioNegativePromptTemplate || '';
  const negativePrompt = negativeTemplate
    .replace(/\{\{projectName\}\}/g, input.projectName)
    .replace(/\{\{audioType\}\}/g, input.audioType);

  return {
    filename: `${filenameBase || 'sakura_audio'}.wav`,
    prompt,
    negativePrompt: negativePrompt || workflow?.audioNegativePromptTemplate || 'copyrighted melodies, celebrity voices, protected content',
    outputFolder: audioTypeDef?.outputFolder || workflow?.outputFolders.audio || 'assets/generated/audio',
    duration: input.duration || audioTypeDef?.defaultDuration,
    loop: input.loop ?? audioTypeDef?.loopable ?? false,
    bpm: input.bpm,
    key: input.key,
  };
}

export function getWorkflowAssetTypes(workflowId: WorkflowId): ImageAssetType[] {
  return WORKFLOW_REGISTRY[workflowId]?.imageAssetTypes || [];
}

export function getWorkflowAudioTypes(workflowId: WorkflowId): { id: string; description: string; outputFolder: string; defaultDuration?: number; loopable: boolean }[] {
  return WORKFLOW_REGISTRY[workflowId]?.audioAudioTypes.map((a) => ({
    id: a.id,
    description: a.description,
    outputFolder: a.outputFolder,
    defaultDuration: a.defaultDuration,
    loopable: a.loopable,
  })) || [];
}
