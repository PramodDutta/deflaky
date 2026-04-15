import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign Up — DeFlaky",
  description: "Create your free DeFlaky account. 15-day Pro trial included.",
  robots: { index: true, follow: true },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl || "/dashboard");
  }

  const callbackUrl = params.callbackUrl || "/dashboard";

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
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted mt-1">
            15-day Pro trial included. No credit card required.
          </p>
        </div>

        <SignupForm callbackUrl={callbackUrl} />

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-accent hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
