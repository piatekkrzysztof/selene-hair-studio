import Image from "next/image";
import { useTranslations } from "next-intl";
import { SALON } from "@/lib/salon";

export function Contact() {
  const t = useTranslations("contact");

  return (
    <section className="section contact grain on-dark" id="kontakt">
      <div className="wrap contact-grid">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2>{t("title")}</h2>
          <p className="lede">{t("lede")}</p>

          <div className="hero-actions">
            <a className="btn btn-primary" href={`tel:${SALON.phone}`}>
              {t("call", { phone: SALON.phoneDisplay })}
            </a>
            <a className="btn btn-ghost" href={`mailto:${SALON.email}`}>
              {t("write")}
            </a>
          </div>

          <ul className="hours">
            <li>
              <span>{t("hoursWeek")}</span>
              <span>10:00 - 20:00</span>
            </li>
            <li>
              <span>{t("hoursSat")}</span>
              <span>09:00 - 16:00</span>
            </li>
            <li>
              <span>{t("hoursClosed")}</span>
              <span>{t("closed")}</span>
            </li>
          </ul>
        </div>

        <div>
          <figure className="salon-shot">
            <Image
              src="/photos/salon.jpg"
              alt={t("salonAlt")}
              width={1200}
              height={675}
              sizes="(min-width: 900px) 480px, 100vw"
              loading="lazy"
              quality={78}
            />
          </figure>

          <ul className="contact-list">
            <li>
              <span className="label">{t("address")}</span>
              <p className="value">
                {SALON.street}
                <br />
                {SALON.postalCode} {SALON.city}
              </p>
            </li>
            <li>
              <span className="label">{t("phone")}</span>
              <a className="value" href={`tel:${SALON.phone}`}>
                {SALON.phoneDisplay}
              </a>
            </li>
            <li>
              <span className="label">{t("email")}</span>
              <a className="value" href={`mailto:${SALON.email}`}>
                {SALON.email}
              </a>
            </li>
            <li>
              <span className="label">{t("directions")}</span>
              <p
                className="value"
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "var(--step-0)",
                  lineHeight: 1.6,
                  color: "var(--on-band-soft)",
                }}
              >
                {t("directionsText")}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
