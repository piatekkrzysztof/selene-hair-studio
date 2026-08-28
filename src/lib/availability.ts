/**
 * Silnik wolnych terminów.
 *
 * Cała arytmetyka dzieje się na minutach od północy w czasie lokalnym salonu.
 * Dzięki temu funkcja jest czysta, deterministyczna i nie zależy od strefy
 * czasowej maszyny, na której działa - a to jest jedyny sposób, żeby dało się
 * ją sensownie przetestować.
 */

import {
  CLEANUP_BUFFER_MIN,
  MIN_LEAD_TIME_MIN,
  OPENING_HOURS,
  SLOT_GRANULARITY_MIN,
  STYLISTS,
  type StylistId,
} from "./salon";

export interface ExistingBooking {
  stylistId: StylistId | null;
  startMin: number;
  endMin: number;
}

export interface Slot {
  /** "HH:MM" */
  time: string;
  startMin: number;
  endMin: number;
  available: boolean;
  /** Osoby, które w tym oknie są wolne. Puste, gdy termin zajęty. */
  freeStylists: StylistId[];
}

export interface SlotQuery {
  /** YYYY-MM-DD */
  date: string;
  /** Czas trwania usługi w minutach, bez buforu. */
  durationMin: number;
  /** Kto ma wykonać usługę. `null` = dowolna z `eligibleStylists`. */
  stylistId: StylistId | null;
  /** Osoby, które w ogóle wykonują tę usługę. */
  eligibleStylists: readonly StylistId[];
  /** Rezerwacje istniejące tego dnia. */
  bookings: readonly ExistingBooking[];
  /** "Teraz" jako minuty od północy; podaj tylko dla dnia dzisiejszego. */
  nowMin?: number | null;
  /** Nadpisania na potrzeby testów. */
  bufferMin?: number;
  granularityMin?: number;
  leadTimeMin?: number;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Dzień tygodnia (0-6) dla daty "YYYY-MM-DD", niezależnie od strefy czasowej. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  // Wizyta kończąca się dokładnie wtedy, gdy zaczyna się następna, NIE jest kolizją -
  // bufor na sprzątanie jest już wliczony w endMin.
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Zwraca wszystkie okna startowe danego dnia z informacją, czy są wolne.
 * Zwracamy też terminy zajęte, żeby interfejs mógł je pokazać jako nieaktywne -
 * pusta lista bez wyjaśnienia jest gorsza niż lista z wyszarzonymi godzinami.
 */
export function generateSlots(query: SlotQuery): Slot[] {
  const {
    date,
    durationMin,
    stylistId,
    eligibleStylists,
    bookings,
    nowMin = null,
    bufferMin = CLEANUP_BUFFER_MIN,
    granularityMin = SLOT_GRANULARITY_MIN,
    leadTimeMin = MIN_LEAD_TIME_MIN,
  } = query;

  const hours = OPENING_HOURS[weekdayOf(date)];
  if (!hours) return [];
  if (durationMin <= 0) return [];

  const candidates: StylistId[] = stylistId
    ? eligibleStylists.includes(stylistId)
      ? [stylistId]
      : []
    : [...eligibleStylists];

  if (candidates.length === 0) return [];

  const blockMin = durationMin + bufferMin;
  const slots: Slot[] = [];

  // Pierwsze okno zaczyna się o otwarciu i przesuwa się co granularityMin.
  // Ostatnie musi zmieścić całą usługę razem z buforem przed zamknięciem.
  for (let start = hours.openMin; start + blockMin <= hours.closeMin; start += granularityMin) {
    const end = start + blockMin;

    const tooSoon = nowMin !== null && start < nowMin + leadTimeMin;

    const freeStylists = candidates.filter((candidate) =>
      bookings.every((booking) => {
        // Rezerwacja "na dowolną osobę" blokuje kogoś z zespołu, więc traktujemy
        // ją jako zajętość każdego kandydata - inaczej podwójnie sprzedalibyśmy fotel.
        const sameStylist = booking.stylistId === null || booking.stylistId === candidate;
        if (!sameStylist) return true;
        return !overlaps(start, end, booking.startMin, booking.endMin);
      }),
    );

    slots.push({
      time: minutesToTime(start),
      startMin: start,
      endMin: end,
      available: !tooSoon && freeStylists.length > 0,
      freeStylists,
    });
  }

  return slots;
}

/** Czy konkretny termin da się jeszcze zarezerwować. Używane po stronie serwera. */
export function isSlotBookable(query: SlotQuery, startMin: number): boolean {
  return generateSlots(query).some((slot) => slot.startMin === startMin && slot.available);
}

/** Kogo przypisać, gdy klient wybrał "dowolna osoba". */
export function pickStylist(
  query: SlotQuery,
  startMin: number,
): StylistId | null {
  const slot = generateSlots(query).find((s) => s.startMin === startMin);
  if (!slot || !slot.available) return null;
  return slot.freeStylists[0] ?? null;
}

export const ALL_STYLIST_IDS: readonly StylistId[] = STYLISTS.map((s) => s.id);
