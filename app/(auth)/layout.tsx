/**
 * Minimal centered shell for the auth screens (signin / signup).
 * Matches the Carbon Gray 100 dark canvas; the form tiles supply the chrome.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[400px]">{children}</div>
    </main>
  );
}
