import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Bodoni_Moda } from "next/font/google";

import "@/styles/globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

// Bodoni składa nagłówek, który jest elementem LCP - ten krój ma pierwszeństwo.
// Archivo celowo BEZ preload: to 65 ze 103 kB pobieranych z wyprzedzeniem,
// a tekst akapitowy nie decyduje o pomiarze. Bez preloadu przeglądarka i tak
// go pobierze, tylko niższym priorytetem, nie odbierając pasma Bodoniemu.
// Układ się nie przesuwa, bo next/font dopasowuje metryki kroju zastępczego
// (ascent/descent/size-adjust) - CLS zostaje na zerze.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
  preload: false,
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
