import { useTranslations } from "next-intl";

export function Manifesto() {
  const t = useTranslations("manifesto");

  return (
    <section className="section manifest">
      <div className="wrap manifest-grid">
        <blockquote>
          {t("quote")} <i>{t("quoteAccent")}</i>
        </blockquote>
        <div className="manifest-body">
          <p>{t("p1")}</p>
          <p>
            <strong>{t("p2Strong")}</strong> {t("p2")}
          </p>
          <p>{t("p3")}</p>
        </div>
      </div>
    </section>
  );
}
