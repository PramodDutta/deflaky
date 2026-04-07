"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <a
            href="https://github.com/user/deflaky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition"
          >
            GitHub
          </a>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition"
          >
            Dashboard
          </Link>
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
          <Link
            href="/dashboard"
            className="block bg-accent text-black font-semibold px-4 py-2 rounded-lg text-center"
          >
            Dashboard
          </Link>
        </div>
      )}
    </nav>
  );
}
