import crypto from 'node:crypto';
import { basename, dirname, isAbsolute, resolve } from 'node:path';

import { EVENT_LOG_FILENAME, MANIFEST_FILENAME } from '../config/defaults.js';
import { invariant } from '../util/assert.js';

const WINDOWS_PIPE_PREFIX = '\\\\.\\pipe\\agent-tty';
const UNIX_SOCKET_ROOT = '/tmp/agent-tty';
const SOCKET_HOME_ID_LENGTH = 8;
const SOCKET_ID_LENGTH = 12;

function assertNonEmptyString(
  value: string,
  label: string,
): asserts value is string {
  invariant(value.length > 0, `${label} must be a non-empty string`);
}

function assertAbsolutePath(pathValue: string, label: string): void {
  assertNonEmptyString(pathValue, label);
  invariant(isAbsolute(pathValue), `${label} must be an absolute path`);
}

function assertSessionId(sessionId: string): void {
  assertNonEmptyString(sessionId, 'sessionId');
  invariant(sessionId !== '.', 'sessionId must not be "."');
  invariant(sessionId !== '..', 'sessionId must not be ".."');
  invariant(
    !sessionId.includes('/') && !sessionId.includes('\\'),
    'sessionId must not contain path separators',
  );
}

export function sessionDir(home: string, sessionId: string): string {
  assertAbsolutePath(home, 'home');
  assertSessionId(sessionId);

  const sessionsRoot = resolve(home, 'sessions');
  const resolvedSessionDirectory = resolve(sessionsRoot, sessionId);

  invariant(
    dirname(resolvedSessionDirectory) === sessionsRoot,
    'session directory must stay within the sessions root',
  );

  return resolvedSessionDirectory;
}

function childPath(sessionDirectory: string, filename: string): string {
  assertAbsolutePath(sessionDirectory, 'sessionDir');

  const normalizedSessionDirectory = resolve(sessionDirectory);
  const child = resolve(normalizedSessionDirectory, filename);

  invariant(
    dirname(child) === normalizedSessionDirectory,
    `${filename} must stay within the session directory`,
  );

  return child;
}

export function manifestPath(sessionDirectory: string): string {
  return childPath(sessionDirectory, MANIFEST_FILENAME);
}

export function eventLogPath(sessionDirectory: string): string {
  return childPath(sessionDirectory, EVENT_LOG_FILENAME);
}

function resolveSocketDirectory(home: string): string {
  assertAbsolutePath(home, 'home');

  if (process.platform === 'win32') {
    // Named pipes don't have directories; return the pipe prefix directly.
    // The hash is incorporated in socketPath() directly.
    return WINDOWS_PIPE_PREFIX;
  }

  const directory = resolve(
    UNIX_SOCKET_ROOT,
    crypto
      .createHash('sha256')
      .update(resolve(home))
      .digest('hex')
      .slice(0, SOCKET_HOME_ID_LENGTH),
  );
  invariant(
    dirname(directory) === resolve(UNIX_SOCKET_ROOT),
    'socket directory must stay within the socket root directory',
  );
  invariant(
    basename(directory).length === SOCKET_HOME_ID_LENGTH,
    'socket home identifier must have the expected length',
  );

  return directory;
}

function deriveSessionIdentity(sessionDirectory: string): {
  home: string;
  sessionId: string;
} {
  assertAbsolutePath(sessionDirectory, 'sessionDir');

  const normalizedSessionDirectory = resolve(sessionDirectory);
  const sessionId = basename(normalizedSessionDirectory);
  assertSessionId(sessionId);

  const sessionsRoot = dirname(normalizedSessionDirectory);
  const home = dirname(sessionsRoot);

  invariant(
    sessionsRoot === resolve(home, 'sessions'),
    'session directory must stay within the sessions root',
  );

  return {
    home,
    sessionId,
  };
}

function socketFileId(sessionId: string): string {
  assertSessionId(sessionId);

  const digest = crypto
    .createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .slice(0, SOCKET_ID_LENGTH);
  invariant(
    digest.length === SOCKET_ID_LENGTH,
    'socket file identifier must have the expected length',
  );

  return digest;
}

/**
 * Returns the RPC socket path for a session.
 *
 * On Linux/macOS this is a Unix domain socket under /tmp/agent-tty.
 * On Windows this is a named pipe path (\\\\.\\pipe\\agent-tty-<hash>-<hash>).
 */
export function socketPath(sessionDirectory: string): string {
  const { home, sessionId } = deriveSessionIdentity(sessionDirectory);
  const socketDirectory = resolveSocketDirectory(home);

  if (process.platform === 'win32') {
    const homeHash = crypto
      .createHash('sha256')
      .update(resolve(home))
      .digest('hex')
      .slice(0, SOCKET_HOME_ID_LENGTH);
    invariant(
      homeHash.length === SOCKET_HOME_ID_LENGTH,
      'socket home identifier must have the expected length',
    );
    return `${socketDirectory}-${homeHash}-${socketFileId(sessionId)}`;
  }

  const socketFile = resolve(socketDirectory, socketFileId(sessionId));

  invariant(
    dirname(socketFile) === socketDirectory,
    'socket path must stay within the socket directory',
  );

  return socketFile;
}

/**
 * Returns true if the socket path represents a Windows named pipe
 * (which needs no filesystem operations like mkdir, chmod, or unlink).
 */
export function isWindowsPipeSocket(_socketPath: string): boolean {
  return process.platform === 'win32';
}
