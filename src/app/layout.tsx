import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "EventTick – Discover & Buy Event Tickets",
  description:
    "Cross-platform event ticketing with Mobile Money, QR passes, and automated organizer payouts.",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} EventTick. Built for Tanzania & East Africa.</p>
            <p className="mt-1">Mobile Money • QR Tickets • Instant Payouts</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
