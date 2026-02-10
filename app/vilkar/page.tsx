"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VilkarPage() {
  const { t } = useLanguage();
  const terms = t.terms;
  const [partiesSection, ...otherSections] = terms.sections;

  return (
    <div className="min-h-screen bg-white py-20 px-6">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== "undefined" ? window.scrollY * 0.1 : 0}px)`,
            transition: "transform 0.05s linear",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-12"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {terms.back}
        </Link>

        <div className="bg-white border border-neutral-200 rounded-xl p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-8">{terms.title}</h1>

          <p className="text-base font-light text-neutral-600 mb-12 leading-relaxed">{terms.intro}</p>

          {partiesSection && (
            <section className="mb-12">
              <h2 className="text-3xl font-light text-neutral-900 mb-6">{partiesSection.title}</h2>
              <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                <p>
                  <strong className="font-normal">{terms.sellerLabel}</strong>
                </p>
                {!!partiesSection.bullets?.length && (
                  <ul className="list-none space-y-2 ml-4 text-neutral-600">
                    {partiesSection.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-4">{terms.buyerParagraph}</p>
              </div>
            </section>
          )}

          {otherSections.map((section) => (
            <section key={section.title} className="mb-12">
              <h2 className="text-3xl font-light text-neutral-900 mb-6">{section.title}</h2>
              <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {!!section.bullets?.length && (
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

          <section className="mt-12 pt-8 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 font-light italic">{terms.legalNotice}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
