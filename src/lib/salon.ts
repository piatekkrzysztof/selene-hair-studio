/**
 * Jedyne źródło prawdy o salonie.
 *
 * Nazwy usług i opisy NIE są tutaj - siedzą w messages/{locale}.json pod
 * kluczem `services.<id>`. Tutaj zostaje tylko to, co jest niezależne od
 * języka: czas trwania, cena, kto wykonuje, godziny otwarcia.
 */

export const SALON = {
  name: "Sélene Hair Studio",
  phone: "+48221234567",
  phoneDisplay: "22 123 45 67",
  email: "kontakt@selene-studio.pl",
  street: "ul. Puławska 128 lok. 3",
  postalCode: "02-624",
  city: "Warszawa",
  district: "Mokotów",
  country: "PL",
  geo: { lat: 52.1839, lng: 21.0221 },
  priceRange: "110-900 PLN",
  timeZone: "Europe/Warsaw",
  instagram: "https://instagram.com/selene.hairstudio",
} as const;

export type StylistId = "marta" | "iga" | "nina";

export const STYLISTS: readonly { id: StylistId }[] = [
  { id: "marta" },
  { id: "iga" },
  { id: "nina" },
];

export type ServiceId =
  | "cut-women"
  | "cut-men"
  | "color"
  | "balayage"
  | "blonde-fix"
  | "keratin"
  | "updo";

export interface Service {
  id: ServiceId;
  /** Czas pracy w minutach, bez buforu na sprzątanie stanowiska. */
  durationMin: number;
  /** Cena startowa w złotych. `null` = wycena po diagnozie. */
  priceFrom: number | null;
  /** Kto wykonuje usługę. Pusta lista nie ma sensu - zawsze co najmniej jedna osoba. */
  stylists: readonly StylistId[];
  /** Czy usługa jest dostępna w formularzu rezerwacji online. */
  bookable: boolean;
}

export const SERVICES: readonly Service[] = [
  { id: "cut-women", durationMin: 75, priceFrom: 180, stylists: ["marta", "iga"], bookable: true },
  { id: "cut-men", durationMin: 50, priceFrom: 110, stylists: ["iga"], bookable: true },
  { id: "color", durationMin: 120, priceFrom: 320, stylists: ["marta"], bookable: true },
  { id: "balayage", durationMin: 210, priceFrom: 620, stylists: ["marta"], bookable: true },
  // Korekta blondu wymaga diagnozy pasma - terminu nie da się zarezerwować w ciemno.
  { id: "blonde-fix", durationMin: 240, priceFrom: null, stylists: ["marta"], bookable: false },
  { id: "keratin", durationMin: 150, priceFrom: 480, stylists: ["marta", "iga"], bookable: true },
  { id: "updo", durationMin: 90, priceFrom: 260, stylists: ["nina"], bookable: true },
];

export const BOOKABLE_SERVICES = SERVICES.filter((s) => s.bookable);

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Godziny otwarcia w minutach od północy. `null` = zamknięte. 0 = niedziela. */
export const OPENING_HOURS: Readonly<
  Record<number, { openMin: number; closeMin: number } | null>
> = {
  0: null, // niedziela
  1: null, // poniedziałek
  2: { openMin: 10 * 60, closeMin: 20 * 60 },
  3: { openMin: 10 * 60, closeMin: 20 * 60 },
  4: { openMin: 10 * 60, closeMin: 20 * 60 },
  5: { openMin: 10 * 60, closeMin: 20 * 60 },
  6: { openMin: 9 * 60, closeMin: 16 * 60 },
};

/** Bufor na sprzątnięcie stanowiska między klientami. */
export const CLEANUP_BUFFER_MIN = 15;

/** Co ile minut proponujemy początek wizyty. */
export const SLOT_GRANULARITY_MIN = 30;

/** Minimalne wyprzedzenie rezerwacji - nie przyjmujemy zgłoszeń "za 10 minut". */
export const MIN_LEAD_TIME_MIN = 120;

/** Jak daleko w przyszłość otwieramy kalendarz. */
export const BOOKING_HORIZON_DAYS = 30;
