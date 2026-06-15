import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import './globals.css';

const bricolage = Bricolage_Grotesque({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-bricolage'
});

export const metadata: Metadata = {
  title: 'MinoManager',
  description: 'Inventory management system for FRC Minotaur 1369',
}

export default function RootLayout({ children } : Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}