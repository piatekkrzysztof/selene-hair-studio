import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

const intlMiddleware = createMiddleware(routing);

/**
 * Dwie ścieżki, dwie odpowiedzialności:
 *  - /panel  - narzędzie salonu, jeden język, wymaga sesji,
 *  - reszta  - strona publiczna, obsługiwana przez next-intl.
 *
 * Panel obsługujemy przed next-intl, inaczej middleware językowy
 * przekierowałby /panel na /pl/panel.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/panel" || pathname.startsWith("/panel/")) {
    if (pathname.startsWith("/panel/login")) return NextResponse.next();

    const subject = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      process.env.SESSION_SECRET ?? "",
    );

    if (!subject) {
      const url = request.nextUrl.clone();
      url.pathname = "/panel/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Pomijamy API, zasoby Next i pliki statyczne - middleware nie ma tam nic do roboty.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
