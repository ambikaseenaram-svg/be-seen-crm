import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BE SEEN · CRM",
  description: "CRM de prospection BE SEEN",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
