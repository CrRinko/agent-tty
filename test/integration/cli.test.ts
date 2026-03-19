import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

function runCli(args: string[]): string {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', './src/cli/main.ts', ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');

  return result.stdout;
}

describe('CLI integration', () => {
  it('prints a JSON envelope for version', () => {
    const stdout = runCli(['version', '--json']);
    const parsed = JSON.parse(stdout) as {
      ok: boolean;
      command: string;
      result: { cliVersion: string };
    };

    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('version');
    expect(parsed.result.cliVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints a JSON envelope for doctor', () => {
    const stdout = runCli(['doctor', '--json']);
    const parsed = JSON.parse(stdout) as {
      ok: boolean;
      command: string;
      result: { checks: Array<{ ok: boolean; name: string }> };
    };

    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('doctor');
    expect(parsed.result.checks.length).toBeGreaterThan(0);
    expect(parsed.result.checks.every((check) => check.ok)).toBe(true);
  });
});
