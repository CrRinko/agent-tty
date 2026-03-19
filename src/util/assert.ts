import assert from 'node:assert/strict';

export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  assert.ok(condition, message);
}

export function unreachable(value: never, message: string): never {
  throw new Error(`${message}: ${String(value)}`);
}

export function assertString(
  value: unknown,
  message: string,
): asserts value is string {
  assert.equal(typeof value, 'string', message);
}
