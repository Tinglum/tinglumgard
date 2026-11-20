import './globals.css';
import '@/styles/mobile-prismatic.css';
import '@/styles/farm-design.css';
import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { farmDisplay, farmBody } from '@/lib/design/fonts';

export const metadata: Metadata = {
  title: {
    default: 'Tinglum Gård — Ullgris til jul fra Namdalseid',
    template: '%s | Tinglum Gård',
  },
  description:
    'Lokalt kjøtt fra utegående ullgris (Mangalitsa) på Tinglum Gård. Levering i Trondheim 20. desember og langs E6 og i Oslo 21. desember.',
  metadataBase: new URL('https://xn--tinglumgrd-85a.no'),
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    siteName: 'Tinglum Gård',
    title: 'Ullgris til jul fra Tinglum Gård',
    description:
      'Lokalt kjøtt fra utegående Mangalitsa ullgris. Henting på gården, i Trondheim 20. desember, og langs E6 og på Majorstuen i Oslo 21. desember.',
    images: [
      {
        url: '/recipes/norsk-ribbe-uten-svor.png',
        width: 1536,
        height: 1024,
        alt: 'Saftig, langstekt ullgrisribbe fra Tinglum Gård',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ullgris til jul fra Tinglum Gård',
    description:
      'Lokalt kjøtt fra utegående Mangalitsa ullgris. Trondheim 20. desember · E6 og Oslo 21. desember.',
    images: ['/recipes/norsk-ribbe-uten-svor.png'],
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
      <head>
        {/* Fix #2: viewport-fit=cover activates env(safe-area-inset-*) on notched iPhones */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${farmDisplay.variable} ${farmBody.variable} antialiased text-neutral-900`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
