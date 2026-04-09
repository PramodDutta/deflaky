"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-black font-bold text-sm">
            df
          </div>
          <span className="text-xl font-bold tracking-tight">
            De<span className="text-accent">Flaky</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/#features" className="text-muted hover:text-foreground transition">
            Features
          </Link>
          <Link href="/pricing" className="text-muted hover:text-foreground transition">
            Pricing
          </Link>
          <Link href="/docs" className="text-muted hover:text-foreground transition">
            Docs
          </Link>
          <Link href="/blog" className="text-muted hover:text-foreground transition">
            Blog
          </Link>
          <a
            href="https://github.com/PramodDutta/deflaky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition"
          >
            GitHub
          </a>
        </div>

        {/* CTA / User menu */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/settings"
                className="text-sm text-muted hover:text-foreground transition flex items-center gap-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </Link>
              <Link
                href="/dashboard"
                className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition"
              >
                Dashboard
              </Link>
              {/* User avatar dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-card-border hover:border-accent transition cursor-pointer"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {(session?.user?.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-card-border bg-card-bg shadow-xl z-50 py-2">
                      <div className="px-4 py-2 border-b border-card-border">
                        <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                        <p className="text-xs text-muted truncate">{session?.user?.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-card-border/30 transition"
                        onClick={() => setProfileOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-card-border/30 transition"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                      <div className="border-t border-card-border mt-1 pt-1">
                        <button
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition cursor-pointer"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground transition"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-card-border px-6 py-4 space-y-3 bg-background">
          <Link href="/#features" className="block text-muted hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="block text-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="block text-muted hover:text-foreground">
            Docs
          </Link>
          <Link href="/blog" className="block text-muted hover:text-foreground">
            Blog
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard/settings" className="block text-muted hover:text-foreground">
                Settings
              </Link>
              <Link
                href="/dashboard"
                className="block bg-accent text-black font-semibold px-4 py-2 rounded-lg text-center"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-left text-red-400 hover:text-red-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/login"
                className="block bg-accent text-black font-semibold px-4 py-2 rounded-lg text-center"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
