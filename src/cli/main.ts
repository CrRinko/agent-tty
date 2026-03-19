#!/usr/bin/env node

import { Command } from 'commander';

import { CliError } from './errors.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runVersionCommand } from './commands/version.js';
import { emitFailure } from './output.js';

async function main(): Promise<void> {
  const program = new Command()
    .name('agent-terminal')
    .description('Terminal CLI')
    .showHelpAfterError();

  program
    .command('version')
    .description('Print version')
    .option('--json', 'Emit a JSON command envelope', false)
    .action(async (options: { json: boolean }) => {
      await runVersionCommand(options);
    });

  program
    .command('doctor')
    .description('Check env')
    .option('--json', 'Emit a JSON command envelope', false)
    .action(async (options: { json: boolean }) => {
      await runDoctorCommand(options);
    });

  await program.parseAsync();
}

try {
  await main();
} catch (error: unknown) {
  if (error instanceof CliError) {
    emitFailure({
      command: 'agent-terminal',
      json: false,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        details: error.details,
      },
    });
    process.exitCode = 1;
  } else {
    throw error;
  }
}
