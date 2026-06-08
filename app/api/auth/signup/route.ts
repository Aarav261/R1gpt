import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * POST /api/auth/signup
 *
 * Creates a user row only — it does NOT create a workspace. New users land on
 * the root resolver which routes them to /onboarding (where they create their
 * first workspace) unless they signed up via an invite. Does NOT create a
 * session — the client calls signIn() afterwards.
 */

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;

  // Reject duplicate email up front.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcryptjs.hash(parsed.data.password, 10);

  await db.insert(users).values({ email, passwordHash, name: name ?? null });

  return NextResponse.json({ ok: true }, { status: 201 });
}
