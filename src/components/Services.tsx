import { useTranslations } from "next-intl";
import { SERVICES } from "@/lib/salon";

export function Services() {
  const t = useTranslations("services");

  return (
    <section className="section" id="uslugi" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        <ul className="services">
          {SERVICES.map((service) => {
            const tag = t(`items.${service.id}.tag`);
            return (
              <li className="service" key={service.id}>
                <h3>{t(`items.${service.id}.name`)}</h3>
                <p className="price">
                  {service.priceFrom === null
                    ? t("quote")
                    : t("from", { price: service.priceFrom })}
                </p>
                <p className="desc">{t(`items.${service.id}.desc`)}</p>
                <p className="meta">
                  <span className="tag">{t("minutes", { minutes: service.durationMin })}</span>
                  {tag ? <span className="tag">{tag}</span> : null}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="services-note">{t("note")}</p>
      </div>
    </section>
  );
}
