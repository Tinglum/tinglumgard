"use client";

import { useMemo, useState } from "react";
import { QUEST_ASSESSMENT, QuestLocale } from "@/lib/quest/assessment";

type Props = {
  locale: QuestLocale;
  sectionScores: number[];
  answerRecords?: Array<{
    question_id: string;
    answer_key: string;
    score: number;
  }>;
  bookingUrl: string;
  accessToken: string;
  enrollment?: { opted_in:boolean; track?:Track; status:string } | null;
};
type Track = "standard" | "advanced" | "very_advanced";

const safetyItems = {
  en: [
    "I am pregnant or breastfeeding, under 18, underweight, or have had recent unexplained weight loss.",
    "I have diabetes, use glucose-lowering medicine, or take medicine that must be taken with food.",
    "I have a current or previous eating disorder, kidney or liver disease, an acute illness, or a clinician has advised me not to fast.",
  ],
  nb: [
    "Jeg er gravid eller ammer, er under 18 år, undervektig eller har hatt nylig uforklarlig vekttap.",
    "Jeg har diabetes, bruker blodsukkersenkende legemidler eller tar legemidler som må tas sammen med mat.",
    "Jeg har eller har hatt en spiseforstyrrelse, nyre- eller leversykdom, akutt sykdom, eller helsepersonell har frarådet meg å faste.",
  ],
};

