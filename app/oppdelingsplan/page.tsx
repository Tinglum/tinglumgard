"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface CutInfo {
  id: number;
  name: string;
  description: string;
  inBox: string[];
  extraOrder: string[];
}

export default function OppdelingsplanPage() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const [selectedCut, setSelectedCut] = useState<number | null>(null);
  const [hoveredCut, setHoveredCut] = useState<number | null>(null);

  const cuts: CutInfo[] = [
    {
      id: 3,
      name: "Nakke",
      description: "Nakken er marmorert med fett og gir saftige koteletter og steik.",
      inBox: ["Nakkekoteletter ca. 1.0 kg (12 kg kasse) / ca. 0.75 kg (8 kg kasse)"],
      extraOrder: ["Ekstra nakkekoteletter", "Nakkestek/gryte"]
    },
    {
      id: 4,
      name: "Indrefilet",
      description: "Indrefileten er det aller møreste kjøttet fra grisen.",
      inBox: [],
      extraOrder: ["Indrefilet"]
    },
    {
      id: 5,
      name: "Kotelettkam",
      description: "Kotelettkammen er fra ryggen og gir møre koteletter. Dette området brukes også i Familieribbe.",
      inBox: ["Inkludert i Familieribbe-valget"],
      extraOrder: ["Svinekoteletter"]
    },
    {
      id: 7,
      name: "Ribbeside",
      description: "Ribbeside og mage gir ulike typer ribbe. Velg mellom Tynnribbe (med ribbein), Familieribbe (inkl. kotelettkam), eller Porchetta (beinfri nedre mage).",
      inBox: ["ca. 3.0 kg ribbe (12 kg kasse) / ca. 2.0 kg ribbe (8 kg kasse) - velg type ved bestilling"],
      extraOrder: ["Ekstra ribbe", "Bacon", "Sideflesk"]
    },
    {
      id: 8,
      name: "Svinebog",
      description: "Bogen passer perfekt til pulled pork, gryter og steik. Dette er et av de mest allsidige stykkene.",
      inBox: ["Inkludert i Slakterens valg"],
      extraOrder: ["Bogsteik/gryte", "Steik til pulled-pork"]
    },
    {
      id: 9,
      name: "Skinke/Lår",
      description: "Skinken/låret kan brukes fersk som steik, gryte, eller spekkes. Dette er en stor, mager muskelgruppe.",
      inBox: ["Svinesteik ca. 1.0 kg", "Også inkludert i Slakterens valg"],
      extraOrder: ["Ekstra skinkesteik", "Spekeskinke"]
    },
    {
      id: 10,
      name: "Knoke",
      description: "Knoken passer til kraft og gryter, eller til steik. Hver kasse inneholder 1 knoke.",
      inBox: ["1 stk knoke (ca. 0.5-1.0 kg)"],
      extraOrder: ["Ekstra knoker"]
    },
    {
      id: 11,
      name: "Labb",
      description: "Labben brukes ofte til sylte og kraftsuppe.",
      inBox: [],
      extraOrder: ["Svinelabb"]
    },
    {
      id: 12,
      name: "Pølser & Farse",
      description: "Laget av trim og mindre stykker. Perfekt til hverdagsmiddag og julemat.",
      inBox: ["Medisterfarse: ca. 1.5 kg (12 kg kasse) / ca. 1.0 kg (8 kg kasse)", "Julepølse: ca. 1.0 kg (12 kg kasse) / ca. 0.5 kg (8 kg kasse)"],
      extraOrder: ["Ekstra medisterfarse", "Ekstra julepølse"]
    }
  ];

  const selectedCutInfo = cuts.find(c => c.id === selectedCut);
  const hoveredCutInfo = cuts.find(c => c.id === hoveredCut);

  return (
    <div className={cn("min-h-screen", theme.bgGradientHero)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <Link href="/" className={cn("inline-flex items-center transition-colors mb-8", theme.textSecondary, `hover:${theme.textPrimary}`)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake til forsiden
        </Link>

        <div className="text-center mb-12">
          <h1 className={cn("text-4xl md:text-5xl font-bold mb-4", theme.textPrimary)}>Oppdelingsplan - Gris</h1>
          <p className={cn("text-lg max-w-3xl mx-auto", theme.textMuted)}>
            Klikk på de forskjellige delene for å se hvilke produkter som er inkludert i kassen og hva som kan bestilles ekstra
          </p>
        </div>

        {/* Product Summary */}
        <div className={cn("rounded-2xl shadow-xl border p-8 mb-8", theme.bgCard, theme.borderSecondary)}>
          <h2 className={cn("text-2xl font-bold mb-6 text-center", theme.textPrimary)}>Våre produkter</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* In Box Products */}
            <div>
              <h3 className={cn("text-lg font-bold mb-4 flex items-center gap-2", theme.textPrimary)}>
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                I kassen
              </h3>
              <p className={cn("text-sm mb-4", theme.textMuted)}>Disse produktene er inkludert i standardkassen:</p>
              <div className="space-y-2">
                {["Knoke (1 stk)", "Medisterfarse", "Julepølse", "Nakkekoteletter", "Svinesteik", "Ribbe (velg type)", "Slakterens valg (varierer)"].map((product) => (
                  <div key={product} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-green-900">{product}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra Order Products */}
            <div>
              <h3 className={cn("text-lg font-bold mb-4 flex items-center gap-2", theme.textPrimary)}>
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Kan bestilles ekstra
              </h3>
              <p className={cn("text-sm mb-4", theme.textMuted)}>Disse produktene kan legges til bestillingen (begrenset tilgjengelighet):</p>
              <div className="space-y-2">
                {["Indrefilet", "Ytrefilet/Ryggfilet", "Svinekoteletter", "Ekstra ribbe", "Bacon/Sideflesk", "Spekeskinke", "Bogsteik (pulled pork)", "Svinelabb", "Innmat (lever, hjerte)", "Kraftbein"].map((product) => (
                  <div key={product} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium text-blue-900">{product}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Image-based diagram */}
        <div className={cn("rounded-2xl shadow-xl border overflow-hidden mb-12", theme.bgCard, theme.borderSecondary)}>
          <div className={cn("relative p-8 md:p-16", theme.bgDark)}>

            {/* Pig butcher diagram */}
            <div className="relative w-full aspect-[16/9] max-w-5xl mx-auto">
              <img
                src="/pig-diagram3.png"
                alt="Pig butcher diagram"
                className="w-full h-full object-contain"
              />

              {/* Clickable overlays using precise polygon coordinates */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Nakke - neck */}
                <polygon
                  points="33,26 46,26 39,44 34,44"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(3)}
                  onMouseEnter={() => setHoveredCut(3)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Nakke"
                />

                {/* Svinebog - shoulder */}
                <polygon
                  points="39,44 47,35 51,58 42,58"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(8)}
                  onMouseEnter={() => setHoveredCut(8)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Bog"
                />

                {/* Kotelettkam - loin/back */}
                <polygon
                  points="45,21 70,21 68,35 47,35"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(5)}
                  onMouseEnter={() => setHoveredCut(5)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Kam"
                />

                {/* Ribbeside - belly/ribs */}
                <polygon
                  points="48,37 68,36 68,53 51,58"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(7)}
                  onMouseEnter={() => setHoveredCut(7)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Side/Bacon"
                />

                {/* Skinke - ham */}
                <polygon
                  points="72,23 82,34 84,50 70,56"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(9)}
                  onMouseEnter={() => setHoveredCut(9)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Skinke"
                />

                {/* Knoke - front leg */}
                <polygon
                  points="42,58 51,58 50,70 42,74"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(10)}
                  onMouseEnter={() => setHoveredCut(10)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Knoke"
                />

                {/* Knoke - back leg */}
                <polygon
                  points="70,56 80,56 82,74 72,76"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="0.5"
                  className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                  onClick={() => setSelectedCut(10)}
                  onMouseEnter={() => setHoveredCut(10)}
                  onMouseLeave={() => setHoveredCut(null)}
                  aria-label="Knoke"
                />
              </svg>

              {/* Hover tooltip */}
              {hoveredCut && hoveredCutInfo && !selectedCut && (
                <div className={cn("absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-lg shadow-xl px-4 py-2 pointer-events-none z-10", theme.bgPrimary)}>
                  <p className={cn("text-sm font-bold", theme.textPrimary)}>{hoveredCutInfo.name}</p>
                </div>
              )}
            </div>

          </div>

          {selectedCutInfo ? (
            <div className={cn("border-t-4 p-8 md:p-12 animate-fade-in", theme.borderSecondary, theme.bgGradientHero)}>
              <div className="max-w-4xl mx-auto">
                <div className="flex-1">
                  <h2 className={cn("text-3xl font-bold mb-3", theme.textPrimary)}>{selectedCutInfo.name}</h2>
                  <p className={cn("text-lg mb-6", theme.textMuted)}>{selectedCutInfo.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                    {/* In Box Products */}
                    <div>
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme.textPrimary)}>
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        I kassen
                      </h3>
                      {selectedCutInfo.inBox.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedCutInfo.inBox.map((product, idx) => (
                            <span key={idx} className="px-4 py-2 bg-green-50 border-2 border-green-200 rounded-full text-sm font-medium text-green-800">
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={cn("text-sm italic", theme.textMuted)}>Ingen produkter fra denne delen i standardkassen</p>
                      )}
                    </div>

                    {/* Extra Order Products */}
                    <div>
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme.textPrimary)}>
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Kan bestilles ekstra
                      </h3>
                      {selectedCutInfo.extraOrder.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedCutInfo.extraOrder.map((product, idx) => (
                            <span key={idx} className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-full text-sm font-medium text-blue-800">
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={cn("text-sm italic", theme.textMuted)}>Ingen ekstra produkter tilgjengelig fra denne delen</p>
                      )}
                    </div>
                  </div>

                  {/* Show ribbe choices when Ribbeside is selected */}
                  {selectedCutInfo.id === 7 && (
                    <div className={cn("mt-8 pt-8 border-t", theme.borderSecondary)}>
                      <div className="text-center mb-6">
                        <h3 className={cn("text-2xl font-bold mb-2", theme.textPrimary)}>Velg din ribbe-type</h3>
                        <p className={cn("text-sm", theme.textMuted)}>Alle tre varianter bruker forskjellige deler av ribbeside og mage</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Tynnribbe */}
                        <div className={cn("rounded-lg p-4 shadow border", theme.bgPrimary, theme.borderSecondary)}>
                          <h4 className={cn("font-bold mb-1", theme.textPrimary)}>Tynnribbe</h4>
                          <p className={cn("text-xs mb-2", theme.textMuted)}>Klassisk ribbe med ribbein</p>
                          <ul className={cn("space-y-1 text-xs", theme.textMuted)}>
                            <li>• Kun ribbein-området</li>
                            <li>• Perfekt sprøstekt svor</li>
                            <li>• God balanse kjøtt/fett</li>
                          </ul>
                        </div>

                        {/* Familieribbe */}
                        <div className={cn("rounded-lg p-4 shadow border-2", theme.bgPrimary, theme.borderPrimary)}>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={cn("font-bold", theme.textPrimary)}>Familieribbe</h4>
                            <span className={cn("text-xs px-2 py-0.5 rounded", theme.bgDark, theme.textOnDark)}>Premium</span>
                          </div>
                          <p className={cn("text-xs mb-2", theme.textMuted)}>Inkluderer kotelettkam</p>
                          <ul className={cn("space-y-1 text-xs", theme.textMuted)}>
                            <li>• Ribbe + kotelettkam</li>
                            <li>• Mer magert kjøtt</li>
                            <li>• Best for store familier</li>
                          </ul>
                        </div>

                        {/* Porchetta */}
                        <div className={cn("rounded-lg p-4 shadow border", theme.bgPrimary, theme.borderSecondary)}>
                          <h4 className={cn("font-bold mb-1", theme.textPrimary)}>Porchetta</h4>
                          <p className={cn("text-xs mb-2", theme.textMuted)}>Beinfri nedre mage</p>
                          <ul className={cn("space-y-1 text-xs", theme.textMuted)}>
                            <li>• 100% beinfri</li>
                            <li>• Enkel å skjære</li>
                            <li>• Saftig og smakfull</li>
                          </ul>
                        </div>
                      </div>

                      <div className={cn("rounded-lg p-4 text-sm", theme.bgSecondary, theme.textSecondary)}>
                        <strong className={theme.textPrimary}>Slakterens valg:</strong> Ikke sikker? Velg "Slakterens valg" ved bestilling, så velger vi basert på tilgjengelighet.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={cn("border-t-4 p-12 text-center", theme.borderSecondary, theme.bgGradientHero)}>
              <svg className={cn("w-16 h-16 mx-auto mb-4", theme.iconColor)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className={cn("text-lg font-medium", theme.textMuted)}>Klikk på en del av grisen for å se produktinformasjon</p>
            </div>
          )}
        </div>

        {/* All Cuts Overview */}
        <div className={cn("rounded-2xl shadow-xl border p-8", theme.bgCard, theme.borderSecondary)}>
          <h2 className={cn("text-2xl font-bold mb-6 text-center", theme.textPrimary)}>Alle kutt - Oversikt</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuts.map((cut) => (
              <button
                key={cut.id}
                onClick={() => setSelectedCut(cut.id)}
                className={cn(
                  "p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg",
                  selectedCut === cut.id ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-md") : cn(theme.borderSecondary, "hover:opacity-80")
                )}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0", theme.bgDark, theme.textOnDark)}>
                    {cut.id}
                  </div>
                  <h3 className={cn("text-xl font-bold", theme.textPrimary)}>{cut.name}</h3>
                </div>
                <p className={cn("text-sm mb-3", theme.textMuted)}>{cut.description}</p>
                <div className="space-y-2">
                  {cut.inBox.length > 0 && (
                    <div>
                      <p className="text-xs text-green-700 font-semibold mb-1">I kassen:</p>
                      <div className="flex flex-wrap gap-1">
                        {cut.inBox.map((p, i) => (
                          <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cut.extraOrder.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-700 font-semibold mb-1">Ekstra:</p>
                      <div className="flex flex-wrap gap-1">
                        {cut.extraOrder.map((p, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
