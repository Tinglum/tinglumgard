import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BackgroundLayer } from '@/components/BackgroundLayer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tinglum Gård',
  description: 'Ullgris fra Tinglum Gård. Ferdig pakket. Klar for fryseren.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased text-neutral-900">
        <ThemeProvider>
          <LanguageProvider>
            <BackgroundLayer />
            <Header />

            <main className="relative min-h-screen pt-20">
              {children}
            </main>

            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
