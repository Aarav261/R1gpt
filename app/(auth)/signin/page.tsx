"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // redirect:false → handle the result ourselves so we can show errors.
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setSubmitting(false);
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
            Sign in
          </span>
        </div>
        <p className="mt-1 font-sans text-sm text-ink-muted">
          Connection Approval Workspace
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
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
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 font-sans text-sm text-ink-muted">
        No account?{" "}
        <Link
          href={`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`}
          className="text-ibm-blue underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
