/**
 * Small in-memory fixed-window rate limiter.
 *
 * It is per server process: limits reset on restart and aren't shared
 * between instances. That is enough to stop a single client from hammering
 * expensive or abusable endpoints (OpenAI, checkout, messaging) on a
 * single-server deployment. Move to Redis if you run several instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true if the call is allowed, false if the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}