export function FastingChallenge({
  locale,
  sectionScores,
  answerRecords,
  bookingUrl,
  accessToken,
  enrollment,
}: Props) {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(enrollment?.track || null);
  const [riskAnswers, setRiskAnswers] = useState([false, false, false]);
  const [confirmed, setConfirmed] = useState(false);
  const [experienceConfirmed, setExperienceConfirmed] = useState(false);
  const [savedEnrollment, setSavedEnrollment] = useState(Boolean(enrollment?.opted_in));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const c =
    locale === "nb"
      ? {
          eyebrow: "Frem mot samlingen · 22.–24. september 2026",
          title: "Fasteutfordringen",
          intro:
            "En frivillig gruppeoppgave som handler om forberedelse, observasjon og gode valg – ikke om å presse seg lengst mulig.",
          open: "Se utfordringen og velg spor",
          snapshot: "Ditt utgangspunkt",
          strong: "Sterkeste område",
          focus: "Størst utviklingsrom",
          personal:
            "Bruk styrken din til å støtte området med størst utviklingsrom. Velg på forhånd hva du vil observere: energi, sult, humør, søvn, trening og hvordan du spiser etterpå. Poengsummen avgjør ikke hvilket fastespor som passer for deg.",
          choose: "Velg et spor selv",
          standard: "Standardsporet",
          standardLead:
            "Et konservativt spor for de fleste kvalifiserte deltakere.",
          standardBody:
            "Forbered deg med 16:8 i noen dager. Fast deretter fra middag søndag 6. september til middag mandag 7. september, og fra middag søndag 13. september til middag mandag 14. september. Den siste fasten går fra middag mandag 21. september til middagen på samlingen tirsdag 22. september.",
          advanced: "Avansert spor: utvidet faste",
          advancedLead:
            "For erfarne deltakere som består sikkerhetssjekken og har tålt forberedelsen godt.",
          advancedBody:
            "Cirka 48 timer fra middag søndag 20. september til middagen på samlingen tirsdag 22. september. Dette er et eget valg, ikke en anbefaling basert på poengsummen.",
          veryAdvanced: "Svært avansert spor: cirka 72 timer",
          veryAdvancedLead: "Kun for dem som allerede har relevant erfaring og tåler forberedelsen godt.",
          veryAdvancedBody: "Fra middag lørdag 19. september til middagen på samlingen tirsdag 22. september. Ikke øk varigheten underveis.",
          safety: "Sikkerhetssjekk",
          safetyIntro:
            "Marker alt som gjelder deg. Dette lagres ikke og brukes bare til å vise et trygt neste steg.",
          blocked:
            "Ikke start en fasteutfordring nå. Velg i stedet observasjonssporet med vanlige måltider, og avklar eventuell faste med kvalifisert helsepersonell.",
          approval:
            "Jeg har lest sikkerhetssjekken, ingen av punktene gjelder meg, og jeg velger dette sporet selv.",
          experience: "Jeg har tidligere erfaring med faste og velger det utvidede sporet på bakgrunn av denne erfaringen.",
          ready: "Ditt valgte neste steg",
          join: "Bli med på dette sporet",
          joined: "Sporet ditt er lagret",
          withdraw: "Trekk meg fra utfordringen",
          standardPlan:
            "Følg 16:8-forberedelsen og de tre middag-til-middag-fastene 6.–7., 13.–14. og 21.–22. september. Noter signalene dine uten å jage et bestemt antall timer.",
          advancedPlan:
            "Planlegg søndag middag til tirsdag middag, og ikke øk varigheten underveis. Del planen med Kenneth før oppstart.",
          veryAdvancedPlan: "Planlegg lørdag middag til tirsdag middag, og ikke øk varigheten underveis. Del planen med Kenneth før oppstart.",
          stops:
            "Ingen tørrfaste: drikk væske etter den avtalte planen. Avbryt og søk hjelp ved besvimelse, forvirring, vedvarende svimmelhet, brystsmerter, alvorlig svakhet, oppkast eller andre bekymringsfulle symptomer. Ved akutte symptomer: kontakt akutt helsehjelp.",
          book: "Bestill en avklaringssamtale med Kenneth",
          notMedical:
            "Dette er en gruppeutfordring og refleksjonsøvelse, ikke medisinsk behandling eller en individuell anbefaling.",
        }
      : {
          eyebrow: "Toward the retreat · September 22–24, 2026",
          title: "The fasting challenge",
          intro:
            "An optional group task focused on preparation, observation and sound decisions—not on pushing for the longest fast.",
          open: "Explore the challenge and choose a track",
          snapshot: "Your starting point",
          strong: "Strongest area",
          focus: "Clearest room to grow",
          personal:
            "Use your strongest area to support the area with most room to grow. Decide in advance what you will observe: energy, hunger, mood, sleep, training and how you eat afterward. Your score does not determine which fasting track is suitable for you.",
          choose: "Choose your own track",
          standard: "Standard track",
          standardLead: "A conservative route for most eligible participants.",
          standardBody:
            "Prepare with 16:8 for several days. Then fast from dinner Sunday, September 6 to dinner Monday, September 7, and from dinner Sunday, September 13 to dinner Monday, September 14. The final fast runs from dinner Monday, September 21 to the retreat dinner on Tuesday, September 22.",
          advanced: "Advanced track: extended fasting",
          advancedLead:
            "For experienced participants who clear the safety check and tolerate the preparation well.",
          advancedBody:
            "About 48 hours, from dinner Sunday, September 20 to the retreat dinner Tuesday, September 22. This is a personal choice, not a recommendation based on your score.",
          veryAdvanced: "Very advanced track: about 72 hours",
          veryAdvancedLead: "Only for people with relevant prior experience who tolerate the preparation well.",
          veryAdvancedBody: "From dinner Saturday, September 19 to the retreat dinner Tuesday, September 22. Do not extend the duration during the challenge.",
          safety: "Safety check",
          safetyIntro:
            "Select everything that applies to you. This is not stored and is used only to show a safer next step.",
          blocked:
            "Do not begin a fasting challenge now. Choose the observation track with regular meals instead, and discuss any future fasting with a qualified healthcare professional.",
          approval:
            "I have reviewed the safety check, none of the items applies to me, and I am choosing this track myself.",
          experience: "I have previous fasting experience and am choosing the extended track on the basis of that experience.",
          ready: "Your chosen next step",
          join: "Join this track",
          joined: "Your track is saved",
          withdraw: "Withdraw from the challenge",
          standardPlan:
            "Follow the 16:8 preparation and the three dinner-to-dinner fasts on September 6–7, 13–14 and 21–22. Record your signals without chasing a target number of hours.",
          advancedPlan:
            "Plan from Sunday dinner to Tuesday dinner and do not extend the duration. Share your plan with Kenneth before starting.",
          veryAdvancedPlan: "Plan from Saturday dinner to Tuesday dinner and do not extend the duration. Share your plan with Kenneth before starting.",
          stops:
            "No dry fasting: drink fluids according to the agreed plan. Stop and seek help for fainting, confusion, persistent dizziness, chest pain, severe weakness, vomiting or other concerning symptoms. For urgent symptoms, contact emergency medical services.",
          book: "Book a clarification call with Kenneth",
          notMedical:
            "This is a group challenge and reflection exercise, not medical treatment or an individualized recommendation.",
        };
  const snapshot = useMemo(() => {
    const ranked = QUEST_ASSESSMENT.sections
      .map((section, index) => ({
        section,
        score: Number(sectionScores[index] || 0),
      }))
      .sort((a, b) => b.score - a.score);
    const weakest = ranked[ranked.length - 1];
    const lowest = QUEST_ASSESSMENT.questions
      .filter((q) => Math.ceil(q.order / 5) === weakest.section.order)
      .map((question) => ({
        question,
        score:
          answerRecords?.find((a) => a.question_id === question.id)?.score ?? 0,
      }))
      .sort((a, b) => a.score - b.score)[0];
    return { strongest: ranked[0], weakest, lowest };
  }, [answerRecords, sectionScores]);
  const hasRisk = riskAnswers.some(Boolean);
  const showPlan = confirmed;

  async function saveChallenge(optedIn: boolean) {
    if (optedIn && (!track || hasRisk || !confirmed)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/quest/challenge", {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(optedIn ? { optedIn:true, track, acknowledgments:{ understandsNotMedicalAdvice:true, agreesToStopIfUnwell:true, confirmsPriorExperience:track==='standard'||experienceConfirmed } } : { optedIn:false }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save challenge choice");
      setSavedEnrollment(optedIn);
      setMessage(optedIn ? c.joined : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save challenge choice");
    } finally { setSaving(false); }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#c8d5c9] bg-[#eef3e9]">
      <div className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-900">
          {c.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-medium sm:text-4xl">{c.title}</h2>
        <p className="mt-4 leading-relaxed text-neutral-700">{c.intro}</p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white"
          >
            {c.open}
          </button>
        )}
      </div>
      {open && (
        <div className="quest-question-enter border-t border-[#c8d5c9] bg-white p-6 sm:p-8">
          <h3 className="text-2xl font-medium">{c.snapshot}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f3f7f0] p-4">
              <p className="text-xs font-semibold uppercase text-neutral-500">
                {c.strong}
              </p>
              <p className="mt-2 font-medium">
                {snapshot.strongest.section.title[locale]} ·{" "}
                {snapshot.strongest.score}/20
              </p>
            </div>
            <div className="rounded-2xl bg-[#fbf4e8] p-4">
              <p className="text-xs font-semibold uppercase text-neutral-500">
                {c.focus}
              </p>
              <p className="mt-2 font-medium">
                {snapshot.weakest.section.title[locale]} ·{" "}
                {snapshot.weakest.score}/20
              </p>
            </div>
          </div>
          <p className="mt-4 leading-relaxed text-neutral-700">{c.personal}</p>
          {snapshot.lowest && (
            <p className="mt-3 rounded-xl border-l-4 border-[#b7873f] bg-[#fbf7ee] p-4 text-sm">
              {locale === "nb"
                ? `Et konkret refleksjonspunkt fra svarene dine: «${snapshot.lowest.question.prompt.nb}»`
                : `One concrete reflection point from your answers: “${snapshot.lowest.question.prompt.en}”`}
            </p>
          )}
          <h3 className="mt-8 text-2xl font-medium">{c.choose}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["standard", c.standard, c.standardLead, c.standardBody],
                ["advanced", c.advanced, c.advancedLead, c.advancedBody],
                [
                  "very_advanced",
                  c.veryAdvanced,
                  c.veryAdvancedLead,
                  c.veryAdvancedBody,
                ],
              ] as const
            ).map(([id, title, lead, body]) => (
              <button
                key={id}
                type="button"
                aria-pressed={track === id}
                onClick={() => {
                  setTrack(id);
                  setConfirmed(false);
                  setExperienceConfirmed(false);
                }}
                className={`rounded-2xl border p-5 text-left ${track === id ? "border-[#173f2b] bg-[#edf3e9] ring-2 ring-[#173f2b]" : "border-neutral-200 hover:border-neutral-400"}`}
              >
                <strong className="block text-lg">{title}</strong>
                <span className="mt-2 block font-medium text-neutral-700">
                  {lead}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-neutral-600">
                  {body}
                </span>
              </button>
            ))}
          </div>
          {track && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-xl font-medium">{c.safety}</h3>
              <p className="mt-2 text-sm text-neutral-600">{c.safetyIntro}</p>
              <div className="mt-4 space-y-3">
                {safetyItems[locale].map((item, index) => (
                  <label
                    key={item}
                    className="flex cursor-pointer gap-3 rounded-xl bg-white p-3"
                  >
                    <input
                      type="checkbox"
                      checked={riskAnswers[index]}
                      onChange={(e) =>
                        setRiskAnswers((v) =>
                          v.map((x, i) => (i === index ? e.target.checked : x)),
                        )
                      }
                      className="mt-1 h-5 w-5 accent-[#173f2b]"
                    />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {hasRisk && track && (
            <div
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 font-medium text-red-900"
              role="alert"
            >
              {c.blocked}
            </div>
          )}
          {!hasRisk && track && (
            <><label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-neutral-300 p-5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[#173f2b]"
              />
              <span className="font-medium leading-relaxed">{c.approval}</span>
            </label>{track!=="standard"&&<label className="mt-3 flex cursor-pointer gap-3 rounded-2xl border border-neutral-300 p-5"><input type="checkbox" checked={experienceConfirmed} onChange={(e)=>setExperienceConfirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-[#173f2b]"/><span className="font-medium leading-relaxed">{c.experience}</span></label>}</>
          )}
          {!hasRisk && showPlan && (
            <div className="mt-5 rounded-2xl bg-[#173f2b] p-5 text-white">
              <h3 className="text-xl font-medium">{c.ready}</h3>
              <p className="mt-3 leading-relaxed text-white/85">
                {track === "standard"
                  ? c.standardPlan
                  : track === "advanced"
                    ? c.advancedPlan
                    : c.veryAdvancedPlan}
              </p>
              <button type="button" disabled={saving||(track!=="standard"&&!experienceConfirmed)} onClick={()=>saveChallenge(true)} className="mt-5 w-full rounded-xl bg-white px-5 py-3 font-medium text-[#173f2b] disabled:opacity-50">{saving?"…":c.join}</button>
            </div>
          )}
          {savedEnrollment && <button type="button" disabled={saving} onClick={()=>saveChallenge(false)} className="mt-4 text-sm font-medium text-neutral-600 underline underline-offset-4">{c.withdraw}</button>}
          {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{message}</p>}
          {track && (
            <>
              <p className="mt-5 text-sm font-medium leading-relaxed text-red-800">
                {c.stops}
              </p>
              <p className="mt-3 text-sm text-neutral-500">{c.notMedical}</p>
              <a
                href={bookingUrl}
                target={bookingUrl.startsWith("http") ? "_blank" : undefined}
                rel={bookingUrl.startsWith("http") ? "noreferrer" : undefined}
                className="mt-5 block rounded-xl border border-[#173f2b] px-5 py-3 text-center font-medium text-[#173f2b]"
              >
                {c.book}
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
