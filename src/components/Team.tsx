import Image from "next/image";
import { useTranslations } from "next-intl";
import { STYLISTS } from "@/lib/salon";

export function Team() {
  const t = useTranslations("team");

  return (
    <section className="section" id="zespol" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        <figure className="team-banner">
          <Image
            src="/photos/team.jpg"
            alt={t("bannerAlt")}
            width={1500}
            height={656}
            sizes="(min-width: 1320px) 1320px, 100vw"
            loading="lazy"
            quality={78}
          />
        </figure>

        <div className="team">
          {STYLISTS.map((stylist) => (
            <article className="member" key={stylist.id}>
              <h3>{t(`members.${stylist.id}.name`)}</h3>
              <p className="role">{t(`members.${stylist.id}.role`)}</p>
              <p>{t(`members.${stylist.id}.bio`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
