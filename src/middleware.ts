import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Pomijamy API, zasoby Next i pliki statyczne - middleware językowy
  // nie ma tam nic do roboty, a każde zbędne wywołanie kosztuje.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
