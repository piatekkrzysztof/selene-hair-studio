"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Review {
  stars: number;
  text: string;
  author: string;
  meta: string;
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      aria-hidden="true"
    >
      <path d="M12 2l3 6.6 7 .9-5.2 4.8 1.4 7-6.2-3.5L5.8 21l1.4-7L2 9.5l7-.9z" />
    </svg>
  );
}

export function Reviews() {
  const t = useTranslations("reviews");
  const items = t.raw("items") as Review[];

  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector(".review");
    const step = card ? card.getBoundingClientRect().width + 24 : 360;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="section reviews" id="opinie">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        {/* Karuzela nie startuje sama - nie ma więc czego zatrzymywać,
            a użytkownik klawiatury przewija listę strzałkami. */}
        <div
          className="scroller"
          ref={scroller}
          onScroll={sync}
          tabIndex={0}
          role="group"
          aria-label={t("region")}
        >
          {items.map((review) => (
            <article className="review" key={review.author + review.meta}>
              <div
                className="stars"
                role="img"
                aria-label={t("rating", { stars: review.stars })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} filled={n <= review.stars} />
                ))}
              </div>
              <blockquote>{review.text}</blockquote>
              <footer>
                <b>{review.author}</b>
                {review.meta}
              </footer>
            </article>
          ))}
        </div>

        <div className="scroll-ctrl">
          <button
            className="icon-btn"
            type="button"
            aria-label={t("prev")}
            disabled={atStart}
            onClick={() => scrollBy(-1)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label={t("next")}
            disabled={atEnd}
            onClick={() => scrollBy(1)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
