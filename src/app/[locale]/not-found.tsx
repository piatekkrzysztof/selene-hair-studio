import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="wrap notfound">
      <h1>{t("title")}</h1>
      <p style={{ color: "var(--ink-soft)" }}>{t("body")}</p>
      <p>
        <Link className="btn btn-primary" href="/">
          {t("cta")}
        </Link>
      </p>
    </main>
  );
}
