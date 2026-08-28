import { BOOKING_HORIZON_DAYS, OPENING_HOURS } from "./salon";
import { weekdayOf } from "./availability";

/** "YYYY-MM-DD" dla podanej daty, liczone w czasie lokalnym. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Najbliższe dni, w których salon pracuje. Zaczynamy od jutra - rezerwacja
 * "na dziś" i tak wymaga telefonu, bo potwierdzenie zajmuje trochę czasu.
 */
export function upcomingOpenDays(count = 12, from = new Date()): string[] {
  const days: string[] = [];
  const cursor = new Date(from);

  for (let i = 1; i <= BOOKING_HORIZON_DAYS && days.length < count; i++) {
    cursor.setTime(from.getTime() + i * 86_400_000);
    const key = toDateKey(cursor);
    if (OPENING_HOURS[weekdayOf(key)]) days.push(key);
  }

  return days;
}

const LOCALE_TAG: Record<string, string> = { pl: "pl-PL", en: "en-GB" };

export function formatDate(dateKey: string, locale: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateShort(dateKey: string, locale: string): { weekday: string; day: string } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  const tag = LOCALE_TAG[locale] ?? "pl-PL";
  return {
    weekday: new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }).format(date),
    day: new Intl.DateTimeFormat(tag, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
      date,
    ),
  };
}

export function formatPostDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}
