import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/register-sw";

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
    { media: "(prefers-color-scheme: light)", color: "#faf4e8" },
    { media: "(prefers-color-scheme: dark)", color: "#111a2c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
