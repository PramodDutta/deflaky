import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { JsonLd } from "@/components/schema/JsonLd";
import {
  organizationSchema,
  webSiteSchema,
} from "@/components/schema/homepage-schema";

const GA_MEASUREMENT_ID = "G-XCPRX7Z258";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeFlaky — Detect & Fix Flaky Tests",
  description:
    "Open-source CLI + Dashboard to detect, track, and eliminate flaky tests. Works with Playwright, Selenium, Cypress, Jest, Pytest and more.",
  keywords: [
    "flaky tests",
    "test automation",
    "playwright",
    "selenium",
    "cypress",
    "test reliability",
    "CI/CD",
    "deflaky",
  ],
  metadataBase: new URL("https://deflaky.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DeFlaky — Detect & Fix Flaky Tests",
    description:
      "Open-source CLI + Dashboard to detect, track, and eliminate flaky tests. Works with Playwright, Selenium, Cypress, Jest, Pytest and more.",
    url: "https://deflaky.com",
    siteName: "DeFlaky",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeFlaky — Detect & Fix Flaky Tests",
    description:
      "Open-source CLI + Dashboard to detect, track, and eliminate flaky tests. Works with Playwright, Selenium, Cypress, Jest, Pytest and more.",
  },
  other: {
    "theme-color": "#0f172a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <JsonLd data={organizationSchema} />
        <JsonLd data={webSiteSchema} />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
