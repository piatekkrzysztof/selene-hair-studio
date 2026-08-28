/**
 * Konfiguracja panelu z zmiennych środowiskowych.
 * Czytelny błąd zamiast cichej awarii logowania, której nikt nie zrozumie.
 */
export function authConfig() {
  const secret = process.env.SESSION_SECRET;
  const user = process.env.ADMIN_USER;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET musi mieć co najmniej 32 znaki. Zobacz .env.example.");
  }
  if (!user || !passwordHash) {
    throw new Error("Brak ADMIN_USER lub ADMIN_PASSWORD_HASH. Zobacz .env.example.");
  }

  return { secret, user, passwordHash };
}
