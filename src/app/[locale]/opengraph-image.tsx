import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";

/**
 * Obrazek pokazywany przy udostępnianiu linku (LinkedIn, Slack, Messenger).
 *
 * Generowany, a nie wgrany jako plik, bo treść zależy od języka i musi zostać
 * spójna z tekstami na stronie. Kroje wczytujemy z `src/fonts/*.woff` -
 * Satori nie obsługuje woff2, którym serwujemy stronę.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Sélene Hair Studio";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  const katalog = path.join(process.cwd(), "src", "fonts");
  const [bodoni, archivo, logo] = await Promise.all([
    readFile(path.join(katalog, "og-bodoni.woff")),
    readFile(path.join(katalog, "og-archivo.woff")),
    readFile(path.join(process.cwd(), "public", "logo.png")),
  ]);

  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1a1216",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Poświata w kolorze marki - ten sam gradient co w sekcji hero. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -160,
            width: 780,
            height: 780,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(242,85,127,0.34) 0%, rgba(242,85,127,0.10) 38%, rgba(242,85,127,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "Bodoni",
                fontSize: 40,
                color: "#f0e7ea",
                letterSpacing: 10,
                lineHeight: 1,
              }}
            >
              SÉLENE
            </div>
            <div
              style={{
                fontFamily: "Archivo",
                fontSize: 15,
                color: "#b0a0a7",
                letterSpacing: 8,
                marginTop: 8,
              }}
            >
              HAIR STUDIO
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Bodoni",
              fontSize: 76,
              color: "#f0e7ea",
              lineHeight: 1.1,
              maxWidth: 900,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {t("headline")}&nbsp;
            <span style={{ color: "#f2557f", fontStyle: "italic" }}>{t("headlineAccent")}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: "Archivo",
            fontSize: 22,
            color: "#b0a0a7",
            letterSpacing: 3,
          }}
        >
          <div style={{ width: 56, height: 2, background: "#9e1240" }} />
          {t("eyebrow")}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bodoni", data: bodoni, style: "normal", weight: 500 },
        { name: "Archivo", data: archivo, style: "normal", weight: 600 },
      ],
    },
  );
}
