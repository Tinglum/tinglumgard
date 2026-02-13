'use client';

interface CutInfo {
  name: string;
  description: string;
  inBox: string[];
  extraOrder: string[];
  weight: string;
  preparation: string;
  premiumNote: string;
  ribbeOptions?: Array<{
    title: string;
    subtitle: string;
    points: string[];
    premium: boolean;
  }>;
}

interface MangalitsaCutInfoProps {
  cutInfo: CutInfo;
  labels: {
    inBox: string;
    addOns: string;
    weight: string;
    preparation: string;
    ribbeSelection: string;
  };
}

export function MangalitsaCutInfo({ cutInfo, labels }: MangalitsaCutInfoProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-3xl font-normal text-neutral-900 mb-3 font-[family:var(--font-playfair)]">
          {cutInfo.name}
        </h3>
        <p className="text-base font-light text-neutral-600 leading-relaxed">
          {cutInfo.description}
        </p>
      </div>

      {/* Premium note */}
      {cutInfo.premiumNote && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
          <p className="text-sm font-normal text-neutral-900 leading-relaxed">
            {cutInfo.premiumNote}
          </p>
        </div>
      )}

      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-3">
            {labels.inBox}
          </p>
          <ul className="space-y-2">
            {cutInfo.inBox.map((box, idx) => (
              <li key={idx} className="text-sm font-light text-neutral-900 leading-relaxed flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                {box}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-3">
            {labels.addOns}
          </p>
          <ul className="space-y-2">
            {cutInfo.extraOrder.map((extra, idx) => (
              <li key={idx} className="text-sm font-light text-neutral-600 leading-relaxed flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-300 shrink-0" />
                {extra}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weight & Preparation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-neutral-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-2">
            {labels.weight}
          </p>
          <p className="text-sm font-light text-neutral-900">{cutInfo.weight}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-2">
            {labels.preparation}
          </p>
          <p className="text-sm font-light text-neutral-600 leading-relaxed">
            {cutInfo.preparation}
          </p>
        </div>
      </div>

      {/* Special: Ribbe options */}
      {cutInfo.ribbeOptions && cutInfo.ribbeOptions.length > 0 && (
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-4">
            {labels.ribbeSelection}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cutInfo.ribbeOptions.map((option, idx) => (
              <div
                key={idx}
                className="p-4 border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all"
              >
                <h4 className="text-base font-normal text-neutral-900 mb-1">
                  {option.title}
                </h4>
                <p className="text-xs px-2 py-0.5 bg-neutral-50 text-neutral-600 rounded inline-block mb-2">
                  {option.subtitle}
                </p>
                <ul className="space-y-1">
                  {option.points.map((point, pidx) => (
                    <li key={pidx} className="text-xs font-light text-neutral-600">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
