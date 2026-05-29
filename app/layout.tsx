import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DefendableDash · The Office",
  description:
    "Enterprise visibility for the Defendable ecosystem. Every run, the math re-derived; every receipt, hash-chain verified. The AI blackbox trust-me-bro days are over.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
