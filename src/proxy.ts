// Next.js 16 "proxy" convention (replaces the deprecated middleware.ts file).
// Handles locale negotiation/redirects for /fr, /en and /ar via next-intl.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except api, static files, _next internals.
  matcher: ["/", "/(fr|en|ar)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"]
};
