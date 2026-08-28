/**
 * Kilka rezerwacji na najbliższe dni, żeby na demo było widać, że silnik
 * terminów naprawdę wyklucza kolizje, a nie tylko wypisuje godziny.
 */
import { PrismaClient } from "@prisma/client";
import { CLEANUP_BUFFER_MIN, OPENING_HOURS } from "../src/lib/salon";
import { weekdayOf } from "../src/lib/availability";

const prisma = new PrismaClient();

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextOpenDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; days.length < count && i < 30; i++) {
    const key = toKey(new Date(now.getTime() + i * 86_400_000));
    if (OPENING_HOURS[weekdayOf(key)]) days.push(key);
  }
  return days;
}

async function main() {
  const [day1, day2] = nextOpenDays(2);
  if (!day1 || !day2) throw new Error("Brak dni otwarcia w horyzoncie");

  await prisma.booking.deleteMany({});

  const seed = [
    { date: day1, startMin: 10 * 60, durationMin: 210, serviceId: "balayage", stylistId: "marta", customerName: "Anna Nowak" },
    { date: day1, startMin: 15 * 60, durationMin: 75, serviceId: "cut-women", stylistId: "iga", customerName: "Zofia Wilk" },
    { date: day2, startMin: 11 * 60, durationMin: 120, serviceId: "color", stylistId: "marta", customerName: "Julia Mazur" },
  ];

  for (const row of seed) {
    const [y, m, d] = row.date.split("-").map(Number);
    await prisma.booking.create({
      data: {
        serviceId: row.serviceId,
        stylistId: row.stylistId,
        date: row.date,
        startMin: row.startMin,
        endMin: row.startMin + row.durationMin + CLEANUP_BUFFER_MIN,
        startsAt: new Date(Date.UTC(y!, m! - 1, d!, Math.floor(row.startMin / 60), row.startMin % 60)),
        customerName: row.customerName,
        customerPhone: "600 000 000",
        status: "CONFIRMED",
      },
    });
  }

  console.info(`Dodano ${seed.length} rezerwacji na ${day1} i ${day2}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
