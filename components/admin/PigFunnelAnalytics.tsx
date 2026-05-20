'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRight, RefreshCw, MessageSquare } from 'lucide-react';

interface FunnelData {
  period: number;
  funnel: {
    browse: number;
    checkout_start: number;
    order_placed: number;
    deposit_paid: number;
  };
  warm_leads: Array<{
    customer_id: string;
    customer_email: string | null;
    visits: number;
    last_seen: string;
  }>;
}

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function conversionPct(from: number, to: number): string {
  if (from === 0) return '—';
  return `${Math.round((to / from) * 100)}%`;
}

export function PigFunnelAnalytics() {
  const { lang } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';

  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(period);
  }, [period]);

  async function load(days: Period) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/pig-funnel?days=${days}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  const copy = {
    title: lang === 'no' ? 'Konverteringstrakt' : 'Conversion Funnel',
    subtitle: lang === 'no' ? 'Gris / Mangalitsa' : 'Pig / Mangalitsa',
    browse: lang === 'no' ? 'Besøkte siden' : 'Visited page',
    checkoutStart: lang === 'no' ? 'Startet bestilling' : 'Started checkout',
    orderPlaced: lang === 'no' ? 'La inn ordre' : 'Placed order',
    depositPaid: lang === 'no' ? 'Betalte depositum' : 'Paid deposit',
    warmLeads: lang === 'no' ? 'Varme leads' : 'Warm leads',
    warmLeadsDesc:
      lang === 'no'
        ? 'Besøkte /bestill uten å legge inn ordre'
        : 'Visited /bestill without placing an order',
    email: lang === 'no' ? 'E-post' : 'Email',
    visits: lang === 'no' ? 'Besøk' : 'Visits',
    lastSeen: lang === 'no' ? 'Sist sett' : 'Last seen',
    actions: lang === 'no' ? 'Handling' : 'Actions',
    sendMessage: lang === 'no' ? 'Send melding' : 'Send message',
    noLeads: lang === 'no' ? 'Ingen varme leads denne perioden.' : 'No warm leads this period.',
    conversion: lang === 'no' ? 'Konv.' : 'Conv.',
    customers: lang === 'no' ? 'kunder' : 'customers',
    refresh: lang === 'no' ? 'Oppdater' : 'Refresh',
  };

  const steps = data
    ? [
        { label: copy.browse, count: data.funnel.browse, convFrom: null },
        {
          label: copy.checkoutStart,
          count: data.funnel.checkout_start,
          convFrom: data.funnel.browse,
        },
        {
          label: copy.orderPlaced,
          count: data.funnel.order_placed,
          convFrom: data.funnel.checkout_start,
        },
        {
          label: copy.depositPaid,
          count: data.funnel.deposit_paid,
          convFrom: data.funnel.order_placed,
        },
      ]
    : [];

  const maxCount = steps.length > 0 ? Math.max(...steps.map((s) => s.count), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-neutral-900">{copy.title}</h2>
          <p className="text-sm text-neutral-500 mt-1">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Period selector */}
          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button
            onClick={() => load(period)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {copy.refresh}
          </button>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch gap-0">
            {steps.map((step, i) => {
              const barWidth = maxCount > 0 ? Math.max(8, Math.round((step.count / maxCount) * 100)) : 8;
              const isLast = i === steps.length - 1;
              return (
                <div key={step.label} className="flex items-center flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2 px-3 py-4">
                      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide truncate">
                        {step.label}
                      </p>
                      <p className="text-3xl font-light text-neutral-900 tabular-nums">
                        {step.count}
                      </p>
                      <p className="text-xs text-neutral-400">{copy.customers}</p>
                      {/* Bar */}
                      <div className="h-1.5 rounded-full bg-neutral-100 mt-3">
                        <div
                          className="h-1.5 rounded-full bg-neutral-900 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {/* Conversion */}
                      {step.convFrom !== null && (
                        <p className="text-xs font-semibold text-neutral-500 mt-1">
                          {copy.conversion} {conversionPct(step.convFrom, step.count)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isLast && (
                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warm leads */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-base font-medium text-neutral-900">{copy.warmLeads}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{copy.warmLeadsDesc}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        ) : !data || data.warm_leads.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-neutral-400">{copy.noLeads}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {copy.email}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {copy.visits}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {copy.lastSeen}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {copy.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {data.warm_leads.map((lead) => (
                  <tr key={lead.customer_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3 text-neutral-700 font-medium truncate max-w-[220px]">
                      {lead.customer_email ?? (
                        <span className="text-neutral-400 italic">unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-900 tabular-nums">{lead.visits}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(lead.last_seen).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          window.location.href = '/admin?tab=customers&subTab=messages';
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {copy.sendMessage}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
