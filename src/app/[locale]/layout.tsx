import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";

import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/jsonld";
import "@/styles/globals.css";

// next/font hostuje pliki fontów u nas, więc znika żądanie do Google i CLS
// przy zamianie fontu zastępczego na docelowy.
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const base = siteUrl();

  return {
    metadataBase: new URL(base),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${base}/${locale}`,
      languages: {
        pl: `${base}/pl`,
        en: `${base}/en`,
        "x-default": `${base}/pl`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "pl" ? "pl_PL" : "en_GB",
      url: `${base}/${locale}`,
      title: t("title"),
      description: t("description"),
      siteName: "Sélene Hair Studio",
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();

  // Bez tego strony wypadają ze statycznego renderowania i każdy request
  // renderuje się od nowa.
  setRequestLocale(locale);

  // Do przeglądarki wysyłamy wyłącznie przestrzenie nazw używane przez
  // komponenty klienckie (nagłówek, karuzela opinii, formularz rezerwacji).
  // Wcześniej szedł cały plik tłumaczeń, serializowany do HTML-a przy każdym
  // żądaniu - płacili za to wszyscy, także ci, którzy nigdy nie dojdą do formularza.
  const wszystkie = await getMessages();
  const doKlienta = ["nav", "reviews", "booking", "services", "team"] as const;
  const messages = Object.fromEntries(
    doKlienta.map((klucz) => [klucz, wszystkie[klucz]]),
  ) as typeof wszystkie;

  return (
    <html lang={locale} className={`${bodoni.variable} ${archivo.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
