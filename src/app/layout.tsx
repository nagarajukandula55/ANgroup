import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionGuard from "@/components/session-guard";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AN Group",
  description: "Luxury Enterprise Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionGuard />
        {children}
      </body>
    </html>
  );
}
