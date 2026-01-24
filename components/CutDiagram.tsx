"use client";

import { useState } from 'react';

interface PorkProduct {
  id: string;
  name: string;
  part: string;
  kg8Box: number;
  kg12Box: number;
  description: string;
  category: 'main' | 'extra';
  usage?: string;
}

interface CutRegion {
  id: string;
  name: string;
  norwegianName: string;
  path: string;
  products: string[];
  textX: number;
  textY: number;
  textRotation?: number;
}

export function CutDiagram() {
  const [selectedBox, setSelectedBox] = useState<'8kg' | '12kg'>('8kg');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Products based on Norwegian pork butchery standards
  const products: PorkProduct[] = [
    // Main products in both boxes
    { id: 'ribbe', name: 'Ribbe', part: 'buk', kg8Box: 2.5, kg12Box: 4, description: 'Norges beste juleribbe med perfekt fettlag', usage: 'Steke, rull', category: 'main' },
    { id: 'nakkekoteletter', name: 'Nakkekoteletter', part: 'nakke', kg8Box: 1.5, kg12Box: 2.5, description: 'Saftige koteletter med naturlig fettmarmorering', usage: 'Steke, grille', category: 'main' },
    { id: 'bacon', name: 'Bacon/Sideflesk', part: 'buk', kg8Box: 1, kg12Box: 1.5, description: 'Hjemmelaget bacon og stekeflesk', usage: 'Steke', category: 'main' },
    { id: 'skinkesteik', name: 'Skinkesteik', part: 'skinke', kg8Box: 2, kg12Box: 3.5, description: 'Mør stek fra låret', usage: 'Steke, gryte', category: 'main' },
    { id: 'polse', name: 'Grillpølse', part: 'diverse', kg8Box: 1, kg12Box: 1.5, description: 'Hjemmelaget pølse', usage: 'Grille', category: 'main' },

    // Extra products available on request
    { id: 'bogstykke', name: 'Bogstykke', part: 'bog', kg8Box: 0, kg12Box: 0, description: 'Perfekt til pulled pork og gryter', usage: 'Langtidsstekt, gryte', category: 'extra' },
    { id: 'ryggkoteletter', name: 'Ryggkoteletter', part: 'kam', kg8Box: 0, kg12Box: 0, description: 'Møre koteletter fra ryggen', usage: 'Steke, grille', category: 'extra' },
    { id: 'indrefilet', name: 'Indrefilet', part: 'kam', kg8Box: 0, kg12Box: 0, description: 'Det aller møreste kjøttet', usage: 'Medaljonger', category: 'extra' },
  ];

  // Cut regions matching Norwegian butchery diagram
  const cutRegions: CutRegion[] = [
    {
      id: 'hode',
      name: 'HEAD',
      norwegianName: 'HODE',
      path: 'M 50 140 Q 40 130 40 115 Q 40 95 50 85 Q 55 80 65 78 L 85 80 L 90 110 L 85 145 L 70 148 Z',
      products: [],
      textX: 65,
      textY: 120,
      textRotation: -15
    },
    {
      id: 'nakke',
      name: 'NECK',
      norwegianName: 'NAKKE',
      path: 'M 85 80 L 140 75 L 145 148 L 90 150 Z',
      products: ['nakkekoteletter'],
      textX: 112,
      textY: 110,
      textRotation: -5
    },
    {
      id: 'bog',
      name: 'SHOULDER',
      norwegianName: 'BOG',
      path: 'M 90 150 L 145 148 L 155 220 L 100 225 Z',
      products: ['bogstykke'],
      textX: 122,
      textY: 185
    },
    {
      id: 'kam',
      name: 'LOIN',
      norwegianName: 'KAM',
      path: 'M 140 75 L 350 70 L 355 125 L 145 130 Z',
      products: ['ryggkoteletter', 'indrefilet'],
      textX: 247,
      textY: 100
    },
    {
      id: 'buk',
      name: 'BELLY',
      norwegianName: 'BUK',
      path: 'M 145 130 L 355 125 L 365 220 L 155 225 Z',
      products: ['ribbe', 'bacon'],
      textX: 260,
      textY: 172
    },
    {
      id: 'skinke',
      name: 'HAM',
      norwegianName: 'SKINKE',
      path: 'M 350 70 L 450 75 Q 475 85 475 110 Q 475 140 470 165 L 455 190 L 365 195 L 355 125 Z',
      products: ['skinkesteik'],
      textX: 410,
      textY: 130
    }
  ];

  const mainProducts = products.filter(p => p.category === 'main');
  const extraProducts = products.filter(p => p.category === 'extra');

  const total8kg = mainProducts.reduce((sum, p) => sum + p.kg8Box, 0);
  const total12kg = mainProducts.reduce((sum, p) => sum + p.kg12Box, 0);

  const selectedRegionData = cutRegions.find(r => r.id === selectedRegion);
  const selectedProducts = selectedRegionData?.products.map(pid => products.find(p => p.id === pid)).filter(Boolean) || [];

  return (
    <div className="space-y-12 pb-20">

      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate mb-4">
          Oppdelingsguide - Gris
        </h1>
        <p className="text-lg text-slate/70 leading-relaxed max-w-3xl mx-auto">
          Klikk på delene av grisen for å se informasjon om kuttet og hvilke produkter du får i pakken din.
        </p>
      </div>

      {/* Interactive Pig Diagram - Butcher's Style */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate/10 overflow-hidden">

          {/* Diagram */}
          <div className="relative bg-gradient-to-b from-slate/5 to-white p-8 md:p-12">
            <svg viewBox="0 0 500 250" className="w-full h-auto">
              {/* Pig silhouette outline */}
              <path
                d="M 50 140 Q 40 130 40 115 Q 40 95 50 85 Q 55 80 65 78 L 450 75 Q 475 85 475 110 Q 475 140 470 165 L 455 190 L 100 200 Q 70 185 50 140 Z"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Cut regions */}
              {cutRegions.map((region) => {
                const isSelected = selectedRegion === region.id;
                return (
                  <g key={region.id}>
                    <path
                      d={region.path}
                      fill={isSelected ? '#64748b' : '#cbd5e1'}
                      stroke="#1e293b"
                      strokeWidth="2"
                      className="transition-all duration-300 cursor-pointer hover:fill-slate"
                      onClick={() => setSelectedRegion(region.id)}
                      style={{
                        filter: isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                      }}
                    />

                    {/* Label */}
                    <text
                      x={region.textX}
                      y={region.textY}
                      textAnchor="middle"
                      className="pointer-events-none select-none font-bold uppercase"
                      fill={isSelected ? 'white' : '#1e293b'}
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        transform: region.textRotation ? `rotate(${region.textRotation}deg)` : 'none',
                        transformOrigin: `${region.textX}px ${region.textY}px`
                      }}
                    >
                      {region.norwegianName}
                    </text>
                  </g>
                );
              })}

              {/* Legs */}
              <g>
                <rect x="100" y="200" width="10" height="35" rx="5" fill="#475569" />
                <rect x="155" y="200" width="10" height="35" rx="5" fill="#475569" />
                <rect x="340" y="195" width="10" height="35" rx="5" fill="#475569" />
                <rect x="410" y="195" width="10" height="35" rx="5" fill="#475569" />
                <ellipse cx="105" cy="235" rx="8" ry="4" fill="#334155" />
                <ellipse cx="160" cy="235" rx="8" ry="4" fill="#334155" />
                <ellipse cx="345" cy="230" rx="8" ry="4" fill="#334155" />
                <ellipse cx="415" cy="230" rx="8" ry="4" fill="#334155" />
              </g>

              {/* Ear */}
              <ellipse cx="45" cy="105" rx="8" ry="18" fill="#94a3b8" transform="rotate(-25 45 105)" />

              {/* Eye and snout */}
              <circle cx="58" cy="105" r="3" fill="#1e293b" />
              <ellipse cx="50" cy="122" rx="12" ry="8" fill="none" stroke="#475569" strokeWidth="1.5" />
              <circle cx="46" cy="122" r="2" fill="#475569" />
              <circle cx="54" cy="122" r="2" fill="#475569" />

              {/* Tail */}
              <path
                d="M 470 140 Q 485 135 490 145 Q 495 155 485 158"
                fill="none"
                stroke="#475569"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-tail-wag"
              />
            </svg>
          </div>

          {/* Selected Region Info */}
          {selectedRegion && selectedRegionData && (
            <div className="border-t-4 border-slate bg-gradient-to-br from-slate/10 to-white p-8 md:p-12 animate-fade-in">
              <div className="max-w-4xl mx-auto">

                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-slate mb-2 uppercase tracking-wide">
                    {selectedRegionData.norwegianName}
                  </h2>
                  <p className="text-slate/60 text-sm uppercase tracking-wider">{selectedRegionData.name}</p>
                </div>

                {selectedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProducts.map((product) => {
                      if (!product) return null;
                      const amount8 = product.kg8Box;
                      const amount12 = product.kg12Box;

                      return (
                        <div key={product.id} className="bg-white rounded-xl p-6 shadow-lg border border-slate/10">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-slate">{product.name}</h3>
                            {product.category === 'main' && (
                              <div className="text-right">
                                <div className="text-2xl font-bold text-slate">{selectedBox === '8kg' ? amount8 : amount12} <span className="text-sm">kg</span></div>
                                <div className="text-xs text-slate/60 uppercase tracking-wider">I pakken</div>
                              </div>
                            )}
                            {product.category === 'extra' && (
                              <span className="px-3 py-1 bg-ice/50 text-slate text-xs font-bold uppercase tracking-wider rounded-full">
                                Ekstra
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate/70 mb-3">{product.description}</p>

                          {product.usage && (
                            <div className="flex items-center gap-2 text-xs text-slate/60">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="uppercase tracking-wider font-semibold">Bruk:</span>
                              <span>{product.usage}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 shadow-lg border border-slate/10 text-center">
                    <p className="text-slate/60 italic">Ingen spesifikke produkter fra denne delen i våre pakker</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Initial prompt */}
          {!selectedRegion && (
            <div className="border-t-4 border-slate/20 bg-gradient-to-br from-ice/20 to-white p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-lg text-slate/60 font-medium">Klikk på en del av grisen for å se produkter</p>
            </div>
          )}

        </div>
      </div>

      {/* Package Selector */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate/10 p-8">
          <h2 className="text-2xl font-bold text-slate mb-6 text-center">Velg pakkestørrelse</h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setSelectedBox('8kg')}
              className={`w-full sm:w-64 px-8 py-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 border-2 ${
                selectedBox === '8kg'
                  ? 'bg-slate text-white border-slate shadow-lg scale-105'
                  : 'bg-white text-slate border-slate/20 hover:border-slate/40 hover:scale-102'
              }`}
            >
              <div className="text-4xl mb-2">8 kg</div>
              <div className="text-sm font-medium normal-case opacity-90">2-3 personer</div>
              <div className="text-xs font-normal normal-case opacity-75 mt-1">Ca. {total8kg} kg kjøtt</div>
            </button>

            <button
              onClick={() => setSelectedBox('12kg')}
              className={`w-full sm:w-64 px-8 py-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 border-2 ${
                selectedBox === '12kg'
                  ? 'bg-slate text-white border-slate shadow-lg scale-105'
                  : 'bg-white text-slate border-slate/20 hover:border-slate/40 hover:scale-102'
              }`}
            >
              <div className="text-4xl mb-2">12 kg</div>
              <div className="text-sm font-medium normal-case opacity-90">4-6 personer</div>
              <div className="text-xs font-normal normal-case opacity-75 mt-1">Ca. {total12kg} kg kjøtt</div>
            </button>
          </div>
        </div>
      </div>

      {/* Package Contents */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate/10 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-slate to-charcoal text-white p-8 text-center">
            <h2 className="text-3xl font-bold mb-2">
              {selectedBox === '8kg' ? '8 kg pakke' : '12 kg pakke'}
            </h2>
            <p className="text-white/80 text-lg">
              {selectedBox === '8kg'
                ? 'Perfekt for 2-3 personer'
                : 'Ideell for 4-6 personer'}
            </p>
          </div>

          {/* Products Table */}
          <div className="p-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate/20">
                    <th className="text-left py-4 px-4 text-sm font-bold text-slate uppercase tracking-wider">Produkt</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-slate uppercase tracking-wider hidden md:table-cell">Beskrivelse</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-slate uppercase tracking-wider hidden sm:table-cell">Bruksområde</th>
                    <th className="text-right py-4 px-4 text-sm font-bold text-slate uppercase tracking-wider">Mengde</th>
                  </tr>
                </thead>
                <tbody>
                  {mainProducts.map((product, index) => {
                    const amount = selectedBox === '8kg' ? product.kg8Box : product.kg12Box;
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-slate/10 transition-colors hover:bg-ice/20 ${
                          index % 2 === 0 ? 'bg-slate/5' : 'bg-white'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate">{product.name}</div>
                          <div className="text-sm text-slate/60 md:hidden">{product.description}</div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate/70 hidden md:table-cell">{product.description}</td>
                        <td className="py-4 px-4 text-sm text-slate/60 hidden sm:table-cell">{product.usage || '-'}</td>
                        <td className="py-4 px-4 text-right">
                          <div className="text-2xl font-bold text-slate">{amount} <span className="text-lg text-slate/60">kg</span></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate bg-slate/5">
                    <td colSpan={3} className="py-6 px-4 text-xl font-bold text-slate uppercase tracking-wider">
                      Totalt kjøtt i pakken
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="text-4xl font-bold text-slate">
                        {selectedBox === '8kg' ? total8kg.toFixed(1) : total12kg.toFixed(1)} <span className="text-2xl text-slate/60">kg</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Extra Products */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate/10 p-8">

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-slate mb-2">Tilleggsbestillinger</h3>
            <p className="text-slate/60">Produkter som kan bestilles ekstra utover standardpakken</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {extraProducts.map(product => (
              <div key={product.id} className="group p-6 bg-gradient-to-br from-ice/30 to-white rounded-xl border-2 border-slate/10 hover:border-slate/30 transition-all hover:shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-slate group-hover:text-charcoal transition-colors">{product.name}</h4>
                  <span className="px-2 py-1 bg-slate/10 text-slate text-xs font-bold uppercase tracking-wider rounded">
                    Ekstra
                  </span>
                </div>
                <p className="text-sm text-slate/70 leading-relaxed mb-3">{product.description}</p>
                {product.usage && (
                  <div className="text-xs text-slate/60 uppercase tracking-wider">
                    <span className="font-bold">Bruk:</span> {product.usage}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-slate/10 to-ice/30 rounded-xl p-6 border border-slate/20">
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-slate flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-slate font-semibold mb-1">Vil du ha mer av noe spesielt?</p>
                <p className="text-sm text-slate/70">Kontakt oss for å bestille ekstra kutt eller spesialiteter i tillegg til standardpakken. Vi kan også tilpasse innholdet etter dine ønsker.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes tail-wag {
          0%, 100% { transform: rotate(0deg); transform-origin: 470px 140px; }
          50% { transform: rotate(10deg); transform-origin: 470px 140px; }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-tail-wag {
          animation: tail-wag 2.5s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>

    </div>
  );
}
