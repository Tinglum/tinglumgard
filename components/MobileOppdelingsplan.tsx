"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface CutInfo {
  id: number;
  name: string;
  description: string;
  inBox: string[];
  extraOrder: string[];
}

export function MobileOppdelingsplan() {
  const [expandedCut, setExpandedCut] = useState<number | null>(null);
  const [extras, setExtras] = useState<any[]>([]);
  const [boxContents, setBoxContents] = useState<any | null>(null);

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

  const toggleCut = (id: number) => {
    setExpandedCut(expandedCut === id ? null : id);
  };

  // Derived lists from admin/config
  const inBoxSummary: string[] = boxContents?.inBox ?? ['Ribbe', 'Nakkekoteletter', 'Svinesteik', 'Medisterfarse', 'Julepølse', 'Knoke', 'Slakterens valg'];
  const canOrderSummary: string[] = extras.length > 0 ? extras.map(e => e.name_no) : ['Indrefilet', 'Svinekoteletter', 'Bacon', 'Spekeskinke', 'Bogsteik', 'Svinelabb'];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [extrasRes, cfgRes] = await Promise.all([
          fetch('/api/extras'),
          fetch('/api/config'),
        ]);
        const extrasJson = await extrasRes.json();
        const cfgJson = await cfgRes.json();

        if (!mounted) return;

        // Filter out delivery/pickup config entries which are in extras table
        const filtered = (extrasJson.extras || []).filter((x: any) => !["delivery_trondheim", "pickup_e6", "fresh_delivery"].includes(x.slug));
        setExtras(filtered);

        if (cfgJson.box_contents) setBoxContents(cfgJson.box_contents);
      } catch (err) {
        console.error('Failed to load extras or config for MobileOppdelingsplan:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1
          className="text-4xl font-bold text-white mb-4"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
        >
          Oppdelingsplan
        </h1>
        <p
          className="text-sm font-semibold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
        >
          Trykk på hver del for å se hva som er i kassen og hva du kan bestille ekstra
        </p>
      </motion.div>

      {/* Pig Diagram - Display only */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-mobile-strong rounded-3xl p-6 mb-6"
      >
        <img
          src="/pig-diagram3.png"
          alt="Oppdelingsplan gris"
          className="w-full h-auto"
        />
        <p
          className="text-xs text-center text-white mt-4"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
        >
          Se detaljert informasjon om hver del nedenfor
        </p>
      </motion.div>

      {/* Quick Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-mobile rounded-3xl p-6 mb-6"
      >
        <h2
          className="text-xl font-bold text-white mb-4"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
        >
          Rask oversikt
        </h2>

          <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-500/20 rounded-2xl p-4 border-2 border-green-400/30">
            <Check className="w-6 h-6 text-green-400 mb-2" />
            <p
              className="text-xs font-bold text-white mb-1"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              I KASSEN
            </p>
            <ul className="space-y-1">
              {inBoxSummary.map(item => (
                <li
                  key={item}
                  className="text-xs font-semibold text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-500/20 rounded-2xl p-4 border-2 border-blue-400/30">
            <Plus className="w-6 h-6 text-blue-400 mb-2" />
            <p
              className="text-xs font-bold text-white mb-1"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              KAN BESTILLES
            </p>
            <ul className="space-y-1">
              {canOrderSummary.map(item => (
                <li
                  key={item}
                  className="text-xs font-semibold text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Accordion List */}
      <div className="space-y-3">
        {cuts.map((cut, index) => {
          const isExpanded = expandedCut === cut.id;

          return (
            <motion.div
              key={cut.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-mobile rounded-3xl overflow-hidden"
            >
              {/* Header - Always visible */}
              <button
                onClick={() => toggleCut(cut.id)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg"
                  >
                    <span
                      className="text-xl font-bold text-white"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                      {cut.id}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-bold text-white mb-1"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                    >
                      {cut.name}
                    </h3>
                    <p
                      className="text-xs font-semibold text-white line-clamp-1"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                      {cut.description}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 ml-2"
                >
                  <ChevronDown className="w-6 h-6 text-white" />
                </motion.div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      {/* Description */}
                      <p
                        className="text-sm font-semibold text-white leading-relaxed"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                      >
                        {cut.description}
                      </p>

                      {/* In Box Products */}
                      <div className="bg-green-500/20 rounded-2xl p-4 border-2 border-green-400/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="w-5 h-5 text-green-400" />
                          <h4
                            className="text-sm font-bold text-white"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            I kassen
                          </h4>
                        </div>
                        {cut.inBox.length > 0 ? (
                          <ul className="space-y-2">
                            {cut.inBox.map((product, i) => (
                              <li
                                key={i}
                                className="text-sm font-semibold text-white flex items-start gap-2"
                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                              >
                                <span className="text-green-400">•</span>
                                {product}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            className="text-sm font-semibold text-white/70 italic"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            Ingen produkter fra denne delen i standardkassen
                          </p>
                        )}
                      </div>

                      {/* Extra Order Products */}
                      <div className="bg-blue-500/20 rounded-2xl p-4 border-2 border-blue-400/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Plus className="w-5 h-5 text-blue-400" />
                          <h4
                            className="text-sm font-bold text-white"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            Kan bestilles ekstra
                          </h4>
                        </div>
                        {cut.extraOrder.length > 0 ? (
                          <ul className="space-y-2">
                            {cut.extraOrder.map((product, i) => (
                              <li
                                key={i}
                                className="text-sm font-semibold text-white flex items-start gap-2"
                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                              >
                                <span className="text-blue-400">•</span>
                                {product}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            className="text-sm font-semibold text-white/70 italic"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            Ingen ekstra produkter tilgjengelig
                          </p>
                        )}
                      </div>

                      {/* Ribbe Details for Ribbeside */}
                      {cut.id === 7 && (
                        <div className="bg-white/10 rounded-2xl p-4 border-2 border-white/20">
                          <h4
                            className="text-sm font-bold text-white mb-3"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            Velg din ribbe-type ved bestilling:
                          </h4>
                          <div className="space-y-2">
                            {[
                              { name: 'Tynnribbe', desc: 'Klassisk ribbe med ribbein' },
                              { name: 'Familieribbe', desc: 'Inkluderer kotelettkam - mer kjøtt' },
                              { name: 'Porchetta', desc: 'Beinfri nedre mage - italiensk' },
                            ].map((ribbe) => (
                              <div
                                key={ribbe.name}
                                className="bg-white/10 rounded-xl p-3"
                              >
                                <p
                                  className="font-bold text-white text-sm mb-1"
                                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                                >
                                  {ribbe.name}
                                </p>
                                <p
                                  className="text-xs font-semibold text-white/80"
                                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                                >
                                  {ribbe.desc}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
