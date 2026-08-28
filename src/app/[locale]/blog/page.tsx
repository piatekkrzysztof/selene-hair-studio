import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { getAllPosts } from "@/lib/blog";
import { formatPostDate } from "@/lib/dates";
import { breadcrumbSchema, siteUrl } from "@/lib/jsonld";
import { routing } from "@/i18n/routing";

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
    title: t("blogTitle"),
    description: t("blogDescription"),
    alternates: {
      canonical: `${base}/${locale}/blog`,
      languages: { pl: `${base}/pl/blog`, en: `${base}/en/blog` },
    },
  };
}

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "blog" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const posts = await getAllPosts(locale);
  const base = siteUrl();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: tn("home"), url: `${base}/${locale}` },
          { name: tn("blog"), url: `${base}/${locale}/blog` },
        ])}
      />

      <a className="skip" href="#main">
        {tn("skip")}
      </a>
      <Header />

      <main id="main" className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t("eyebrow")}</p>
              <h2>{t("title")}</h2>
            </div>
            <p className="head-side">{t("side")}</p>
          </div>

          {posts.length === 0 ? (
            <p>{t("empty")}</p>
          ) : (
            <div className="posts">
              {posts.map((post) => (
                <article className="post" key={post.slug}>
                  <p className="post-meta">
                    <span className="chip">{post.category}</span>
                    <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
                    <span className="read">
                      · {t("readingTime", { minutes: post.readingMinutes })}
                    </span>
                  </p>
                  <h3>{post.title}</h3>
                  <p className="excerpt">{post.excerpt}</p>
                  <Link className="post-link" href={`/blog/${post.slug}`}>
                    {t("readMore")}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
