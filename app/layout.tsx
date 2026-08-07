import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionPreferenceProvider } from "@/components/motion-preference-provider";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";
import { FocusProvider } from "@/components/focus-context";
import { CurrentUserProvider } from "@/components/current-user-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import Script from "next/script";

/** Must remain a static string — never interpolate request/user input (SEC-L5). */
const THEME_INIT_SCRIPT = `
try {
  var stored = localStorage.getItem('theme');
  var preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (preferred === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {}
`;

/** Must remain a static string — never interpolate request/user input (SEC-L5). */
const MOTION_INIT_SCRIPT = `
try {
  var storedMotion = localStorage.getItem('reduced-motion');
  var reduced = storedMotion === 'true'
    ? true
    : storedMotion === 'false'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.setAttribute('data-reduced-motion', reduced ? 'true' : 'false');
} catch (e) {}
`;

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Hinthar — School Management Dashboard";
const description =
  "Manage classes, students, teachers, sessions, and attendance in one place. Built for schools and education centres.";
const ogImage = "/opengraph-image";
const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Hinthar",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Hinthar Dashboard" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
  appleWebApp: { title: "Hinthar" },
  applicationName: "Hinthar",
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full overflow-hidden",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Script
          id="motion-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: MOTION_INIT_SCRIPT }}
        />
      </head>
      <body className="h-full flex flex-col bg-background text-foreground overflow-hidden" suppressHydrationWarning>
        <FocusProvider>
          <ThemeProvider>
            <MotionPreferenceProvider>
              <ClerkThemeProvider>
                <CurrentUserProvider>
                  <TooltipProvider>{children}</TooltipProvider>
                </CurrentUserProvider>
              </ClerkThemeProvider>
            </MotionPreferenceProvider>
          </ThemeProvider>
        </FocusProvider>
      </body>
    </html>
  );
}
