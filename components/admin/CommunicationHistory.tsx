'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface EmailRecord {
  id: string;
  to_email: string;
  subject: string;
  classification: string;
  sent_at: string | null;
  status: string;
}

export function CommunicationHistory() {
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/communication/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.history) ? data.history : Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-light text-neutral-700">E-posthistorikk</h3>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Oppdater
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-neutral-500">Ingen e-poster registrert ennå.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Til</th>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Emne</th>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-light text-neutral-500">Tidspunkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-neutral-700">{r.to_email}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700 max-w-xs truncate">{r.subject}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{r.classification}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      r.status === 'sent' ? 'bg-green-100 text-green-800' :
                      r.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-neutral-100 text-neutral-600'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString('nb-NO') : '–'}
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
