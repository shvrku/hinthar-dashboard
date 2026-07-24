import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";
import { FocusProvider } from "@/components/focus-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { PageTransition } from "@/components/page-transition";
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

export const metadata: Metadata = {
  title: "Hinthar",
  description: "Management platform for classes, students, teachers, sessions, and attendance.",
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
              <TooltipProvider>
                <SidebarProvider defaultOpen={true} className="h-full w-full overflow-hidden">
                  <AppSidebar />
                  <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <SiteHeader />
                    <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                      <PageTransition>{children}</PageTransition>
                    </main>
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
            </ClerkThemeProvider>
          </ThemeProvider>
        </FocusProvider>
      </body>
    </html>
  );
}
