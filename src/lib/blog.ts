import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

/**
 * Blog oparty na plikach: treść siedzi w content/blog/{locale}/*.md i jest
 * wersjonowana razem z kodem. Bez panelu, bez bazy, bez kosztu - a redakcja
 * odbywa się przez pull request, więc każda zmiana treści przechodzi review.
 */

export interface PostMeta {
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingMinutes: number;
  cover?: string;
}

export interface Post extends PostMeta {
  contentHtml: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

async function readPostFile(locale: string, fileName: string): Promise<Post> {
  const fullPath = path.join(CONTENT_DIR, locale, fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  const { data, content } = matter(raw);

  const processed = await remark().use(html).process(content);

  return {
    slug: fileName.replace(/\.md$/, ""),
    locale,
    title: String(data.title ?? ""),
    excerpt: String(data.excerpt ?? ""),
    category: String(data.category ?? ""),
    date: String(data.date ?? ""),
    cover: data.cover ? String(data.cover) : undefined,
    readingMinutes: readingTime(content),
    contentHtml: processed.toString(),
  };
}

export async function getAllPosts(locale: string): Promise<PostMeta[]> {
  const dir = path.join(CONTENT_DIR, locale);
  let files: string[];

  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const posts = await Promise.all(
    files.filter((f) => f.endsWith(".md")).map((f) => readPostFile(locale, f)),
  );

  return posts
    .map((post): PostMeta => ({
      slug: post.slug,
      locale: post.locale,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      date: post.date,
      readingMinutes: post.readingMinutes,
      cover: post.cover,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(locale: string, slug: string): Promise<Post | null> {
  try {
    return await readPostFile(locale, `${slug}.md`);
  } catch {
    return null;
  }
}

export async function getPostSlugs(locale: string): Promise<string[]> {
  const posts = await getAllPosts(locale);
  return posts.map((p) => p.slug);
}
