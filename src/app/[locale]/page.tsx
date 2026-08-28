import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { Manifesto } from "@/components/Manifesto";
import { Services } from "@/components/Services";
import { Gallery } from "@/components/Gallery";
import { Team } from "@/components/Team";
import { Reviews } from "@/components/Reviews";
import { BlogTeaser } from "@/components/BlogTeaser";
import { Faq, type FaqItem } from "@/components/Faq";
import { BookingForm } from "@/components/BookingForm";
import { Storefront } from "@/components/Storefront";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";

import { faqSchema, hairSalonSchema } from "@/lib/jsonld";
import { SERVICES } from "@/lib/salon";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale });

  // Nazwy usług do JSON-LD bierzemy z tych samych tłumaczeń, co interfejs.
  const serviceNames = Object.fromEntries(
    SERVICES.map((service) => [service.id, t(`services.items.${service.id}.name`)]),
  );
  const faqItems = t.raw("faq.items") as FaqItem[];

  return (
    <>
      <JsonLd data={hairSalonSchema(locale, serviceNames)} />
      <JsonLd data={faqSchema(faqItems)} />

      <a className="skip" href="#main">
        {t("nav.skip")}
      </a>
      <Header />

      <main id="main">
        <Hero />
        <Ticker />
        <Manifesto />
        <Services />
        <Gallery />
        <Team />
        <Reviews />
        <BlogTeaser locale={locale} />
        <Faq />
        <BookingForm />
        <Storefront />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
