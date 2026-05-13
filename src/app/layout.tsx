import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AN Group OS",
  description: "Enterprise Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
