import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yamaha · Help Desk — Painel UCCX",
  description: "Painel operacional do Contact Center Yamaha (Cisco UCCX).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
