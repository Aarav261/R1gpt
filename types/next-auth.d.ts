import type { DefaultSession } from "next-auth";

/**
 * Module augmentation: add `id` to the session user and the JWT so our
 * callbacks in auth.config.ts are fully typed (no `any`).
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

// The JWT interface is declared in @auth/core/jwt and re-exported by
// next-auth/jwt; augment the source too so the callback `token` is typed.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
  }
}
