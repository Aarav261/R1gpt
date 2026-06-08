"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client-side providers wrapper. Hosts the Auth.js SessionProvider so
 * next-auth/react hooks (useSession, signIn, signOut) work in client
 * components. Rendered once in app/layout.tsx around {children}.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
