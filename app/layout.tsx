import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yamaha · Central de Operações — Help Desk",
  description: "Telemetria operacional do Contact Center Yamaha (Cisco UCCX).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
