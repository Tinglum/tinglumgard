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
  title: 'Tinglum Gård',
  description: 'Ullgris fra Tinglum Gård. Ferdig pakket. Klar for fryseren.',
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
