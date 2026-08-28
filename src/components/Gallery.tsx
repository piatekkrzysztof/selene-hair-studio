import Image from "next/image";
import { useTranslations } from "next-intl";

const SHOTS = [
  { key: "caramel", src: "/photos/work-1.jpg", className: "shot shot--feature", w: 1000, h: 1250 },
  { key: "curls", src: "/photos/work-2.jpg", className: "shot", w: 700, h: 875 },
  { key: "bob", src: "/photos/work-3.jpg", className: "shot", w: 700, h: 875 },
  { key: "precision", src: "/photos/work-4.jpg", className: "shot", w: 700, h: 875 },
  { key: "wash", src: "/photos/work-5.jpg", className: "shot", w: 700, h: 875 },
  { key: "ash", src: "/photos/work-6.jpg", className: "shot shot--span2", w: 900, h: 1125 },
] as const;

export function Gallery() {
  const t = useTranslations("gallery");

  return (
    <section className="section" id="metamorfozy" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        <div className="gallery">
          {SHOTS.map((shot) => (
            <figure className={shot.className} key={shot.key}>
              <Image
                src={shot.src}
                alt={t(`shots.${shot.key}.alt`)}
                width={shot.w}
                height={shot.h}
                sizes="(min-width: 820px) 33vw, 50vw"
                // Cała galeria jest poniżej pierwszego ekranu - hero nie ma
                // zdjęcia, więc żaden kafel nie konkuruje o pasmo z LCP.
                loading="lazy"
                quality={78}
              />
              <figcaption>{t(`shots.${shot.key}.caption`)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
