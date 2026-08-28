import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PANEL_STATE } from "./auth-state";

/**
 * Panel salonu: dostęp, obsługa rezerwacji, audyt dostępności.
 *
 * Dane przygotowujemy przez publiczne API, a nie przez bezpośredni zapis do
 * bazy - dzięki temu test przechodzi tę samą ścieżkę, co prawdziwy klient,
 * i wyłapałby rozjazd między silnikiem terminów a panelem.
 */

const LOGIN = "salon";
const PASSWORD = "selene-demo-2026";

interface SeededBooking {
  date: string;
  time: string;
  customer: string;
  serviceId: string;
}

/**
 * Znajduje najbliższy dzień z wolnym terminem i zakłada rezerwację.
 *
 * Nazwisko dostaje losowy sufiks, bo baza deweloperska przeżywa kolejne
 * przebiegi: bez tego drugie uruchomienie trafiałoby na dwie klientki o tej
 * samej nazwie i selektor przestawałby być jednoznaczny.
 */
async function seedBooking(
  request: APIRequestContext,
  customer: string,
  serviceId = "cut-women",
): Promise<SeededBooking> {
  const unique = `${customer} ${Math.random().toString(36).slice(2, 7)}`;
  const today = new Date();

  for (let offset = 1; offset <= 21; offset++) {
    const day = new Date(today.getTime() + offset * 86_400_000);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate(),
    ).padStart(2, "0")}`;

    const availability = await request.get(`/api/availability?serviceId=${serviceId}&date=${date}`);
    if (!availability.ok()) continue;

    const { slots } = (await availability.json()) as {
      slots: { time: string; startMin: number; available: boolean }[];
    };
    const slot = slots.find((s) => s.available);
    if (!slot) continue;

    const created = await request.post("/api/bookings", {
      data: {
        serviceId,
        stylistId: null,
        date,
        startMin: slot.startMin,
        customerName: unique,
        customerPhone: "601 234 567",
        note: "Notatka z testu e2e",
        consent: true,
        locale: "pl",
      },
    });

    expect(created.status(), await created.text()).toBe(201);
    return { date, time: slot.time, customer: unique, serviceId };
  }

  throw new Error("Nie znaleziono wolnego terminu w horyzoncie 21 dni");
}

async function signIn(page: Page) {
  await page.goto("/panel/login");
  await page.getByLabel("Login").fill(LOGIN);
  await page.getByLabel("Hasło").fill(PASSWORD);
  await page.getByRole("button", { name: /zaloguj/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test.describe("dostęp do panelu", () => {
  // Ta grupa musi startować bez sesji, więc jawnie ją czyścimy.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("bez sesji panel przekierowuje na logowanie", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel\/login/);
    await expect(page.getByRole("heading", { name: /sélene hair studio/i })).toBeVisible();
  });

  test("błędne hasło nie wpuszcza i nie zdradza, co było nie tak", async ({ page }) => {
    await page.goto("/panel/login");
    await page.getByLabel("Login").fill(LOGIN);
    await page.getByLabel("Hasło").fill("zle-haslo-zupelnie");
    await page.getByRole("button", { name: /zaloguj/i }).click();

    await expect(page.locator(".panel-error")).toHaveText(/nieprawidłowy login lub hasło/i);
    await expect(page).toHaveURL(/\/panel\/login/);
  });

  test("nieistniejący login daje ten sam komunikat co złe hasło", async ({ page }) => {
    await page.goto("/panel/login");
    await page.getByLabel("Login").fill("nie-ma-takiego");
    await page.getByLabel("Hasło").fill(PASSWORD);
    await page.getByRole("button", { name: /zaloguj/i }).click();

    await expect(page.locator(".panel-error")).toHaveText(/nieprawidłowy login lub hasło/i);
  });

  test("poprawne dane wpuszczają, wylogowanie znów zamyka drzwi", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("button", { name: /wyloguj/i }).click();
    await expect(page).toHaveURL(/\/panel\/login/);

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel\/login/);
  });
});

test.describe("obsługa rezerwacji", () => {
  test.use({ storageState: PANEL_STATE });

  test("rezerwacja z formularza pojawia się w panelu i daje się potwierdzić", async ({
    page,
    request,
  }) => {
    const booking = await seedBooking(request, "Klientka Testowa");
    await page.goto(`/panel?d=${booking.date}`);

    const row = page.locator(".panel-booking").filter({ hasText: booking.customer });
    await expect(row).toBeVisible();
    await expect(row).toContainText(booking.time);
    await expect(row).toContainText("Notatka z testu e2e");
    await expect(row).toContainText(/oczekuje/i);

    await row.getByRole("button", { name: /potwierdź/i }).click();

    await expect(row).toContainText(/potwierdzona/i);
    await expect(row.getByRole("button", { name: /potwierdź/i })).toHaveCount(0);
  });

  test("odwołanie wymaga potwierdzenia i zwalnia termin", async ({ page, request }) => {
    // Upięcia robi wyłącznie Nina, a pozostałe testy rezerwują strzyżenie
    // u Marty i Igi. Dzięki temu sprawdzenie "termin wrócił do puli" nie
    // ściga się z rezerwacją zakładaną równolegle przez inny test.
    const booking = await seedBooking(request, "Klientka Do Odwolania", "updo");
    await page.goto(`/panel?d=${booking.date}`);

    const row = page.locator(".panel-booking").filter({ hasText: booking.customer });

    // Pierwsze kliknięcie tylko pyta - pomyłka nie może skasować wizyty.
    await row.getByRole("button", { name: /^odwołaj$/i }).click();
    await expect(row).toContainText(/na pewno/i);
    await expect(row).toContainText(/oczekuje/i);

    await row.getByRole("button", { name: /tak, odwołaj/i }).click();
    await expect(row).toContainText(/odwołana/i);

    // Zwolniony termin wraca do puli - to samo okno jest znów do wzięcia.
    const availability = await request.get(
      `/api/availability?serviceId=${booking.serviceId}&date=${booking.date}`,
    );
    const { slots } = (await availability.json()) as {
      slots: { time: string; available: boolean }[];
    };
    expect(slots.find((s) => s.time === booking.time)?.available).toBe(true);
  });

  test("dzień bez rezerwacji pokazuje stan pusty, nie pustą listę", async ({ page }) => {
    // Niedziela - salon zamknięty, więc komunikat musi to tłumaczyć.
    await page.goto("/panel?d=2026-03-08");
    await expect(page.locator(".panel-empty")).toContainText(/zamknięty/i);
  });
});

test.describe("dostępność panelu", () => {
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  test.use({ storageState: PANEL_STATE });

  test("logowanie bez naruszeń WCAG 2.2 AA", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/panel/login");
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("panel z rezerwacjami bez naruszeń WCAG 2.2 AA", async ({ page, request }) => {
    const booking = await seedBooking(request, "Klientka Audyt");
    await page.goto(`/panel?d=${booking.date}`);

    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
