import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { PwaRegistrar } from "@/components/mealflo/pwa-registrar";
import { appConfig } from "@/lib/config/app";

import "./globals.css";

const outfit = localFont({
  src: "../../design/fonts/Outfit-VariableFont_wght.ttf",
  display: "swap",
  variable: "--font-outfit",
});

const dmSans = localFont({
  src: [
    {
      path: "../../design/fonts/DMSans-VariableFont_opsz_wght.ttf",
      style: "normal",
    },
    {
      path: "../../design/fonts/DMSans-Italic-VariableFont_opsz_wght.ttf",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.appUrl),
  title: {
    default: "mealflo",
    template: "%s | mealflo",
  },
  description: "Volunteer-led food delivery operations demo.",
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#fae278",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} h-full`}>
      <body className="bg-bg text-ink min-h-full font-sans antialiased">
        <a
          href="#main-content"
          className="text-ink sr-only fixed top-4 left-4 z-[100] rounded-full bg-white px-4 py-2 text-sm font-medium shadow-[var(--mf-shadow-elevated)] focus:not-sr-only focus:outline-none"
        >
          Skip to main content
        </a>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
