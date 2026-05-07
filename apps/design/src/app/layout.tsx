import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sally — Design',
  description: 'Static design preview — mock data only',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F5F4F0]">
        {children}
      </body>
    </html>
  );
}
