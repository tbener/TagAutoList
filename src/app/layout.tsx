import type { Metadata, Viewport } from "next";
import { Figtree, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { RegisterSW } from "@/components/register-sw";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TagAutoList", template: "%s · TagAutoList" },
  description: "Tasks and lists, powered by tags.",
  applicationName: "TagAutoList",
  appleWebApp: { capable: true, title: "TagAutoList", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceffa" },
    { media: "(prefers-color-scheme: dark)", color: "#090a1f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
