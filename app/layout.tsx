import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quietly Does It — A Social Stealth Game',
  description:
    'A gentle isometric game about navigating everyday social spaces and honoring your limits.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
