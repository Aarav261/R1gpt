"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 1. Create the account (user row only — no workspace is created here).
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not create account.");
      setSubmitting(false);
      return;
    }

    // 2. Sign the new user in, then land them in the workspace.
    const signinRes = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (signinRes?.error) {
      // Account exists but auto-signin failed — send them to sign in manually.
      router.push(`/signin?email=${encodeURIComponent(email.trim())}`);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="cds-tile p-8">
      <header className="mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-sans text-3xl font-light tracking-[-0.4px] text-ink">
            R1GPT
          </h1>
          <span className="rounded-none border border-hairline bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-ibm-blue">
            Create account
          </span>
        </div>
        <p className="mt-1 font-sans text-sm text-ink-muted">
          Connection Approval Workspace
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle"
          >
            Name <span className="normal-case text-ink-subtle">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
          <p className="mt-1 font-sans text-xs text-ink-subtle">
            At least 8 characters.
          </p>
        </div>

        {error && (
          <p className="rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="cds-btn cds-btn--primary w-full disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 font-sans text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={`/signin${email ? `?email=${encodeURIComponent(email)}` : ""}`}
          className="text-ibm-blue underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
