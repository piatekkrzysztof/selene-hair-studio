import { z } from "zod";
import { BOOKABLE_SERVICES, BOOKING_HORIZON_DAYS, STYLISTS } from "./salon";

const serviceIds = BOOKABLE_SERVICES.map((s) => s.id) as [string, ...string[]];
const stylistIds = STYLISTS.map((s) => s.id) as [string, ...string[]];

/** Numer polski: 9 cyfr, z opcjonalnym +48 i dowolnymi separatorami. */
const phoneRegex = /^(?:\+?48)?[\s-]?(?:\d[\s-]?){9}$/;

/**
 * Ten sam schemat waliduje formularz w przeglądarce i żądanie na serwerze.
 * Walidacja po stronie klienta jest wygodą, walidacja na serwerze jest
 * zabezpieczeniem - dlatego schemat musi być jeden.
 */
export const bookingInputSchema = z.object({
  serviceId: z.enum(serviceIds, { message: "Wybierz usługę." }),
  stylistId: z.enum(stylistIds).nullable().default(null),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty.")
    .refine((value) => {
      const day = new Date(`${value}T12:00:00Z`);
      if (Number.isNaN(day.getTime())) return false;
      const horizon = new Date();
      horizon.setUTCDate(horizon.getUTCDate() + BOOKING_HORIZON_DAYS);
      return day <= horizon;
    }, `Kalendarz jest otwarty na ${BOOKING_HORIZON_DAYS} dni do przodu.`),
  startMin: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 - 1),
  customerName: z
    .string()
    .trim()
    .min(3, "Podaj imię i nazwisko.")
    .max(120, "Imię i nazwisko jest za długie."),
  customerPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Podaj numer telefonu w formacie 601 234 567."),
  customerEmail: z.string().trim().email("Nieprawidłowy adres e-mail.").optional().or(z.literal("")),
  note: z.string().trim().max(1000, "Uwagi są za długie.").optional().or(z.literal("")),
  consent: z.literal(true, { message: "Zgoda na kontakt jest wymagana." }),
  locale: z.enum(["pl", "en"]).default("pl"),
  /**
   * Pułapka na boty. Pole jest ukryte w formularzu, więc człowiek go nie wypełni.
   * Odrzucamy żądanie ciszej niż błędem walidacji - bot nie ma dostać podpowiedzi.
   */
  website: z.string().max(0).optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const bookingResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  serviceId: z.string(),
  stylistId: z.string().nullable(),
});

export type BookingResponse = z.infer<typeof bookingResponseSchema>;
