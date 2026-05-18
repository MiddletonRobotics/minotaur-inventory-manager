import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import './globals.css';

const unbounded = Unbounded({ 
  subsets: ['latin'], 
  weight: ['400'],
  variable: '--font-unbounded'
});

export const metadata: Metadata = {
  title: 'MinoManager',
  description: 'Inventory management system for FRC Minotaur 1369',
}

export default function RootLayout({ children } : Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${unbounded.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}