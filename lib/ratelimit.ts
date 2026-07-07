// In-memory sliding-window rate limiter — correct for a single-instance
// deploy and for dev. On serverless/multi-instance production, swap the
// store for Upstash Redis (@upstash/ratelimit) behind the same function
// signature; callers don't change.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();
const WINDOW_MS = 60_000;

export function rateLimit(key: string, maxPerMinute: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= maxPerMinute) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

// Opportunistic cleanup so the map doesn't grow unbounded.
const sweeper = setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => {
    if (b.resetAt <= now) buckets.delete(k);
  });
}, WINDOW_MS) as unknown as { unref?: () => void };
sweeper.unref?.();
