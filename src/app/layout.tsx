import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Bomb Shelters Bulgaria | Бомбоубежища България",
  description: "Interactive map of bomb shelters in Bulgaria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className={`${inter.className} bg-slate-50 text-slate-700`}>
        {children}
      </body>
    </html>
  );
}
