import type { Metadata } from "next";
import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In — DeFlaky",
  description: "Sign in to your DeFlaky dashboard to track and eliminate flaky tests.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // If already logged in, redirect to dashboard
  if (session?.user) {
    redirect(params.callbackUrl || "/dashboard");
  }

  const callbackUrl = params.callbackUrl || "/dashboard";
  const error = params.error;

  return (
    <div className="grid-bg min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-black font-bold">
              df
            </div>
          </div>
          <h1 className="text-2xl font-bold">Sign in to DeFlaky</h1>
          <p className="text-sm text-muted mt-1">Track and eliminate flaky tests</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-sm text-red-400">
              {error === "OAuthAccountNotLinked"
                ? "This email is already associated with another sign-in method."
                : "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-card-border bg-card-bg p-8">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 border border-card-border rounded-lg py-2.5 text-sm font-medium hover:bg-card-border/30 transition cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </form>
            {/* Google OAuth — coming soon
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 border border-card-border rounded-lg py-2.5 text-sm font-medium hover:bg-card-border/30 transition cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </form>
            */}
          </div>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-card-border">
            <p className="text-xs text-muted text-center leading-relaxed">
              By signing in, you agree to our{" "}
              <Link href="/docs" className="text-accent hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/docs" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-6">
          Free to get started. No credit card required.
        </p>
      </div>
    </div>
  );
}
