import { expect, test } from "@playwright/test";

/**
 * Ścieżka rezerwacji od kliknięcia w nawigacji do potwierdzenia.
 * Test celowo nie zna wewnętrznych identyfikatorów - wybiera elementy
 * tak, jak zrobiłby to człowiek: po etykiecie i po roli.
 */

test.describe("rezerwacja online", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pl");
  });

  test("pusty formularz pokazuje podsumowanie błędów i przenosi na nie fokus", async ({ page }) => {
    // Kafelki dni renderują się dopiero po zamontowaniu komponentu, więc ich
    // obecność jest sygnałem, że React przejął formularz i klik nie przepadnie.
    await page.locator('input[name="date"]').first().waitFor({ state: "attached" });
    await page.getByRole("button", { name: /wyślij prośbę o termin/i }).click();

    // Next wstrzykuje własny role="alert" (ogłaszanie zmian tras),
    // więc zawężamy do naszego podsumowania po treści.
    const summary = page
      .locator('[role="alert"]')
      .filter({ hasText: /formularz wymaga poprawek/i });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(/wybierz usługę/i);
    await expect(summary).toBeFocused();
  });

  test("wybór usługi ogranicza listę osób do tych, które ją wykonują", async ({ page }) => {
    await page.getByRole("radio", { name: /upięcie ślubne/i }).check();

    // Upięcia robi tylko Nina, więc pozostałe osoby stają się nieaktywne.
    await expect(page.getByRole("radio", { name: /marta zielińska/i })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /nina lewandowska/i })).toBeEnabled();
  });

  test("pełna rezerwacja kończy się potwierdzeniem z numerem zgłoszenia", async ({ page }) => {
    await page.getByRole("radio", { name: /strzyżenie damskie/i }).check();

    // Klikamy kolejne dni, aż trafimy na taki z wolną godziną - dokładnie tak,
    // jak zrobiłby to klient. Branie na sztywno pierwszego dnia wywracało test,
    // gdy poprzednie przebiegi zdążyły go zapełnić.
    const days = page.locator('input[name="date"]');
    const dayCount = await days.count();
    let picked = false;

    for (let i = 0; i < dayCount && !picked; i++) {
      await days.nth(i).check();
      const candidate = page.locator('input[name="startMin"]:not([disabled])').first();
      try {
        await candidate.waitFor({ state: "attached", timeout: 5_000 });
        await candidate.check();
        picked = true;
      } catch {
        // Ten dzień jest zajęty w całości, próbujemy następnego.
      }
    }

    expect(picked, "żaden z widocznych dni nie ma wolnego terminu").toBe(true);

    await page.getByRole("textbox", { name: /imię i nazwisko/i }).fill("Anna Kowalska");
    await page.getByRole("textbox", { name: /^telefon/i }).fill("601 234 567");
    await page.getByRole("checkbox", { name: /zgadzam się na kontakt/i }).check();

    await page.getByRole("button", { name: /wyślij prośbę o termin/i }).click();

    await expect(page.getByRole("heading", { name: /zgłoszenie przyjęte/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("podsumowanie po prawej aktualizuje się na żywo", async ({ page }) => {
    const summary = page.getByRole("complementary").filter({ hasText: /twoja wizyta/i });

    await expect(summary).toContainText(/nie wybrano/i);

    await page.getByRole("radio", { name: /balejaż/i }).check();

    await expect(summary).toContainText(/620/);
    await expect(summary).toContainText(/210 min/);
  });
});

test.describe("dwujęzyczność", () => {
  test("przełącznik prowadzi do wersji angielskiej z poprawnym atrybutem lang", async ({ page }) => {
    await page.goto("/pl");

    // Na wąskim ekranie przełącznik siedzi w menu pod hamburgerem.
    const burger = page.getByRole("button", { name: /otwórz menu/i });
    if (await burger.isVisible()) await burger.click();

    await page.getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hair that walks/i);
  });

  test("obie wersje mają kanoniczny adres i odnośniki hreflang", async ({ page }) => {
    await page.goto("/en");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
    await expect(page.locator('link[hreflang="pl"]')).toHaveCount(1);
    await expect(page.locator('link[hreflang="en"]')).toHaveCount(1);
  });
});

test.describe("dane strukturalne", () => {
  test("strona główna zawiera poprawny schemat HairSalon", async ({ page }) => {
    await page.goto("/pl");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((block) => JSON.parse(block));

    const salon = parsed.find((item) => item["@type"] === "HairSalon");
    expect(salon).toBeTruthy();
    expect(salon.address.addressLocality).toBe("Warszawa");
    expect(salon.openingHoursSpecification).toHaveLength(5);

    const faq = parsed.find((item) => item["@type"] === "FAQPage");
    expect(faq.mainEntity.length).toBeGreaterThan(3);
  });
});
