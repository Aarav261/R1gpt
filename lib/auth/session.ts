import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Server-side session helpers. Usable from Server Components, route handlers,
 * and Server Actions (anything that runs in the Node runtime).
 */

type SessionUser = Session["user"];

/** Returns the current session user, or null if unauthenticated. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Returns the current session user, or redirects to /signin if there is none.
 * Use in protected Server Components / route handlers that require a user.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  return user;
}
