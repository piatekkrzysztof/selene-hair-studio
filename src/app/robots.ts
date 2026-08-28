import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/jsonld";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Endpointy API nie mają nic do zaoferowania wyszukiwarce.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
