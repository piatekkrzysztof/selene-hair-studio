/**
 * Sesja panelu: podpisany token w ciasteczku.
 *
 * Ten moduł jest celowo wolny od `node:crypto` i korzysta wyłącznie z Web Crypto,
 * bo importuje go middleware, a middleware działa na edge. Hasła obsługuje osobny
 * moduł `password.ts`, który działa tylko po stronie Node - podział wymusiła
 * pierwsza nieudana kompilacja i jest tu utrwalony świadomie.
 */

export const SESSION_COOKIE = "selene_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 8; // zmiana w salonie, nie tydzień

interface SessionPayload {
  sub: string;
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Porównanie w stałym czasie - `timingSafeEqual` jest tylko w Node. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(
  subject: string,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  const payload: SessionPayload = {
    sub: subject,
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_S,
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, secret)}`;
}

/** Zwraca identyfikator operatora albo null. Nigdy nie rzuca. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): Promise<string | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = await sign(body, secret);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= nowMs) return null;
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
