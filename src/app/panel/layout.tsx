import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

import "@/styles/globals.css";

// Kroje hostujemy sami, w podzbiorach ograniczonych do 226 znaków, których
// strona faktycznie używa. Google serwuje pełne bloki latin i latin-ext -
// razem 110,7 kB w czterech plikach. Te dwa ważą 58,2 kB.
// Odtworzenie: `node scripts/fetch-fonts.mjs`.
const bodoni = localFont({
  src: "../../fonts/bodoni-moda-subset.woff2",
  weight: "400 600",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
  // Dopasowanie metryk kroju zastępczego - bez tego wraca CLS.
  adjustFontFallback: "Times New Roman",
});

const archivo = localFont({
  src: "../../fonts/archivo-subset.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-body",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "Panel · Sélene Hair Studio",
  // Panel nie ma czego szukać w wyszukiwarce.
  robots: { index: false, follow: false },
};

/**
 * Panel stoi poza segmentem [locale] i jest wyłącznie po polsku.
 * To decyzja produktowa: obsługuje go trzyosobowy zespół w Warszawie,
 * więc tłumaczenie narzędzia wewnętrznego byłoby kosztem bez odbiorcy.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${bodoni.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
