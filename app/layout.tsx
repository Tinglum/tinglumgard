import './globals.css';
import '@/styles/mobile-prismatic.css';
import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BackgroundLayer } from '@/components/BackgroundLayer';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: {
    default: 'Tinglum Gård — Mangalitsa & Rugeegg fra Namdal',
    template: '%s | Tinglum Gård',
  },
  description:
    'Bestill Mangalitsa ullgris-bokser og rugeegg direkte fra Tinglum Gård i Namdal. Ferdig pakket, klar for fryseren. Levering i Trøndelag.',
  metadataBase: new URL('https://tinglumgard.no'),
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    siteName: 'Tinglum Gård',
    title: 'Tinglum Gård — Mangalitsa & Rugeegg fra Namdal',
    description:
      'Bestill Mangalitsa ullgris-bokser og rugeegg direkte fra Tinglum Gård i Namdal. Ferdig pakket, klar for fryseren.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="antialiased text-neutral-900">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <BackgroundLayer />
              <Header />

              <main className="relative min-h-screen pt-20">
                {children}
              </main>

              <Footer />
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
