import Image from "next/image";
import { useTranslations } from "next-intl";

export function Storefront() {
  const t = useTranslations("storefront");

  return (
    <section className="storefront" aria-labelledby="witryna-tytul">
      <Image
        src="/photos/storefront.jpg"
        alt={t("alt")}
        width={1400}
        height={788}
        sizes="100vw"
        loading="lazy"
        quality={80}
      />
      <div className="storefront-cap">
        <div className="wrap">
          <p className="eyebrow">{t("eyebrow")}</p>
          <p className="place" id="witryna-tytul">
            {t("place")}
          </p>
        </div>
      </div>
    </section>
  );
}
