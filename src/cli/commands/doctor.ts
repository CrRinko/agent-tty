import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { emitSuccess } from '../output.js';

const COMMAND_NAME = 'doctor';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorResult {
  checks: DoctorCheck[];
}

function runNodeRuntimeCheck(): DoctorCheck {
  const majorVersion = Number.parseInt(
    process.versions.node.split('.')[0] ?? '',
    10,
  );
  const ok = Number.isInteger(majorVersion) && majorVersion >= 24;

  return {
    name: 'node-runtime',
    ok,
    message: ok
      ? `Node ${process.versions.node} ok`
      : `Node ${process.versions.node} requires 24+`,
    details: {
      version: process.versions.node,
      requiredMajor: 24,
    },
  };
}

async function runWorkingDirectoryCheck(): Promise<DoctorCheck> {
  await access(process.cwd(), fsConstants.R_OK | fsConstants.W_OK);

  return {
    name: 'cwd-access',
    ok: true,
    message: `cwd read/write: ${process.cwd()}`,
  };
}

async function runTemporaryDirectoryCheck(): Promise<DoctorCheck> {
  const directoryPrefix = join(tmpdir(), 'agent-terminal-');
  const temporaryDirectory = await mkdtemp(directoryPrefix);
  await rm(temporaryDirectory, { recursive: true, force: true });

  return {
    name: 'temp-dir',
    ok: true,
    message: `temp dir ok: ${tmpdir()}`,
  };
}

export async function runBaselineDoctorChecks(): Promise<DoctorResult> {
  const checks = await Promise.all([
    Promise.resolve(runNodeRuntimeCheck()),
    runWorkingDirectoryCheck(),
    runTemporaryDirectoryCheck(),
  ]);

  const uniqueCheckNames = new Set(checks.map((check) => check.name));
  assert.equal(
    uniqueCheckNames.size,
    checks.length,
    'doctor check names must be unique',
  );

  return { checks };
}

export async function runDoctorCommand(options: {
  json: boolean;
}): Promise<void> {
  const result = await runBaselineDoctorChecks();
  const failingCheck = result.checks.find((check) => !check.ok);
  const lines = result.checks.map(
    (check) => `${check.ok ? 'ok' : 'fail'} ${check.name}: ${check.message}`,
  );

  if (failingCheck !== undefined) {
    process.exitCode = 1;
  }

  emitSuccess({
    command: COMMAND_NAME,
    json: options.json,
    result,
    lines,
  });
}
