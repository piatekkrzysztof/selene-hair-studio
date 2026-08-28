"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const SECTIONS = ["services", "gallery", "team", "blog", "reviews", "contact"] as const;

const HREF: Record<(typeof SECTIONS)[number], string> = {
  services: "/#uslugi",
  gallery: "/#metamorfozy",
  team: "/#zespol",
  blog: "/blog",
  reviews: "/#opinie",
  contact: "/#kontakt",
};

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setStuck(window.scrollY > 12);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape zamyka menu - bez tego użytkownik klawiatury zostaje w pułapce.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const otherLocale = locale === "pl" ? "en" : "pl";

  return (
    <header className={`header${stuck ? " is-stuck" : ""}`}>
      <div className="wrap header-in">
        <Link className="brand" href="/">
          <Image src="/logo.png" alt="" width={46} height={46} priority />
          <span className="brand-name">
            <b>Sélene</b>
            <span>Hair Studio</span>
          </span>
        </Link>

        <nav className="nav" aria-label={t("home")}>
          {SECTIONS.map((key) => (
            <Link key={key} href={HREF[key]}>
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="lang-switch" href={pathname} locale={otherLocale} hrefLang={otherLocale}>
            {t("switchTo")}
          </Link>
          <Link className="btn btn-primary" href="/#rezerwacja">
            {t("book")}
          </Link>
        </div>

        <button
          className="burger"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t("menuClose") : t("menuOpen")}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>
      </div>

      {/* `inert` wyjmuje zwinięte menu z kolejności tabulacji i spod kursora.
          Samo ukrycie wysokością zostawia w środku klikalne linki, których
          nie widać - użytkownik klawiatury wpadał w niewidzialną pułapkę. */}
      <div className="mobile-nav" id="mobile-nav" data-open={open} inert={!open}>
        <div>
          <div className="wrap">
            <ul>
              {SECTIONS.map((key) => (
                <li key={key}>
                  <Link href={HREF[key]} onClick={() => setOpen(false)}>
                    {t(key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={pathname} locale={otherLocale} onClick={() => setOpen(false)}>
                  {t("switchTo")}
                </Link>
              </li>
            </ul>
            <Link className="btn btn-primary" href="/#rezerwacja" onClick={() => setOpen(false)}>
              {t("book")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
