// lib/withRetry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 400 }: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}