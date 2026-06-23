import type { Metadata } from "next";
import { Newsreader, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-guj",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Setu — Loan Advisory OS",
  description:
    "Staff-first loan advisor operating system: intake, pipeline, documents, and follow-up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${notoGujarati.variable}`}>
      <body>
        <div className="min-h-screen bg-page text-ink">
          <TopNav />
          <main className="mx-auto max-w-shell px-6 pb-24 pt-[26px]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
