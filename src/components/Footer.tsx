import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SALON } from "@/lib/salon";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div className="footer-brand">
          <Image src="/logo.png" alt="" width={74} height={74} loading="lazy" />
          <span>
            <b>Sélene</b>
            <span className="sub">Hair Studio</span>
          </span>
        </div>

        <div className="footer-meta">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <nav aria-label={t("contact")}>
            <Link href="/#uslugi">{t("prices")}</Link>
            <Link href="/#rezerwacja">{t("booking")}</Link>
            <Link href="/blog">{t("blog")}</Link>
            <Link href="/#kontakt">{t("contact")}</Link>
            <Link href="/privacy">{t("privacy")}</Link>
            <a href={SALON.instagram} rel="noopener noreferrer" target="_blank">
              {t("instagram")}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
