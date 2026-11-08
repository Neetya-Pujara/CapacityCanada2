import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const interfaceFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-interface",
  display: "swap",
});

const editorialFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Capacity Connect — Grow the good you do",
  description:
    "A clearer path to stronger nonprofit organizations. Discover the support, tools, and people to move your mission forward.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${interfaceFont.variable} ${editorialFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
