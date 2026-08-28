import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { generateSlots, type ExistingBooking } from "@/lib/availability";
import { getService, type StylistId } from "@/lib/salon";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stylistId: z.string().nullable().optional(),
});

/**
 * GET /api/availability?serviceId=…&date=YYYY-MM-DD&stylistId=…
 *
 * Zwraca listę okien startowych razem z informacją, które są zajęte.
 * Interfejs pokazuje zajęte godziny jako nieaktywne, zamiast je ukrywać -
 * pusta lista bez wyjaśnienia wygląda jak awaria.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
    stylistId: searchParams.get("stylistId") || null,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const service = getService(parsed.data.serviceId);
  if (!service || !service.bookable) {
    return NextResponse.json({ error: "unknown_service" }, { status: 404 });
  }

  const rows = await prisma.booking.findMany({
    where: { date: parsed.data.date, status: { not: "CANCELLED" } },
    select: { stylistId: true, startMin: true, endMin: true },
  });

  const bookings: ExistingBooking[] = rows.map((row) => ({
    stylistId: (row.stylistId as StylistId | null) ?? null,
    startMin: row.startMin,
    endMin: row.endMin,
  }));

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const slots = generateSlots({
    date: parsed.data.date,
    durationMin: service.durationMin,
    stylistId: (parsed.data.stylistId as StylistId | null) ?? null,
    eligibleStylists: service.stylists,
    bookings,
    nowMin:
      parsed.data.date === todayKey ? today.getHours() * 60 + today.getMinutes() : null,
  });

  return NextResponse.json(
    { date: parsed.data.date, slots: slots.map(({ time, startMin, available }) => ({ time, startMin, available })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
