import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hedge Sniper — AI-found Polymarket hedges",
  description:
    "Type one sentence; AI finds correlated Polymarket markets with positive expected return and signs both legs in one transaction via the AOMI on-chain agent runtime.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
