"use client";

import { useState } from "react";
import { cancelBooking, confirmBooking } from "@/app/panel/actions";

export function BookingActions({ id, status }: { id: string; status: string }) {
  const [confirming, setConfirming] = useState(false);

  if (status === "CANCELLED") {
    return <span className="panel-hint">Termin zwolniony</span>;
  }

  return (
    <div className="panel-buttons">
      {status === "PENDING" && (
        <form action={confirmBooking}>
          <input type="hidden" name="id" value={id} />
          <button className="btn btn-primary btn-small" type="submit">
            Potwierdź
          </button>
        </form>
      )}

      {/* Odwołanie wymaga drugiego kliknięcia. Pomyłka kosztuje tu klienta,
          więc jeden przypadkowy klik nie może usunąć wizyty z grafiku. */}
      {confirming ? (
        <form action={cancelBooking} className="panel-confirm">
          <input type="hidden" name="id" value={id} />
          <span>Na pewno?</span>
          <button className="btn btn-danger btn-small" type="submit">
            Tak, odwołaj
          </button>
          <button
            className="btn btn-ghost btn-small"
            type="button"
            onClick={() => setConfirming(false)}
          >
            Nie
          </button>
        </form>
      ) : (
        <button
          className="btn btn-ghost btn-small"
          type="button"
          onClick={() => setConfirming(true)}
        >
          Odwołaj
        </button>
      )}
    </div>
  );
}
