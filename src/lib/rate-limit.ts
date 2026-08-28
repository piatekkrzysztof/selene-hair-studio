/**
 * Prosty licznik żądań w pamięci procesu.
 *
 * Świadome ograniczenie: przy wielu instancjach serwera każda ma własny licznik,
 * więc realny limit to N × limit. Dla formularza rezerwacji w jednym salonie
 * jest to akceptowalne i nie wymaga Redisa. Przy skalowaniu wymienia się tylko
 * to jedno miejsce - reszta kodu nie wie, jak limit jest liczony.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** Sprzątanie wygasłych wpisów, żeby mapa nie rosła w nieskończoność. */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
