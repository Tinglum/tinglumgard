'use client';

import { ExtraProductDetails } from '@/components/ExtraProductDetails';
import { X } from 'lucide-react';

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

export function ExtraProductModal({ extra, onClose }: ExtraProductModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white border border-neutral-200 rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] w-full max-w-lg max-h-[85vh] overflow-y-auto pointer-events-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-6 sm:p-8">
            <ExtraProductDetails extra={extra} />
          </div>
        </div>
      </div>
    </>
  );
}
