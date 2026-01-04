import type { Metadata, Viewport } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "VibeCar - Valutazione Auto Usate",
  description: "Scopri il valore della tua auto usata in pochi secondi. Valutazione gratuita basata su annunci reali del mercato italiano.",
  keywords: ["valutazione auto", "auto usate", "prezzo auto", "quotazione auto", "vendere auto"],
  openGraph: {
    title: "VibeCar - Quanto vale la tua auto?",
    description: "Valutazione gratuita basata su annunci reali del mercato italiano.",
    type: "website",
    locale: "it_IT",
  },
};

// Script to set theme before hydration (prevents flash and hydration mismatch)
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('vibecar-theme');
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else if (!theme && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'vibecar.it';

  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Plausible Analytics - Privacy-friendly, no cookies */}
        <script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className={`${outfit.variable} ${dmSans.variable} antialiased`}>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
