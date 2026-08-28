import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Hasło operatora panelu. Wyłącznie środowisko Node - importowanie tego
 * z middleware wywala kompilację i tak ma zostać.
 *
 * scrypt jest celowo wolny: to jedyna obrona przed zgadywaniem offline,
 * gdyby zmienne środowiskowe kiedyś wyciekły.
 */

export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ?? randomBytes(16).toString("hex");

  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key)));
  });

  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const candidate = (await hashPassword(password, salt)).split(":")[1]!;

  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
