import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import authConfig from "./auth.config";

/**
 * Full Auth.js config (Node runtime only — NOT imported by middleware).
 *
 * Spreads the edge-safe base from auth.config.ts and adds the
 * CredentialsProvider, which needs the db client + bcryptjs and therefore
 * cannot live in the edge bundle.
 */

// Shape of the credentials we accept from the signin form.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Credentials requires JWT sessions (no DB session row is created).
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) return null;

        const ok = await bcryptjs.compare(password, user.passwordHash);
        if (!ok) return null;

        // Returned object becomes `user` in the jwt callback (id → token).
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
