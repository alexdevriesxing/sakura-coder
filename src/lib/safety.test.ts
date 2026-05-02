import { describe, expect, it } from 'vitest';
import { assessCommandRisk, assessFileRead } from './safety';

describe('safety guardrails', () => {
  it('blocks destructive commands', () => {
    const decision = assessCommandRisk('rm -rf /', 'build');
    expect(decision.allowed).toBe(false);
    expect(decision.riskLevel).toBe('critical');
  });

  it('allows validation commands in debug mode', () => {
    const decision = assessCommandRisk('npm run typecheck', 'debug');
    expect(decision.allowed).toBe(true);
  });

  it('blocks secret reads without approval', () => {
    const decision = assessFileRead('.env');
    expect(decision.allowed).toBe(false);
  });
});
