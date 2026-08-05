import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";
import { FocusProvider } from "@/components/focus-context";
import { CurrentUserProvider } from "@/components/current-user-provider";
import { AppAccessGate } from "@/components/app-access-gate";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

import Script from "next/script";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Hinthar — School Management Dashboard"
const description =
  "Manage classes, students, teachers, sessions, and attendance in one place. Built for schools and education centres."
const ogImage = "/opengraph-image"
const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

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
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('theme');
                var preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (preferred === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="h-full flex flex-col bg-background text-foreground overflow-hidden" suppressHydrationWarning>
        <FocusProvider>
          <ThemeProvider>
            <ClerkThemeProvider>
              <CurrentUserProvider>
                <TooltipProvider>
                  <SidebarProvider defaultOpen={true} className="h-full w-full overflow-hidden">
                    <AppSidebar />
                    <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      <SiteHeader />
                      <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                        <AppAccessGate>{children}</AppAccessGate>
                      </main>
                    </SidebarInset>
                  </SidebarProvider>
                </TooltipProvider>
              </CurrentUserProvider>
            </ClerkThemeProvider>
          </ThemeProvider>
        </FocusProvider>
      </body>
    </html>
  );
}
