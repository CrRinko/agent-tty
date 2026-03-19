import { describe, expect, it } from 'vitest';

import { runBaselineDoctorChecks } from '../../../src/cli/commands/doctor.js';

describe('doctor command', () => {
  it('returns unique passing checks', async () => {
    const result = await runBaselineDoctorChecks();
    const checkNames = result.checks.map((check) => check.name);

    expect(checkNames.length).toBeGreaterThan(0);
    expect(new Set(checkNames).size).toBe(checkNames.length);
    expect(result.checks.every((check) => check.ok)).toBe(true);
  });
});
