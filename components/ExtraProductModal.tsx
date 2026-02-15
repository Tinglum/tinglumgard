'use client';

import { ExtraProductDetails } from '@/components/ExtraProductDetails';

interface Recipe {
  title_no: string;
  title_en: string;
  description_no: string;
  description_en: string;
  future_slug: string;
}

interface ExtraProductModalProps {
  extra: {
    name_no: string;
    name_en: string;
    description_no?: string | null;
    description_en?: string | null;
    description_premium_no?: string | null;
    description_premium_en?: string | null;
    chef_term_no?: string | null;
    chef_term_en?: string | null;
    recipe_suggestions?: Recipe[] | null;
    preparation_tips_no?: string | null;
    preparation_tips_en?: string | null;
  };
  position: { x: number; y: number };
  onClose: () => void;
}

export function ExtraProductModal({ extra, position, onClose }: ExtraProductModalProps) {
  return (
    <div
      className="fixed z-50 bg-white border border-neutral-200 rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] p-6 max-w-md"
      style={{
        top: Math.min(position.y + 10, typeof window !== 'undefined' ? window.innerHeight - 400 : 400),
        left: Math.max(10, Math.min(position.x - 200, typeof window !== 'undefined' ? window.innerWidth - 420 : 600)),
      }}
      onMouseLeave={onClose}
    >
      <ExtraProductDetails extra={extra} />
    </div>
  );
}
