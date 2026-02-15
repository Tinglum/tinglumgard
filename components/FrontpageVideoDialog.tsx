'use client';

import { Play } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FrontpageVideoDialogProps {
  className?: string;
}

export function FrontpageVideoDialog({ className }: FrontpageVideoDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 py-4 text-sm font-bold uppercase tracking-wider text-neutral-900 transition-all duration-300 hover:-translate-y-1 hover:bg-neutral-50 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)]',
            className
          )}
        >
          <Play className="h-4 w-4" />
          {t.hero.watchVideo}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl overflow-hidden border-neutral-900 bg-black p-0">
        <video
          className="h-auto max-h-[80vh] w-full bg-black"
          controls
          playsInline
          preload="none"
        >
          <source src="/20260207_153529.mp4" type="video/mp4" />
        </video>
      </DialogContent>
    </Dialog>
  );
}

