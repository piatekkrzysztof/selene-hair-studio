import { defineRouting } from "next-intl/routing";

export const locales = ["pl", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "pl",
  // Prefiks na każdej ścieżce (/pl, /en). Dzięki temu każda wersja językowa ma
  // własny, stabilny URL - warunek konieczny dla hreflang i indeksowania.
  localePrefix: "always",
});
