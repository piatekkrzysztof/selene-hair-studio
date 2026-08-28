import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SERVICES } from "@/lib/salon";

const CARD_SERVICES = ["cut-women", "cut-men", "color", "balayage"] as const;

export function Hero() {
  const t = useTranslations("hero");
  const tn = useTranslations("nav");
  const ts = useTranslations("services");

  return (
    <section className="hero grain on-dark" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <svg className="hero-moon" viewBox="0 0 620 620" aria-hidden="true">
        <circle cx="310" cy="310" r="302" />
        <circle cx="310" cy="310" r="262" />
        <circle cx="310" cy="310" r="196" />
      </svg>

      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="eyebrow">{t("eyebrow")}</p>

          <h1>
            {t("headline")} <em>{t("headlineAccent")}</em>
          </h1>

          <p className="hero-lead">{t("lead")}</p>

          <div className="hero-actions">
            <Link className="btn btn-primary" href="/#rezerwacja">
              {tn("book")}
            </Link>
            <Link className="btn btn-ghost" href="/#uslugi">
              {t("ctaPrices")}
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <p className="hero-card-label">{t("cardLabel")}</p>
          <dl className="mini-price">
            {CARD_SERVICES.map((id) => {
              const service = SERVICES.find((s) => s.id === id)!;
              return (
                <div key={id}>
                  <dt>{ts(`items.${id}.name`)}</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd>{ts("from", { price: service.priceFrom ?? 0 })}</dd>
                </div>
              );
            })}
          </dl>
          <Link className="card-link" href="/#uslugi">
            {t("cardLink")}
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
          </Link>
          <p className="hero-card-note">{t("cardNote")}</p>
        </aside>

        <dl className="hero-facts">
          <div className="fact">
            <dt>{t("factSince")}</dt>
            <dd>2013</dd>
          </div>
          <div className="fact">
            <dt>{t("factRating")}</dt>
            <dd>4,9 / 5</dd>
          </div>
          <div className="fact">
            <dt>{t("factReviews")}</dt>
            <dd>382</dd>
          </div>
          <div className="fact">
            <dt>{t("factTeam")}</dt>
            <dd>3</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
