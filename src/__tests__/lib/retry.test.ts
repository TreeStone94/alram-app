import { withRetry } from '@/lib/retry';

describe('withRetry', () => {
  it('returns the result after one failed attempt then success', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('temporary');
      }
      return 'ok';
    });

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the final error when every attempt fails', async () => {
    const alwaysFail = jest.fn().mockRejectedValue(new Error('permanent'));

    await expect(withRetry(alwaysFail, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(
      'permanent',
    );
    expect(alwaysFail).toHaveBeenCalledTimes(3);
  });

  it('does not retry HTTP 400 errors when shouldRetry returns false', async () => {
    class HttpError extends Error {
      constructor(public statusCode: number, msg: string) {
        super(msg);
      }
    }

    const badRequest = jest.fn().mockRejectedValue(new HttpError(400, 'bad request'));

    await expect(
      withRetry(badRequest, {
        maxAttempts: 3,
        baseDelayMs: 10,
        shouldRetry: (error) => !(error instanceof HttpError && error.statusCode < 500),
      }),
    ).rejects.toThrow('bad request');
    expect(badRequest).toHaveBeenCalledTimes(1);
  });

  it('counts timeouts as retryable attempts', async () => {
    const slowFn = jest.fn().mockImplementation(() => new Promise(() => undefined));

    await expect(withRetry(slowFn, { maxAttempts: 2, baseDelayMs: 10, timeoutMs: 50 })).rejects.toThrow();
    expect(slowFn).toHaveBeenCalledTimes(2);
  });
});
