import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Ezra Vale — Photographer",
  description:
    "Portrait, editorial, and brand photography by Ezra Vale, working between Lisbon and São Paulo.",
  openGraph: {
    title: "Ezra Vale — Photographer",
    description:
      "Portrait, editorial, and brand photography by Ezra Vale, working between Lisbon and São Paulo.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ezra Vale — Photographer",
    description:
      "Portrait, editorial, and brand photography by Ezra Vale, working between Lisbon and São Paulo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
