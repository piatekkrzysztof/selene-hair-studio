import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { minutesToTime, weekdayOf } from "@/lib/availability";
import { getService, OPENING_HOURS } from "@/lib/salon";
import { formatDate, toDateKey } from "@/lib/dates";
import { serviceName, STATUS_LABEL, stylistName } from "@/lib/labels";
import { BookingActions } from "@/components/panel/BookingActions";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Panel · Sélene Hair Studio",
  robots: { index: false, follow: false },
};

// Panel zawsze pokazuje aktualny stan bazy - nic tu nie może być z cache'u.
export const dynamic = "force-dynamic";

function shiftDay(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const params = await searchParams;
  const today = toDateKey(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.d ?? "") ? params.d! : today;

  const bookings = await prisma.booking.findMany({
    where: { date },
    orderBy: { startMin: "asc" },
  });

  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const hours = OPENING_HOURS[weekdayOf(date)];

  const minutesBooked = active.reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
  const revenue = active.reduce((sum, b) => sum + (getService(b.serviceId)?.priceFrom ?? 0), 0);
  const capacity = hours ? hours.closeMin - hours.openMin : 0;
  const load = capacity > 0 ? Math.round((minutesBooked / capacity) * 100) : 0;

  return (
    <div className="panel">
      <header className="panel-bar on-dark">
        <div className="panel-bar-in">
          <div>
            <p className="eyebrow">Panel salonu</p>
            <strong>Sélene Hair Studio</strong>
          </div>
          <form action={logout}>
            <button className="btn btn-ghost" type="submit">
              Wyloguj
            </button>
          </form>
        </div>
      </header>

      <main className="panel-main">
        <nav className="panel-days" aria-label="Wybór dnia">
          <Link className="btn btn-ghost" href={`/panel?d=${shiftDay(date, -1)}`}>
            ← Poprzedni
          </Link>
          <div className="panel-day-label">
            <h1>{formatDate(date, "pl")}</h1>
            <p>
              {hours
                ? `Otwarte ${minutesToTime(hours.openMin)} - ${minutesToTime(hours.closeMin)}`
                : "Salon zamknięty"}
              {date === today ? " · dzisiaj" : ""}
            </p>
          </div>
          <Link className="btn btn-ghost" href={`/panel?d=${shiftDay(date, 1)}`}>
            Następny →
          </Link>
          {date !== today && (
            <Link className="btn btn-ghost" href="/panel">
              Dzisiaj
            </Link>
          )}
        </nav>

        <dl className="panel-stats">
          <div>
            <dt>Wizyty</dt>
            <dd>{active.length}</dd>
          </div>
          <div>
            <dt>Zajęty czas</dt>
            <dd>
              {Math.floor(minutesBooked / 60)} h {minutesBooked % 60} min
            </dd>
          </div>
          <div>
            <dt>Obłożenie</dt>
            <dd>{load}%</dd>
          </div>
          <div>
            <dt>Przychód od</dt>
            <dd>{revenue} zł</dd>
          </div>
        </dl>

        {bookings.length === 0 ? (
          <p className="panel-empty">
            {hours
              ? "Brak rezerwacji na ten dzień."
              : "Salon jest tego dnia zamknięty, więc rezerwacji nie ma i być nie może."}
          </p>
        ) : (
          <ul className="panel-list">
            {bookings.map((booking) => {
              const service = getService(booking.serviceId);
              return (
                <li
                  key={booking.id}
                  className="panel-booking"
                  data-status={booking.status.toLowerCase()}
                >
                  <p className="panel-time">
                    <strong>{minutesToTime(booking.startMin)}</strong>
                    <span>{minutesToTime(booking.endMin)}</span>
                  </p>

                  <div className="panel-what">
                    <h2>{serviceName(booking.serviceId)}</h2>
                    <p className="panel-meta">
                      {stylistName(booking.stylistId)}
                      {service ? ` · ${service.durationMin} min` : ""}
                      {service?.priceFrom ? ` · od ${service.priceFrom} zł` : ""}
                    </p>
                    {booking.note && <p className="panel-note">{booking.note}</p>}
                  </div>

                  <div className="panel-who">
                    <p>{booking.customerName}</p>
                    <a href={`tel:${booking.customerPhone.replace(/\s/g, "")}`}>
                      {booking.customerPhone}
                    </a>
                    {booking.customerEmail && (
                      <a href={`mailto:${booking.customerEmail}`}>{booking.customerEmail}</a>
                    )}
                  </div>

                  <div className="panel-actions">
                    <span className="panel-status">{STATUS_LABEL[booking.status]}</span>
                    <BookingActions id={booking.id} status={booking.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
