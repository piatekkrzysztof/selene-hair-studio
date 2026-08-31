"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Granica błędu dla stron publicznych.
 *
 * Bez niej nieobsłużony wyjątek pokazuje domyślny ekran Next.js - obcy
 * wizualnie i bez żadnej drogi wyjścia dla użytkownika. Tutaj zostaje
 * układ strony, jest przycisk ponowienia i telefon do salonu, bo przy
 * awarii rezerwacji to jest realna alternatywa.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // `digest` to identyfikator, który Next zapisuje w logach serwera.
    // Bez niego zgłoszenie "coś nie działa" jest nie do powiązania z logiem.
    console.error("Błąd renderowania strony", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="wrap notfound">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "52ch" }}>{t("body")}</p>

      <div className="hero-actions" style={{ justifyContent: "center" }}>
        <button className="btn btn-primary" type="button" onClick={reset}>
          {t("retry")}
        </button>
        <a className="btn btn-ghost" href="tel:+48221234567">
          {t("call")}
        </a>
      </div>

      {error.digest && (
        <p style={{ color: "var(--ink-soft)", fontSize: "var(--step--1)" }}>
          {t("reference", { digest: error.digest })}
        </p>
      )}
    </main>
  );
}
