import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { getAllPosts, getPost } from "@/lib/blog";
import { formatPostDate } from "@/lib/dates";
import { blogPostingSchema, breadcrumbSchema, siteUrl } from "@/lib/jsonld";
import { routing } from "@/i18n/routing";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const post of await getAllPosts(locale)) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${siteUrl()}/${locale}/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "blog" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const base = siteUrl();

  return (
    <>
      <JsonLd data={blogPostingSchema(post, locale)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: tn("home"), url: `${base}/${locale}` },
          { name: tn("blog"), url: `${base}/${locale}/blog` },
          { name: post.title, url: `${base}/${locale}/blog/${slug}` },
        ])}
      />

      <a className="skip" href="#main">
        {tn("skip")}
      </a>
      <Header />

      <main id="main" className="section">
        <div className="wrap">
          <article className="article">
            <Link className="article-back" href="/blog">
              ← {t("backToList")}
            </Link>

            <p className="post-meta" style={{ marginTop: "var(--sp-3)" }}>
              <span className="chip">{post.category}</span>
              <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
              <span className="read">· {t("readingTime", { minutes: post.readingMinutes })}</span>
            </p>

            <h1>{post.title}</h1>

            {/* Treść pochodzi z naszego repozytorium i przechodzi przez remark,
                który nie przepuszcza surowego HTML-a. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

            <p style={{ marginTop: "var(--sp-5)", color: "var(--ink-soft)" }}>{t("cta")}</p>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}
