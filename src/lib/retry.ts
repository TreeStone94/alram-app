export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

interface ErrorWithStatusCode {
  statusCode?: number;
}

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403]);

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const statusCode = (error as ErrorWithStatusCode).statusCode;
  return typeof statusCode === 'number' ? statusCode : undefined;
}

function defaultShouldRetry(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  return statusCode === undefined || !NON_RETRYABLE_STATUS_CODES.has(statusCode);
}

function createAbortError(): Error {
  const error = new Error('Operation timed out');
  error.name = 'AbortError';
  return error;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(createAbortError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  if (options.maxAttempts < 1) {
    throw new Error('maxAttempts must be at least 1');
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      if (options.timeoutMs !== undefined) {
        return await runWithTimeout(fn, options.timeoutMs);
      }

      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === options.maxAttempts;
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const retryAllowed = isTimeout
        ? true
        : (options.shouldRetry ?? defaultShouldRetry)(error);

      if (isLastAttempt || !retryAllowed) {
        throw error;
      }

      await delay(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}
