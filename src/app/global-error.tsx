"use client";

/**
 * Ostatnia linia obrony: błąd w samym layoucie językowym, zanim wczyta się
 * kontekst tłumaczeń. Nie możemy tu użyć next-intl ani współdzielonych
 * komponentów, bo to właśnie one mogły zawieść - stąd własne <html>, teksty
 * w obu językach obok siebie i style wpisane wprost.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeContent: "center",
          gap: "1.5rem",
          textAlign: "center",
          padding: "2rem",
          background: "#1a1216",
          color: "#f0e7ea",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Coś poszło nie tak</h1>
        <p style={{ color: "#b0a0a7", margin: 0, maxWidth: "48ch" }}>
          Strona nie mogła się załadować. Spróbuj ponownie, a jeśli problem wróci - zadzwoń
          pod 22 123 45 67.
        </p>
        <p style={{ color: "#b0a0a7", margin: 0, maxWidth: "48ch", fontSize: "0.9rem" }}>
          The page failed to load. Try again, or call +48 22 123 45 67.
        </p>
        <p style={{ margin: 0 }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 52,
              padding: "0.9rem 1.6rem",
              background: "#9e1240",
              color: "#fff",
              border: 0,
              cursor: "pointer",
              font: "inherit",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Spróbuj ponownie
          </button>
        </p>
        {error.digest && (
          <p style={{ color: "#b0a0a7", margin: 0, fontSize: "0.8rem" }}>
            Numer zgłoszenia: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
