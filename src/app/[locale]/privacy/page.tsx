import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";
import { SALON } from "@/lib/salon";
import { siteUrl } from "@/lib/jsonld";
import { routing } from "@/i18n/routing";

interface Sekcja {
  heading: string;
  body: string[];
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const base = siteUrl();

  return {
    title: t("title"),
    description: t("lede"),
    alternates: {
      canonical: `${base}/${locale}/privacy`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${base}/${l}/privacy`]),
      ),
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "privacy" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const sekcje = t.raw("sections") as Sekcja[];

  return (
    <>
      <a className="skip" href="#main">
        {tn("skip")}
      </a>
      <Header />

      <main id="main" className="section">
        <div className="wrap article">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="legal-lede">{t("lede")}</p>
          <p className="legal-updated">{t("updated")}</p>

          <div className="prose">
            {sekcje.map((sekcja) => (
              <section key={sekcja.heading}>
                <h2>{sekcja.heading}</h2>
                {sekcja.body.map((akapit) => (
                  <p key={akapit}>{akapit}</p>
                ))}
              </section>
            ))}

            <section>
              <h2>{t("contactHeading")}</h2>
              <p>
                {t("contactBody")}{" "}
                <a href={`mailto:${SALON.email}`}>{SALON.email}</a>
                {", "}
                <a href={`tel:${SALON.phone}`}>{SALON.phoneDisplay}</a>.
              </p>
            </section>
          </div>

          <p style={{ marginTop: "var(--sp-5)" }}>
            <Link className="article-back" href="/">
              {t("back")}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
