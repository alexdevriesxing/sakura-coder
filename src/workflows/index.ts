export { WORKFLOW_REGISTRY, getWorkflowProfile, getWorkflowIds } from './registry';
export type { StarterTemplate } from '../types/sakura';

import { WORKFLOW_REGISTRY } from './registry';
import type { AudioAudioType, ImageAssetType, WorkflowId } from '../types/sakura';

export function getWorkflowImageTypes(workflowId: WorkflowId): ImageAssetType[] {
  const profile = WORKFLOW_REGISTRY[workflowId];
  return profile?.imageAssetTypes ?? [];
}

export function getWorkflowAudioTypes(workflowId: WorkflowId): AudioAudioType[] {
  const profile = WORKFLOW_REGISTRY[workflowId];
  return profile?.audioAudioTypes ?? [];
}