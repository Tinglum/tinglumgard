"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { GlassCard } from './GlassCard';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  title: string;
  price: number;
  depositLabel: string;
  remainderLabel: string;
  boxesLeft: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  href: string;
}

export function ProductCard({ title, price, depositLabel, remainderLabel, boxesLeft, isLowStock, isSoldOut, href }: ProductCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showWaitlistDialog, setShowWaitlistDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const totalBoxes = 50;
  const availabilityRatio = totalBoxes > 0 ? Math.min(1, boxesLeft / totalBoxes) : 0;
  const availabilitySegments = 10;
  const availabilityFilled = Math.round(availabilityRatio * availabilitySegments);
  const availabilityFillClass = isSoldOut
    ? 'bg-white/20'
    : isLowStock
      ? 'bg-amber-300/80'
      : 'bg-white/80';
  const availabilityEmptyClass = 'bg-white/10';

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setShowWaitlistDialog(false);
          setSubmitted(false);
          setEmail('');
          setName('');
        }, 2000);
      } else {
        const data = await response.json();
        toast({
          title: 'Feil',
          description: data.error || 'Noe gikk galt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Waitlist error:', error);
      toast({
        title: 'Feil',
        description: 'Noe gikk galt. Vennligst prøv igjen.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const depositAmount = price / 2;
  const remainderAmount = price / 2;

  return (
    <GlassCard
      className={`group relative p-8 ${isSoldOut ? 'opacity-50' : ''}`}
      hover={!isSoldOut}
    >
      <div className="absolute top-6 right-6">
        {isSoldOut ? (
          <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
            {t.product.soldOut}
          </span>
        ) : isLowStock ? (
          <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {t.product.lowStock}
          </span>
        ) : null}
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-2xl font-medium text-white tracking-tight">
            {title}
          </h3>
        </div>

        <div className="space-y-4 py-6 border-t border-white/10">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-[var(--text-secondary)]">Total pris</span>
            <span className="text-3xl font-medium text-white">kr {price}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-[var(--text-secondary)]">{depositLabel}</span>
            <span className="text-[var(--text-secondary)]">kr {depositAmount}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-[var(--text-secondary)]">{remainderLabel}</span>
            <span className="text-[var(--text-secondary)]">kr {remainderAmount}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
              <span>{t.availability.title}</span>
              <span>
                {isSoldOut ? t.product.soldOut : isLowStock ? t.product.lowStock : t.availability.boxesAvailable}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-medium text-white tabular-nums">{boxesLeft}</span>
              <span className="text-xs text-[var(--text-secondary)]">{t.availability.boxesAvailable}</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: availabilitySegments }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full ${index < availabilityFilled ? availabilityFillClass : availabilityEmptyClass}`}
                />
              ))}
            </div>
          </div>
          {isSoldOut ? (
            <button
              onClick={() => setShowWaitlistDialog(true)}
              className="w-full px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-300 border border-white/20"
            >
              {t.product.joinWaitlist}
            </button>
          ) : (
            <a
              href={href}
              className="block w-full px-6 py-4 rounded-full bg-white text-[var(--bg)] text-center text-sm font-medium hover:bg-[var(--accent)] transition-all duration-300 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            >
              {t.product.orderNow}
            </a>
          )}
        </div>
      </div>

      <Dialog open={showWaitlistDialog} onOpenChange={setShowWaitlistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skriv deg på venteliste</DialogTitle>
            <DialogDescription>
              Vi varsler deg når vi har mer på lager.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <p className="text-green-600 font-medium">Takk! Du er nå på ventelisten.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-post *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="din@epost.no"
                />
              </div>
              <div>
                <Label htmlFor="name">Navn (valgfritt)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt navn"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Sender...' : 'Meld meg på'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
