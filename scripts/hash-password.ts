/**
 * Generator wpisu do ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-password -- moje-haslo
 *
 * Hasło podajemy argumentem, a nie interaktywnie, żeby dało się to wywołać
 * także w skrypcie wdrożeniowym.
 */
import { hashPassword } from "../src/lib/password";

const password = process.argv[2];

if (!password) {
  console.error("Użycie: npm run hash-password -- <hasło>");
  process.exit(1);
}

if (password.length < 10) {
  console.error("Hasło powinno mieć co najmniej 10 znaków.");
  process.exit(1);
}

hashPassword(password).then((hash) => {
  console.info("\nWklej do .env:\n");
  console.info(`ADMIN_PASSWORD_HASH="${hash}"\n`);
});
