import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Archivo, Bodoni_Moda } from "next/font/google";

import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/jsonld";
import "@/styles/globals.css";

// next/font hostuje pliki fontów u nas, więc znika żądanie do Google i CLS
// przy zamianie fontu zastępczego na docelowy.
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
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${bodoni.variable} ${archivo.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
