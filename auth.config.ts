import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base Auth.js config (Auth.js split-config pattern).
 *
 * This file is imported by middleware.ts, which runs in the Edge runtime.
 * It MUST NOT import the db client, bcryptjs, or any Node-only module — the
 * `providers` array is intentionally empty here. The full CredentialsProvider
 * (which needs db + bcrypt) lives in auth.ts, used only by the Node runtime.
 *
 * The callbacks below read/write only the JWT, so they are edge-safe.
 */

// Public routes that never require a session. Everything else is gated.
const PUBLIC_PREFIXES = ["/signin", "/signup", "/invite"];

const authConfig = {
  pages: {
    signIn: "/signin",
  },
  // No providers here — added in auth.ts so the edge bundle stays db/bcrypt-free.
  providers: [],
  callbacks: {
    /**
     * Gate access. Returning false (or a Response) from `authorized` blocks the
     * request; NextAuth then redirects unauthenticated users to `pages.signIn`.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic = PUBLIC_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );

      // Already-authenticated users shouldn't sit on signin/signup.
      if (isLoggedIn && (pathname === "/signin" || pathname === "/signup")) {
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isPublic) return true;

      // Protected route → require a session (false triggers signIn redirect).
      return isLoggedIn;
    },

    /** Persist the user id onto the token at sign-in time. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /** Expose the user id from the token on the session. */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
