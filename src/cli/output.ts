import process from 'node:process';

import type { CommandEnvelope, CommandError } from '../protocol/envelope.js';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
} from '../protocol/envelope.js';

export function writeJsonEnvelope<TResult>(
  envelope: CommandEnvelope<TResult>,
): void {
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

export function writeHumanLines(lines: readonly string[]): void {
  process.stdout.write(`${lines.join('\n')}\n`);
}

export function emitSuccess(options: {
  command: string;
  json: boolean;
  result: unknown;
  lines: readonly string[];
}): void {
  if (options.json) {
    writeJsonEnvelope(createSuccessEnvelope(options.command, options.result));
    return;
  }

  writeHumanLines(options.lines);
}

export function emitFailure(options: {
  command: string;
  json: boolean;
  error: CommandError;
}): void {
  if (options.json) {
    writeJsonEnvelope(createErrorEnvelope(options.command, options.error));
    return;
  }

  process.stderr.write(`${options.error.code}: ${options.error.message}\n`);
}
