import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireMind - AI Powered Recruitment Platform",
  description: "Helping recruiters hire smarter and candidates discover better opportunities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
