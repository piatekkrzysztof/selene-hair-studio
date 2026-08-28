import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { bookingInputSchema } from "@/lib/booking-schema";
import { generateSlots, minutesToTime, pickStylist, type ExistingBooking } from "@/lib/availability";
import { CLEANUP_BUFFER_MIN, getService, SALON, type StylistId } from "@/lib/salon";
import { clientIpFrom, pruneRateLimits, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings
 *
 * Kolejność kroków jest celowa:
 *  1. limit żądań  - zanim dotkniemy bazy,
 *  2. walidacja    - ten sam schemat Zod, co w formularzu,
 *  3. pułapka na boty,
 *  4. ponowne sprawdzenie terminu na świeżych danych z bazy.
 *
 * Krok 4 jest kluczowy: między wyświetleniem formularza a jego wysłaniem
 * ktoś inny mógł zająć ten sam fotel. Walidacja po stronie klienta nie ma
 * o tym pojęcia, więc ostatnie słowo należy do serwera.
 */
export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  // Domyślnie 5 zgłoszeń na godzinę z adresu. Testy e2e podnoszą limit,
  // bo tworzą kilka rezerwacji pod rząd z tego samego adresu.
  const perHour = Number(process.env.BOOKING_RATE_LIMIT ?? 5);
  const limit = rateLimit(`booking:${ip}`, perHour, 60 * 60 * 1000);
  pruneRateLimits();

  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bookingInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const input = parsed.data;

  // Pułapka na boty: pole `website` jest ukryte przed człowiekiem.
  // Odpowiadamy sukcesem, żeby bot nie wiedział, że został odrzucony.
  if (input.website) {
    return NextResponse.json({ id: "ok", date: input.date, time: "", serviceId: input.serviceId, stylistId: null });
  }

  const service = getService(input.serviceId);
  if (!service || !service.bookable) {
    return NextResponse.json({ error: "unknown_service" }, { status: 404 });
  }

  const rows = await prisma.booking.findMany({
    where: { date: input.date, status: { not: "CANCELLED" } },
    select: { stylistId: true, startMin: true, endMin: true },
  });

  const bookings: ExistingBooking[] = rows.map((row) => ({
    stylistId: (row.stylistId as StylistId | null) ?? null,
    startMin: row.startMin,
    endMin: row.endMin,
  }));

  const query = {
    date: input.date,
    durationMin: service.durationMin,
    stylistId: (input.stylistId as StylistId | null) ?? null,
    eligibleStylists: service.stylists,
    bookings,
    nowMin: null,
  };

  const slot = generateSlots(query).find((s) => s.startMin === input.startMin);
  if (!slot || !slot.available) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  // Gdy klient wybrał "dowolna osoba", przypisujemy konkretną teraz -
  // rezerwacja bez przypisania blokowałaby cały zespół.
  const stylistId = input.stylistId ?? pickStylist(query, input.startMin);

  const [year, month, day] = input.date.split("-").map(Number);
  const startsAt = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, Math.floor(input.startMin / 60), input.startMin % 60),
  );

  const booking = await prisma.booking.create({
    data: {
      serviceId: service.id,
      stylistId,
      date: input.date,
      startMin: input.startMin,
      endMin: input.startMin + service.durationMin + CLEANUP_BUFFER_MIN,
      startsAt,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      note: input.note || null,
      locale: input.locale,
    },
  });

  await notifySalon({
    id: booking.id,
    service: service.id,
    stylistId,
    date: input.date,
    time: minutesToTime(input.startMin),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    note: input.note || "",
  });

  return NextResponse.json(
    {
      id: booking.id,
      date: booking.date,
      time: minutesToTime(booking.startMin),
      serviceId: booking.serviceId,
      stylistId: booking.stylistId,
    },
    { status: 201 },
  );
}

/**
 * Powiadomienie dla salonu.
 *
 * Bez klucza Resend zgłoszenie i tak trafia do bazy, a treść ląduje w logu.
 * Świadomie nie przerywamy rezerwacji, gdy poczta nie działa - klient nie
 * może stracić terminu przez problem z dostawcą e-maila.
 */
async function notifySalon(data: Record<string, string | null>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_NOTIFICATION_EMAIL ?? SALON.email;

  const body = Object.entries(data)
    .map(([key, value]) => `${key}: ${value ?? "-"}`)
    .join("\n");

  if (!apiKey) {
    console.info(`[booking] nowa rezerwacja (e-mail wyłączony)\n${body}`);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Sélene <rezerwacje@selene-studio.pl>`,
        to: [to],
        subject: `Nowa rezerwacja: ${data.date} ${data.time}`,
        text: body,
      }),
    });
  } catch (error) {
    console.error("[booking] nie udało się wysłać powiadomienia", error);
  }
}
