import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Audyt dostępności na wszystkich istotnych widokach.
 *
 * Progiem jest zero naruszeń WCAG 2.2 AA. Automat wyłapuje około jednej
 * trzeciej realnych problemów, więc test nie zastępuje przejścia strony
 * klawiaturą i czytnikiem ekranu - ale pilnuje, żeby regresje nie wchodziły
 * niezauważone razem z kolejnym commitem.
 */

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PAGES = [
  { name: "strona główna PL", path: "/pl" },
  { name: "strona główna EN", path: "/en" },
  { name: "lista wpisów", path: "/pl/blog" },
  { name: "wpis", path: "/pl/blog/chlodny-blond" },
  { name: "polityka prywatności", path: "/pl/privacy" },
  { name: "privacy policy EN", path: "/en/privacy" },
];

for (const target of PAGES) {
  test(`${target.name} bez naruszeń WCAG 2.2 AA`, async ({ page }) => {
    await page.goto(target.path);

    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    // Pełna lista w raporcie, żeby nie zgadywać, co dokładnie się zepsuło.
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.help}`),
    ).toEqual([]);
  });
}

test("formularz rezerwacji z błędami też przechodzi audyt", async ({ page }) => {
  await page.goto("/pl");
  await page.locator('input[name="date"]').first().waitFor({ state: "attached" });
  await page.getByRole("button", { name: /wyślij prośbę o termin/i }).click();
  await expect(
    page.locator('[role="alert"]').filter({ hasText: /formularz wymaga poprawek/i }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);

  // Jawny pomiar zamiast polegania na regule axe: target-size ma wyjątek dla
  // linków w tekście, przez co naruszenie wychodziło tylko przy niektórych
  // łamaniach wiersza. Wysokość mierzymy wprost, żeby test nie migotał.
  const wysokosci = await page.$$eval(".error-summary a", (linki) =>
    linki.map((a) => Math.round(a.getBoundingClientRect().height)),
  );
  expect(wysokosci.length).toBeGreaterThan(0);
  expect(Math.min(...wysokosci)).toBeGreaterThanOrEqual(44);
});

test("nawigacja klawiaturą dociera do głównej treści przez skip link", async ({ page }) => {
  await page.goto("/pl");
  await page.locator("main").waitFor();
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: /przejdź do treści/i });
  await expect(skip).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main/);
});

test("menu mobilne zamyka się klawiszem Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");

  const burger = page.getByRole("button", { name: /otwórz menu/i });
  await burger.click();
  await expect(page.getByRole("button", { name: /zamknij menu/i })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  await page.keyboard.press("Escape");
  await expect(burger).toHaveAttribute("aria-expanded", "false");
});
