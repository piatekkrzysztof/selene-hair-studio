import type { MetadataRoute } from "next";
import { getPostSlugs } from "@/lib/blog";
import { siteUrl } from "@/lib/jsonld";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const alternates = Object.fromEntries(
      routing.locales.map((l) => [l, `${base}/${l}`]),
    );

    entries.push({
      url: `${base}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: alternates },
    });

    entries.push({
      url: `${base}/${locale}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}/blog`])),
      },
    });

    entries.push({
      url: `${base}/${locale}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}/privacy`])),
      },
    });

    for (const slug of await getPostSlugs(locale)) {
      entries.push({
        url: `${base}/${locale}/blog/${slug}`,
        lastModified: new Date(),
        changeFrequency: "yearly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
