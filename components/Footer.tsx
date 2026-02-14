"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

export function Footer() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  async function handleWaitlistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || t.checkout.somethingWentWrong);
      }

      setJoined(true);
      setEmail("");
      setName("");
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error?.message || t.checkout.somethingWentWrong,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="relative overflow-hidden bg-neutral-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl bg-neutral-200" />
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl bg-neutral-100" />
      </div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-900 text-white font-bold">
                TG
              </div>
              <div>
                <h3 className="text-xl font-light text-neutral-900">{t.footer.farm}</h3>
                <p className="text-sm font-light text-neutral-500">{t.footer.quality}</p>
              </div>
            </div>
            <p className="text-sm font-light leading-relaxed max-w-md text-neutral-600">
              {t.footer.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-full text-xs font-light bg-white text-neutral-700 border border-neutral-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {t.footer.localRaised}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-light bg-white text-neutral-700 border border-neutral-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {t.footer.seasonBased}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              {t.footer.contact}
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:post@tinglum.com"
                className="flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                post@tinglum.com
              </a>
            </div>

              <div className="pt-3 border-t border-neutral-200">
                <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-3">
                {t.productCard.nextSeasonWaitlistTitle}
                </h4>
                {joined ? (
                  <p className="text-sm text-emerald-700">{t.productCard.waitlistSuccess}</p>
                ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t.productCard.emailPlaceholder}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t.productCard.namePlaceholder}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
                  >
                    {submitting ? t.common.processing : t.productCard.submitWaitlist}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              {t.footer.links}
            </h3>
            <div className="space-y-3">
              <a
                href="/produkt"
                className="block text-sm font-light text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {t.footer.productInfo}
              </a>
              <a
                href="/oppdelingsplan"
                className="block text-sm font-light text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {t.nav.oppdelingsplan}
              </a>
              <a
                href="/min-side"
                className="block text-sm font-light text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {t.footer.myPage}
              </a>
            </div>
          </div>
        </div>

        <div className="relative pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm font-light text-neutral-600">
                {"\u00A9"} 2026 {t.footer.farm}. {t.footer.rights}
              </p>
              <a
                href="/vilkar"
                className="text-sm font-light underline text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {t.footer.legal}
              </a>
            </div>
            <div className="flex items-center gap-6 text-xs font-light text-neutral-600">
              <span>{lang === "en" ? "Norwegian quality" : "Norsk kvalitet"}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-400" />
              <span>{t.footer.season}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
