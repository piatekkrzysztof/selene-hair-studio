import { OPENING_HOURS, SALON, SERVICES } from "./salon";
import { minutesToTime } from "./availability";
import type { PostMeta } from "./blog";

/**
 * Dane strukturalne schema.org.
 *
 * Generujemy je z tych samych stałych, co interfejs, więc cennik na stronie
 * i cennik w wynikach Google nie mogą się rozjechać. Do sprawdzenia w
 * Google Rich Results Test i w walidatorze schema.org.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function hairSalonSchema(locale: string, serviceNames: Record<string, string>) {
  const openingHoursSpecification = Object.entries(OPENING_HOURS)
    .filter(([, hours]) => hours !== null)
    .map(([day, hours]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_NAMES[Number(day)]}`,
      opens: minutesToTime(hours!.openMin),
      closes: minutesToTime(hours!.closeMin),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": `${siteUrl()}/#salon`,
    name: SALON.name,
    url: `${siteUrl()}/${locale}`,
    telephone: SALON.phone,
    email: SALON.email,
    priceRange: SALON.priceRange,
    currenciesAccepted: "PLN",
    paymentAccepted: "Cash, Credit Card, BLIK",
    address: {
      "@type": "PostalAddress",
      streetAddress: SALON.street,
      addressLocality: SALON.city,
      postalCode: SALON.postalCode,
      addressCountry: SALON.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SALON.geo.lat,
      longitude: SALON.geo.lng,
    },
    openingHoursSpecification,
    sameAs: [SALON.instagram],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: locale === "pl" ? "Usługi fryzjerskie" : "Hair services",
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: serviceNames[service.id] ?? service.id,
          serviceType: locale === "pl" ? "Usługa fryzjerska" : "Hairdressing",
        },
        ...(service.priceFrom !== null && {
          priceSpecification: {
            "@type": "PriceSpecification",
            minPrice: service.priceFrom,
            priceCurrency: "PLN",
          },
        }),
      })),
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function blogPostingSchema(post: PostMeta, locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: locale,
    articleSection: post.category,
    mainEntityOfPage: `${siteUrl()}/${locale}/blog/${post.slug}`,
    author: { "@type": "Organization", name: SALON.name },
    publisher: {
      "@type": "Organization",
      name: SALON.name,
      logo: { "@type": "ImageObject", url: `${siteUrl()}/logo.png` },
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
