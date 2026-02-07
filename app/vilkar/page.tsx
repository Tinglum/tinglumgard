"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VilkarPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-white py-20 px-6">
      {/* Subtle parallax background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-12"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {lang === 'no' ? 'Tilbake' : 'Back'}
        </Link>

        {/* Content card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          {lang === 'no' ? (
            <>
              <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-8">
                Vilkår for kjøp hos Tinglum Gård
              </h1>

              <p className="text-base font-light text-neutral-600 mb-12 leading-relaxed">
                Disse vilkårene gjelder for kjøp av varer fra Tinglum Gård gjennom våre nettsider.
                Ved å gjennomføre et kjøp bekrefter du at du har lest og akseptert vilkårene.
              </p>

              {/* 1. Parter */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">1. Parter</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p><strong className="font-normal">Selger er:</strong></p>
                  <ul className="list-none space-y-2 ml-4 text-neutral-600">
                    <li>Tinglum Gård</li>
                    <li>Organisasjonsnummer: 995 752 328</li>
                    <li>Adresse: Tinglemsvegen 91, 7750 NAMDALSEID</li>
                    <li>E-post: post@tinglum.com</li>
                  </ul>
                  <p className="mt-4">
                    Kjøper er den personen som gjennomfører bestillingen og omtales som "kunde".
                  </p>
                </div>
              </section>

              {/* 2. Betaling */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">2. Betaling</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Betaling skjer via Vipps.</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Ved bestilling betales et forskudd på 50 % av totalbeløpet.</li>
                    <li>Resterende beløp betales før levering, i henhold til informasjon gitt ved bestilling.</li>
                  </ul>
                  <p className="mt-4">
                    Forskuddet fungerer som en reservasjon av en begrenset produksjonsbatch og er bindende.
                  </p>
                </div>
              </section>

              {/* 3. Levering */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">3. Levering</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Varene leveres i henhold til valgt leveringsalternativ ved bestilling, for eksempel:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Henting på gården</li>
                    <li>Levering til angitte områder</li>
                    <li>Eventuell levering i Trondheim</li>
                  </ul>
                  <p className="mt-4">
                    Leveringstidspunkt oppgis på produktsiden og kan variere basert på sesong og produksjon.
                  </p>
                  <p>
                    Varene leveres som hovedregel frosne og vakuumpakkede, med mindre annet er avtalt.
                  </p>
                </div>
              </section>

              {/* 4. Angrerett */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">4. Angrerett</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>I henhold til angrerettloven § 22 gjelder <strong>ikke</strong> angrerett for varer som:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>er produsert etter kundens spesifikasjoner, eller</li>
                    <li>har et tydelig personlig preg, eller</li>
                    <li>er lett bedervelige næringsmidler.</li>
                  </ul>
                  <p className="mt-4">
                    Kjøp av kjøtt og kjøttprodukter fra Tinglum Gård omfattes derfor <strong>ikke</strong> av angrerett.
                  </p>
                </div>
              </section>

              {/* 5. Retur */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">5. Retur</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>
                    Retur av varer er ikke mulig, da dette gjelder næringsmidler som leveres frosne eller ferske etter bestilling.
                  </p>
                  <p>
                    Dersom Tinglum Gård ikke er i stand til å levere som avtalt, refunderes innbetalt beløp i sin helhet.
                  </p>
                </div>
              </section>

              {/* 6. Reklamasjon */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">6. Reklamasjon</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>
                    Dersom varen har en mangel, må kunden gi beskjed innen rimelig tid etter at mangelen ble oppdaget eller burde vært oppdaget.
                  </p>
                  <p>Reklamasjon sendes skriftlig til e-postadressen oppgitt under punkt 1, og bør inneholde:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Bestillingsnummer</li>
                    <li>Beskrivelse av mangelen</li>
                    <li>Eventuell dokumentasjon (bilder)</li>
                  </ul>
                  <p className="mt-4">
                    Reklamasjon behandles i henhold til forbrukerkjøpsloven.
                  </p>
                </div>
              </section>

              {/* 7. Konfliktløsning */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">7. Konfliktløsning</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Eventuelle tvister forsøkes løst i minnelighet.</p>
                  <p>
                    Dersom dette ikke lykkes, kan kunden ta saken videre til Forbrukertilsynet eller Forbrukerklageutvalget.
                  </p>
                </div>
              </section>

              {/* Juridisk merknad */}
              <section className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-500 font-light italic">
                  Disse vilkårene er ment som informasjon til kunder og utgjør ikke juridisk rådgivning.
                </p>
              </section>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-8">
                Terms and Conditions - Tinglum Gård
              </h1>

              <p className="text-base font-light text-neutral-600 mb-12 leading-relaxed">
                These terms apply to purchases of goods from Tinglum Gård through our website.
                By completing a purchase, you confirm that you have read and accepted these terms.
              </p>

              {/* 1. Parties */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">1. Parties</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p><strong className="font-normal">Seller:</strong></p>
                  <ul className="list-none space-y-2 ml-4 text-neutral-600">
                    <li>Tinglum Gård</li>
                    <li>Organization number: 995 752 328</li>
                    <li>Address: Tinglemsvegen 91, 7750 NAMDALSEID, Norway</li>
                    <li>Email: post@tinglum.com</li>
                  </ul>
                  <p className="mt-4">
                    The buyer is the person who completes the order and is referred to as "customer".
                  </p>
                </div>
              </section>

              {/* 2. Payment */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">2. Payment</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Payment is made via Vipps.</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Upon ordering, a deposit of 50% of the total amount is paid.</li>
                    <li>The remaining amount is paid before delivery, according to information provided at the time of order.</li>
                  </ul>
                  <p className="mt-4">
                    The deposit functions as a reservation of a limited production batch and is binding.
                  </p>
                </div>
              </section>

              {/* 3. Delivery */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">3. Delivery</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Goods are delivered according to the selected delivery option at checkout, for example:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Pickup at the farm</li>
                    <li>Delivery to specified areas</li>
                    <li>Possible delivery in Trondheim</li>
                  </ul>
                  <p className="mt-4">
                    Delivery time is stated on the product page and may vary based on season and production.
                  </p>
                  <p>
                    Goods are generally delivered frozen and vacuum-packed, unless otherwise agreed.
                  </p>
                </div>
              </section>

              {/* 4. Right of Withdrawal */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">4. Right of Withdrawal</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>In accordance with Norwegian consumer law § 22, the right of withdrawal does <strong>not</strong> apply to goods that:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>are produced according to customer specifications, or</li>
                    <li>have a clearly personal character, or</li>
                    <li>are perishable food items.</li>
                  </ul>
                  <p className="mt-4">
                    Purchases of meat and meat products from Tinglum Gård are therefore <strong>not</strong> covered by the right of withdrawal.
                  </p>
                </div>
              </section>

              {/* 5. Returns */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">5. Returns</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>
                    Return of goods is not possible, as these are food items delivered frozen or fresh upon order.
                  </p>
                  <p>
                    If Tinglum Gård is unable to deliver as agreed, the paid amount will be refunded in full.
                  </p>
                </div>
              </section>

              {/* 6. Complaints */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">6. Complaints</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>
                    If the product has a defect, the customer must notify within a reasonable time after the defect was discovered or should have been discovered.
                  </p>
                  <p>Complaints should be sent in writing to the email address stated under section 1, and should include:</p>
                  <ul className="list-disc ml-6 space-y-3 text-neutral-600">
                    <li>Order number</li>
                    <li>Description of the defect</li>
                    <li>Any documentation (photos)</li>
                  </ul>
                  <p className="mt-4">
                    Complaints are handled in accordance with Norwegian consumer purchase law.
                  </p>
                </div>
              </section>

              {/* 7. Dispute Resolution */}
              <section className="mb-12">
                <h2 className="text-3xl font-light text-neutral-900 mb-6">7. Dispute Resolution</h2>
                <div className="text-neutral-600 font-light leading-relaxed space-y-4">
                  <p>Any disputes will be attempted to be resolved amicably.</p>
                  <p>
                    If this does not succeed, the customer can take the matter to the Norwegian Consumer Authority or Consumer Complaints Board.
                  </p>
                </div>
              </section>

              {/* Legal Notice */}
              <section className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-500 font-light italic">
                  These terms are intended as information for customers and do not constitute legal advice.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
