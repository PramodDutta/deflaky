"use client";

import { useEffect, useState } from "react";

const BANNER_KEY = "deflaky_banner_aitester_v1";
const COURSE_URL =
  "https://class.thetestingacademy.com/ai-powered-testing-mastery";

export function TopBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(BANNER_KEY);
    setDismissed(stored === "dismissed");
  }, []);

  function close() {
    localStorage.setItem(BANNER_KEY, "dismissed");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-3 flex-wrap justify-center text-sm">
        {/* LIVE pill */}
        <span className="inline-flex items-center gap-1.5 bg-red-500 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          Live
        </span>

        {/* Course name */}
        <span className="font-semibold whitespace-nowrap">
          🚀 AI Tester Blueprint
        </span>

        {/* Pill */}
        <span className="hidden md:inline-flex bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap">
          New Batch Launching
        </span>

        {/* Date */}
        <span className="hidden lg:inline whitespace-nowrap opacity-90">
          New Batch • 17 May 2026, 11:00 AM to 12:45 PM IST
        </span>

        {/* Price */}
        <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="line-through opacity-60 text-xs">₹35,000</span>
          <span className="font-bold">₹9,999</span>
          <span className="bg-green-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
            33% OFF
          </span>
        </span>

        {/* Code */}
        <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
          ⚡ Code:
          <span className="bg-yellow-400 text-purple-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">
            AITESTER
          </span>
        </span>

        {/* CTA */}
        <a
          href={COURSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-white text-purple-700 hover:bg-purple-50 transition px-3 py-1 rounded-md font-bold text-xs whitespace-nowrap"
        >
          🚀 Join
        </a>
      </div>

      {/* Close */}
      <button
        onClick={close}
        aria-label="Dismiss banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
