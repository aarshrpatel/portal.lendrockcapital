import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lendrock Capital — Deal OS",
  description: "Deal operating system: intake to payoff across four lending pathways.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
