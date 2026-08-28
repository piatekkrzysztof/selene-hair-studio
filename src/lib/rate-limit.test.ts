import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pruneRateLimits, rateLimit } from "./rate-limit";

/**
 * Limiter ma testy jednostkowe, bo testy e2e celowo go podnoszą -
 * inaczej suite wywracałby się o własne zabezpieczenie. Pokrycie musi
 * więc być tutaj, na czystej funkcji, a nie w przeglądarce.
 */

describe("limit żądań", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-03T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("przepuszcza dokładnie tyle żądań, ile wynosi limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });

  it("odlicza pozostałe żądania", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("liczy klucze niezależnie", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("zwalnia po upływie okna", () => {
    const key = `test-${Math.random()}`;
    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit(key, 1, 60_000).ok).toBe(true);
  });

  it("podaje, za ile sekund można spróbować ponownie", () => {
    const key = `test-${Math.random()}`;
    rateLimit(key, 1, 60_000);
    vi.advanceTimersByTime(20_000);

    const blocked = rateLimit(key, 1, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(40);
  });

  it("sprzątanie usuwa wygasłe wpisy, a nie aktywne", () => {
    const stale = `stale-${Math.random()}`;
    const fresh = `fresh-${Math.random()}`;

    rateLimit(stale, 1, 1_000);
    vi.advanceTimersByTime(2_000);
    rateLimit(fresh, 1, 60_000);

    pruneRateLimits();

    // Wygasły klucz zaczyna liczyć od zera, aktywny nadal blokuje.
    expect(rateLimit(stale, 1, 1_000).ok).toBe(true);
    expect(rateLimit(fresh, 1, 60_000).ok).toBe(false);
  });
});
