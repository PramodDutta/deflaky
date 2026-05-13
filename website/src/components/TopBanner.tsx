"use client";

import { useEffect, useState } from "react";

const BANNER_KEY = "deflaky_banner_courses_v1";

type Course = {
  id: string;
  emoji: string;
  name: string;
  pill: string;
  batch: string;
  oldPrice: string;
  newPrice: string;
  discount: string;
  code: string;
  url: string;
};

const COURSES: Course[] = [
  {
    id: "aitester",
    emoji: "🚀",
    name: "AI Tester Blueprint",
    pill: "New Batch Launching",
    batch: "17 May 2026, 11:00 AM to 12:45 PM IST",
    oldPrice: "₹35,000",
    newPrice: "₹9,999",
    discount: "33% OFF",
    code: "AITESTER",
    url: "https://class.thetestingacademy.com/ai-powered-testing-mastery",
  },
  {
    id: "playwright",
    emoji: "🎭",
    name: "Playwright Automation Mastery",
    pill: "90-Day Cohort",
    batch: "Starts 4 May 2026 • Mon/Wed/Fri • 7:00–8:15 AM IST",
    oldPrice: "",
    newPrice: "Up to 10% OFF",
    discount: "",
    code: "PROMODE",
    url: "https://class.thetestingacademy.com/playwright-automation-mastery-course",
  },
];

export function TopBanner() {
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(BANNER_KEY);
    if (stored === "dismissed") return;
    // Random pick per page load
    const pick = COURSES[Math.floor(Math.random() * COURSES.length)];
    setCourse(pick);
  }, []);

  function close() {
    localStorage.setItem(BANNER_KEY, "dismissed");
    setCourse(null);
  }

  if (!course) return null;

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
          {course.emoji} {course.name}
        </span>

        {/* Pill */}
        <span className="hidden md:inline-flex bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap">
          {course.pill}
        </span>

        {/* Batch */}
        <span className="hidden lg:inline whitespace-nowrap opacity-90">
          {course.batch}
        </span>

        {/* Price */}
        <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
          {course.oldPrice && (
            <span className="line-through opacity-60 text-xs">{course.oldPrice}</span>
          )}
          <span className="font-bold">{course.newPrice}</span>
          {course.discount && (
            <span className="bg-green-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
              {course.discount}
            </span>
          )}
        </span>

        {/* Code */}
        <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
          ⚡ Code:
          <span className="bg-yellow-400 text-purple-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs">
            {course.code}
          </span>
        </span>

        {/* CTA */}
        <a
          href={course.url}
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
