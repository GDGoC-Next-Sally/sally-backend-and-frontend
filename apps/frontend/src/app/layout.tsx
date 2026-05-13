import type { Metadata } from "next";
import "./globals.css";
import { TopNavWrapper } from "@/components/layout/TopNavWrapper";

export const metadata: Metadata = {
  title: "Sally AI Coach",
  description: "AI 기반 맞춤형 코칭 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--color-bg)]">
        <TopNavWrapper />
        {children}
      </body>
    </html>
  );
}
