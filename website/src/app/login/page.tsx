import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

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
                : error === "CredentialsSignin"
                  ? "Invalid email or password."
                  : "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        <LoginForm callbackUrl={callbackUrl} />

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-accent hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
