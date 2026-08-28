import { expect, test as setup } from "@playwright/test";
import { PANEL_STATE } from "./auth-state";

/**
 * Logujemy się raz na cały przebieg i zapisujemy stan sesji.
 *
 * Powód nie jest tylko wydajnościowy: logowanie ma limit prób z jednego
 * adresu, a suite wykonywał ich kilkanaście. Test, który wywraca się o własne
 * zabezpieczenie, jest złym testem - poprawną odpowiedzią jest nie logować
 * się w kółko, a nie rozluźniać limit. Sam limiter ma testy jednostkowe.
 */
setup("logowanie do panelu", async ({ page }) => {
  await page.goto("/panel/login");
  await page.getByLabel("Login").fill("salon");
  await page.getByLabel("Hasło").fill("selene-demo-2026");
  await page.getByRole("button", { name: /zaloguj/i }).click();

  await expect(page).toHaveURL(/\/panel$/);
  await page.context().storageState({ path: PANEL_STATE });
});
