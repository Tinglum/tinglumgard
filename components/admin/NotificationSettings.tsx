'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Preference {
  phone: string;
  email: string | null;
  order_updates: boolean;
  marketing: boolean;
  sms: boolean;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/preferences');
      if (res.ok) {
        const data = await res.json();
        setPrefs(Array.isArray(data) ? data : data.preferences ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = search
    ? prefs.filter(
        (p) =>
          p.phone.includes(search) ||
          (p.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : prefs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-neutral-900">Varslingsinnstillinger</h2>
          <p className="text-sm font-light text-neutral-500 mt-1">
            Oversikt over kunders samtykker og varslingsvalg.
          </p>
        </div>
        <Button variant="outline" onClick={load}>Oppdater</Button>
      </div>

      <input
        type="text"
        placeholder="Søk telefon eller e-post..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2 border border-neutral-200 rounded-xl text-sm"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-neutral-500">Ingen varslingsdata funnet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">E-post</th>
                <th className="px-4 py-3 text-center text-xs font-light text-neutral-500">Ordrevarsler</th>
                <th className="px-4 py-3 text-center text-xs font-light text-neutral-500">Markedsføring</th>
                <th className="px-4 py-3 text-center text-xs font-light text-neutral-500">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.phone} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-neutral-700">{p.phone}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{p.email ?? '–'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${p.order_updates ? 'text-green-700' : 'text-neutral-400'}`}>
                      {p.order_updates ? '✓' : '–'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${p.marketing ? 'text-green-700' : 'text-neutral-400'}`}>
                      {p.marketing ? '✓' : '–'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${p.sms ? 'text-green-700' : 'text-neutral-400'}`}>
                      {p.sms ? '✓' : '–'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
