export class CliError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details: Record<string, unknown>;

  public constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'CliError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details ?? {};
  }
}
