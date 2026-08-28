import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllPosts } from "@/lib/blog";
import { formatPostDate } from "@/lib/dates";

const ArrowIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export async function BlogTeaser({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = (await getAllPosts(locale)).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="section" id="blog">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        <div className="posts">
          {posts.map((post) => (
            <article className="post" key={post.slug}>
              <p className="post-meta">
                <span className="chip">{post.category}</span>
                <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
                <span className="read">· {t("readingTime", { minutes: post.readingMinutes })}</span>
              </p>
              <h3>{post.title}</h3>
              <p className="excerpt">{post.excerpt}</p>
              <Link className="post-link" href={`/blog/${post.slug}`}>
                {t("readMore")}
                <ArrowIcon />
              </Link>
            </article>
          ))}
        </div>

        <p style={{ marginTop: "var(--sp-4)" }}>
          <Link className="post-link" href="/blog">
            {t("all")}
            <ArrowIcon />
          </Link>
        </p>
      </div>
    </section>
  );
}
