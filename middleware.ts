import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Edge middleware that gates every request through the Auth.js `authorized`
 * callback in auth.config.ts.
 *
 * We build a *separate* NextAuth instance from the edge-safe base config (no
 * providers, no db, no bcrypt) and export its `auth` wrapper as the middleware.
 * The full config in auth.ts is never imported here, keeping the edge bundle
 * Node-free.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Run on everything except Next internals and static assets. Public-route
   * logic (signin/signup/invite, /api/auth/*) is handled in the `authorized`
   * callback so it stays in one place.
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
