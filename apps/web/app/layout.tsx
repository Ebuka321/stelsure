import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StelSure",
  description: "Stellar-focused crop coverage with automated smart contract distribution.",
  openGraph: {
    title: "StelSure",
    description: "Stellar-focused crop coverage with automated smart contract distribution.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
