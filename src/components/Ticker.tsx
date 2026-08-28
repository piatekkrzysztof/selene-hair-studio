import { useTranslations } from "next-intl";

export function Ticker() {
  const t = useTranslations();
  const items = t.raw("ticker") as string[];

  return (
    // Pasek jest czystą dekoracją - te same słowa są w cenniku niżej,
    // więc ukrywamy go przed czytnikami ekranu zamiast dublować treść.
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <ul key={copy}>
            {items.map((item) => (
              <li key={`${copy}-${item}`}>{item}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
