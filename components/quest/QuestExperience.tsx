'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QUEST_ASSESSMENT, QuestLocale } from '@/lib/quest/assessment'
import { getQuestSupabase } from '@/lib/quest/supabase-browser'
import { FastingChallenge } from '@/components/quest/FastingChallenge'

type AnswerMap = Record<string, string>
type QuestState = {
  participant: { id: string; display_name: string; event_id: string; nutrition_events: { id: string; name: string; status: string; released_section: number; results_released: boolean; booking_url?: string } | Array<any> }
  attempt: { id: string; status: string; submitted_at?: string; section_scores?: number[]; total_score?: number; feedback?: { message: string; updated_at: string }; booking_url?: string; nutrition_answers?: Array<{ question_id: string; answer_key: string; score: number }> }
  fastingChallenge?: { opted_in:boolean; track?:'standard'|'advanced'|'very_advanced'; status:string } | null
  releasedDistribution?: number[]
  distributions?: Record<string, { section: number; respondents: number; questions: Array<{ id: string; counts: number[]; total: number }> }> | null
}

const copy = {
  en: { brand:'FITPRENEUR', title:'Nutrition Fitness Assessment', intro:'Nutrition Fitness is not a test of how many nutrition facts you know, how strict your diet is, or what you weigh.', detail:'It measures your ability to make intentional nutrition choices, understand how your body responds, recognize when your needs change, and adapt your approach accordingly.', instruction:'Answer based on your normal behaviour during the last 6–8 weeks, not what you think the correct answer should be. If you are genuinely between two answers, choose the lower one.', navLabel:'Your questions', howRoom:'How the room answered', roomNote:'Counts from everyone in the session. No names, and nobody sees an individual answer.', youChose:'you',  jumpNext:'Next unanswered', review:'Review my answers', doneReview:'Done reviewing', consistently:'Where an answer says “consistently”, read it as: this is what you do most of the time — not only in the weeks when everything is going well.', start:'Start assessment', previous:'Previous', next:'Next', save:'Saving…', waiting:'You are caught up', waitBody:'Your answers are saved. The next part will open automatically when the facilitator releases it.', paused:'The facilitator has paused the session. Your answers are safe.', submitted:'Your assessment is complete', resultWait:'Your answers are saved. Your results will appear when the facilitator releases them.', score:'Your Nutrition Fitness Score', meaning:'What your score means', meaningBody:'Your Nutrition Fitness Score reflects the fitness of your nutrition decision-making, not a diagnosis or measurement of your current health. The objective is not perfection. The assessment is designed to show you where your nutrition skills are already strong and where greater awareness, consistency or adaptability could give you more options.', learnMore:'I want to learn more', nextStep:'Your next step', feedback:'Personal feedback from Kenneth', book:'Book a session with Kenneth', email:'Email address', emailHelp:'Your account lets you continue securely on another device.', password:'Password', create:'Create account', login:'Log in', haveAccount:'Already have an account?', needAccount:'Need an account?', checkEmail:'Check your email and click “Confirm your email”. Then return here and log in.', code:'Event code', name:'Your name', join:'Join session', question:'Question', of:'of', part:'Part', noConnection:'No connection', reconnecting:'Checking…', reconnectFailed:'The server could not be reached. Offline mode is still active.', answerMissing:'This question’s answer was not recorded. Please mark it again.' },
  nb: { brand:'FITPRENEUR', title:'Vurdering av ernæringsfitness', intro:'Ernæringsfitness er ikke en test av hvor mange ernæringsfakta du kan, hvor strengt du spiser eller hva du veier.', detail:'Den måler evnen din til å ta bevisste ernæringsvalg, forstå hvordan kroppen reagerer, oppdage når behovene endrer seg og tilpasse tilnærmingen deretter.', instruction:'Svar ut fra din normale atferd de siste 6–8 ukene, ikke hva du tror er riktig svar. Hvis du står mellom to svar, velg det laveste.', navLabel:'Spørsmålene dine', howRoom:'Slik svarte rommet', roomNote:'Tall fra alle i økten. Ingen navn, og ingen ser et enkeltsvar.', youChose:'du',  jumpNext:'Neste ubesvarte', review:'Se over svarene mine', doneReview:'Ferdig med gjennomgangen', consistently:'Når et svar sier «konsekvent», les det som: dette er det du gjør mesteparten av tiden – ikke bare i ukene der alt går på skinner.', start:'Start vurderingen', previous:'Forrige', next:'Neste', save:'Lagrer …', waiting:'Du er à jour', waitBody:'Svarene dine er lagret. Neste del åpnes automatisk når fasilitatoren frigir den.', paused:'Fasilitatoren har satt økten på pause. Svarene dine er trygge.', submitted:'Vurderingen er fullført', resultWait:'Svarene dine er lagret. Resultatet vises når fasilitatoren frigir det.', score:'Din ernæringsfitness-score', meaning:'Hva poengsummen betyr', meaningBody:'Din ernæringsfitness-score gjenspeiler kvaliteten på beslutningene dine om ernæring, ikke en diagnose eller en måling av din nåværende helse. Målet er ikke perfeksjon. Vurderingen er laget for å vise hvor ernæringsferdighetene dine allerede er sterke, og hvor større bevissthet, konsistens eller tilpasningsevne kan gi deg flere valgmuligheter.', learnMore:'Jeg vil lære mer', nextStep:'Ditt neste steg', feedback:'Personlig tilbakemelding fra Kenneth', book:'Bestill en samtale med Kenneth', email:'E-postadresse', emailHelp:'Kontoen lar deg fortsette trygt på en annen enhet.', password:'Passord', create:'Opprett konto', login:'Logg inn', haveAccount:'Har du allerede en konto?', needAccount:'Trenger du en konto?', checkEmail:'Sjekk e-posten og klikk «Bekreft e-postadressen din». Gå deretter tilbake hit og logg inn.', code:'Arrangements­kode', name:'Navnet ditt', join:'Bli med', question:'Spørsmål', of:'av', part:'Del', noConnection:'Ingen forbindelse', reconnecting:'Sjekker …', reconnectFailed:'Kunne ikke nå serveren. Frakoblet modus er fortsatt aktiv.', answerMissing:'Svaret på dette spørsmålet ble ikke registrert. Vennligst marker det på nytt.' },
}

function resultGuidance(scores: number[], locale: QuestLocale) {
  const normalized = QUEST_ASSESSMENT.sections.map((section, index) => ({ section, score: Number(scores[index] || 0) }))
  const strongest = [...normalized].sort((a,b) => b.score-a.score)[0]
  const focus = [...normalized].sort((a,b) => a.score-b.score)[0]
  const focusAdvice = focus.score < 8
    ? (locale === 'nb' ? 'Velg én liten handling du kan gjenta denne uken, og observer hva som faktisk hjelper.' : 'Choose one small action you can repeat this week, and observe what genuinely helps.')
    : focus.score < 14
      ? (locale === 'nb' ? 'Gjør det du allerede vet mer konsekvent, og vurder effekten før du legger til mer.' : 'Make what you already know more consistent, and review its effect before adding more.')
      : (locale === 'nb' ? 'Finjuster denne styrken ved å teste én målrettet endring og evaluere responsen over tid.' : 'Refine this strength by testing one targeted change and reviewing the response over time.')
  const sectionActions: Record<string,{en:string;nb:string}> = {
    'section-1': { en:'Start by planning a repeatable meal structure around your usual energy, protein and training demands.', nb:'Start med å planlegge en repeterbar måltidsstruktur rundt ditt vanlige behov for energi, protein og trening.' },
    'section-2': { en:'Practise adapting one familiar meal when your schedule, appetite or activity changes, while keeping its nutritional purpose intact.', nb:'Øv på å tilpasse ett kjent måltid når timeplan, appetitt eller aktivitet endres, samtidig som måltidets ernæringsmessige formål beholdes.' },
    'section-3': { en:'Review likely persistent nutrient gaps across food quality, dietary pattern and supplements, using qualified guidance or relevant testing where useful.', nb:'Gå gjennom sannsynlige vedvarende næringsmangler knyttet til matkvalitet, kostholdsmønster og tilskudd, med kvalifisert veiledning eller relevant testing der det er nyttig.' },
    'section-4': { en:'Track a small set of signals—such as energy, digestion, recovery and performance—then change one variable at a time.', nb:'Følg et lite sett med signaler – som energi, fordøyelse, restitusjon og prestasjon – og endre én variabel om gangen.' },
    'section-5': { en:'Choose one habit that supports strength and long-term function, and make it realistic enough to maintain through changing life demands.', nb:'Velg én vane som støtter styrke og langsiktig funksjon, og gjør den realistisk nok til å opprettholde når livets krav endrer seg.' },
  }
  const targetedAction = sectionActions[focus.section.id][locale]
  return locale === 'nb'
    ? `Svarene dine tyder på at ${strongest.section.title.nb.toLowerCase()} er ditt sterkeste beslutningsområde akkurat nå. ${focus.section.title.nb} er området med mest rom for utvikling. ${focusAdvice} ${targetedAction} Dette er en refleksjon over svarmønsteret ditt, ikke en diagnose eller individuell medisinsk anbefaling.`
    : `Your answers suggest that ${strongest.section.title.en.toLowerCase()} is your strongest decision-making area right now. ${focus.section.title.en} offers the clearest room for development. ${focusAdvice} ${targetedAction} This reflects your answer pattern; it is not a diagnosis or individualized medical advice.`
}

function sectionGuidance(sectionIndex: number, score: number, answerRecords: QuestState['attempt']['nutrition_answers'], locale: QuestLocale) {
  const section = QUEST_ASSESSMENT.sections[sectionIndex]
  const sectionQuestions = QUEST_ASSESSMENT.questions.filter((question) => Math.ceil(question.order / 5) === section.order)
  const scoredAnswers = sectionQuestions.map((question) => ({
    question,
    score: Number(answerRecords?.find((answer) => answer.question_id === question.id)?.score ?? 0),
  }))
  const lowest = [...scoredAnswers].sort((a, b) => a.score - b.score)[0]
  const level = score <= 7 ? 0 : score <= 13 ? 1 : 2
  const meanings = locale === 'nb'
    ? [
        'Svarmønsteret viser at dette området ennå ikke er en stabil del av ernæringshverdagen din. Det betyr ikke at noe er galt; det viser hvor mer struktur kan gi størst utslag.',
        'Du har flere gode byggesteiner på plass, men de brukes ikke like konsekvent eller tilpasningsdyktig i alle situasjoner.',
        'Dette er et sterkt område for deg. Svarene tyder på gode, bevisste valg som du i stor grad kan gjenta og tilpasse.',
      ]
    : [
        'Your answer pattern suggests this area is not yet a reliable part of your nutrition routine. That does not mean something is wrong; it shows where more structure may have the greatest effect.',
        'You have several useful foundations in place, but they are not yet applied consistently or adaptably in every situation.',
        'This is a strong area for you. Your answers suggest thoughtful choices that you can largely repeat and adapt.',
      ]
  const guidance = [
    {
      en: { action: 'Build a simple meal framework you can repeat: decide in advance how regular meals will cover energy, protein, plants and your training demands.', benefit: 'Greater consistency can make daily choices easier and support steadier energy, recovery and performance.' },
      nb: { action: 'Bygg en enkel måltidsramme du kan gjenta: bestem på forhånd hvordan vanlige måltider skal dekke energi, protein, planter og treningsbehov.', benefit: 'Større konsistens kan gjøre hverdagsvalgene enklere og støtte jevnere energi, restitusjon og prestasjon.' },
    },
    {
      en: { action: 'Practise adjusting one familiar meal for a busy day, a training day and a rest day while preserving its nutritional purpose.', benefit: 'Better adaptability can help you stay well fuelled when appetite, schedule or activity changes.' },
      nb: { action: 'Øv på å tilpasse ett kjent måltid til en travel dag, en treningsdag og en hviledag, samtidig som næringsformålet beholdes.', benefit: 'Bedre tilpasningsevne kan hjelpe deg å dekke behovene når appetitt, timeplan eller aktivitet endres.' },
    },
    {
      en: { action: 'Review recurring nutritional gaps across your diet, food quality and supplement routine, and use qualified guidance or relevant testing where appropriate.', benefit: 'A more targeted approach can improve confidence that persistent needs are covered without relying on guesswork.' },
      nb: { action: 'Gå gjennom tilbakevendende ernæringsmessige gap i kosthold, matkvalitet og tilskuddsrutine, og bruk kvalifisert veiledning eller relevant testing ved behov.', benefit: 'En mer målrettet tilnærming kan gi større trygghet for at vedvarende behov dekkes uten gjetting.' },
    },
    {
      en: { action: 'Track a few useful signals—energy, digestion, recovery and performance—and change only one variable at a time.', benefit: 'Clearer feedback can help you distinguish what genuinely works for you from short-term noise.' },
      nb: { action: 'Følg noen nyttige signaler – energi, fordøyelse, restitusjon og prestasjon – og endre bare én variabel om gangen.', benefit: 'Tydeligere tilbakemelding kan hjelpe deg å skille det som faktisk fungerer for deg fra kortsiktige svingninger.' },
    },
    {
      en: { action: 'Choose one nutrition habit that supports strength and long-term function, then make it realistic enough to survive changing life demands.', benefit: 'A sustainable habit can protect capability and independence over time instead of depending on short bursts of motivation.' },
      nb: { action: 'Velg én ernæringsvane som støtter styrke og langsiktig funksjon, og gjør den realistisk nok til å tåle skiftende krav i livet.', benefit: 'En bærekraftig vane kan støtte funksjon og selvstendighet over tid, i stedet for å avhenge av korte motivasjonsperioder.' },
    },
  ][sectionIndex][locale]
  const focus = lowest && lowest.score < 4
    ? (locale === 'nb'
        ? `Svaret ditt på «${lowest.question.prompt.nb}» peker ut et konkret sted å begynne.`
        : `Your response to “${lowest.question.prompt.en}” identifies a concrete place to begin.`)
    : (locale === 'nb'
        ? 'Svarene dine er ganske jevne i denne delen, så velg den handlingen som er enklest å gjøre konsekvent.'
        : 'Your answers are fairly even in this section, so choose the action that is easiest to practise consistently.')
  return { meaning: meanings[level], focus, ...guidance }
}

function eventOf(state: QuestState | null) {
  const value = state?.participant?.nutrition_events
  return Array.isArray(value) ? value[0] : value
}

export function QuestExperience() {
  const [locale, setLocale] = useState<QuestLocale>('en')
  const [token, setToken] = useState('')
  const [state, setState] = useState<QuestState | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [screen, setScreen] = useState<'loading'|'signin'|'join'|'intro'|'questions'>('loading')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [authMode, setAuthMode] = useState<'signup'|'login'>('signup')
  const [accountName, setAccountName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [connectionBusy, setConnectionBusy] = useState(false)
  const [offlineCompleted, setOfflineCompleted] = useState(false)
  const [showNextStep, setShowNextStep] = useState(false)
  const [expandedResultSection, setExpandedResultSection] = useState<number | null>(null)
  const [expandedQuestionWhy, setExpandedQuestionWhy] = useState<string | null>(null)
  const [sectionIntro, setSectionIntro] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [waitingAtSection, setWaitingAtSection] = useState<number | null>(null)
  const previousReleased = useRef<number | null>(null)
  const answerSaveChain = useRef<Promise<void>>(Promise.resolve())
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelAutoAdvance = () => { if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null } }
  const t = copy[locale]

  const api = useCallback(async (path: string, init?: RequestInit, accessToken = token) => {
    const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) }, cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Something went wrong')
    return payload
  }, [token])

  const applyState = useCallback((next: QuestState | null) => {
    setState(next)
    if (!next) { setScreen('join'); return }
    const mapped: AnswerMap = {}
    next.attempt?.nutrition_answers?.forEach((answer) => { mapped[answer.question_id] = answer.answer_key })
    const local = JSON.parse(localStorage.getItem('nutrition-local-answers') || '{}') as AnswerMap
    const queued = JSON.parse(localStorage.getItem('nutrition-answer-queue') || '[]') as Array<{attemptId:string;questionId:string;answerKey:string}>
    const reconciled = Object.entries(local).reduce((items,[questionId,answerKey]) => {
      if (mapped[questionId] === answerKey) return items
      return [...items.filter((item) => item.questionId !== questionId), {attemptId:next.attempt.id,questionId,answerKey}]
    }, queued)
    if (reconciled.length) localStorage.setItem('nutrition-answer-queue',JSON.stringify(reconciled))
    setAnswers({...mapped,...local})
    setScreen((current) => current === 'loading' || current === 'signin' || current === 'join' ? 'intro' : current)
  }, [])

  const refresh = useCallback(async (accessToken = token) => {
    if (!accessToken) return
    const payload = await api('/api/quest/state', undefined, accessToken)
    applyState(payload.state)
  }, [api, applyState, token])

  useEffect(() => {
    const supabase = getQuestSupabase()
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const initialize = async () => {
      if (tokenHash && params.get('type') === 'signup') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' })
        window.history.replaceState({}, '', '/quest')
        if (error) setMessage('This confirmation link is invalid or has expired.')
      }
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token || ''
      setAccountName(String(data.session?.user.user_metadata?.display_name || ''))
      setToken(accessToken)
      if (!accessToken) setScreen('signin')
      else refresh(accessToken).catch((e) => { setMessage(e.message); setScreen('join') })
    }
    initialize().catch((error) => { setMessage(error instanceof Error ? error.message : 'Could not confirm account'); setScreen('signin') })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (session?.access_token) { setToken(session.access_token); setAccountName(String(session.user.user_metadata?.display_name || '')); refresh(session.access_token).catch(() => setScreen('join')) } })
    return () => listener.subscription.unsubscribe()
  }, [refresh])

  useEffect(() => {
    setOfflineMode(localStorage.getItem('nutrition-offline-mode') === '1')
    setOfflineCompleted(localStorage.getItem('nutrition-offline-completed') === '1')
  }, [])

  useEffect(() => {
    if (!token || !state) return
    const id = setInterval(() => refresh().catch(() => undefined), 4000)
    return () => clearInterval(id)
  }, [refresh, state, token])

  useEffect(() => {
    const sync = async () => {
      const raw = localStorage.getItem('nutrition-answer-queue')
      if (!token || offlineMode || !navigator.onLine) return
      const queued = JSON.parse(raw || '[]') as Array<{attemptId:string;questionId:string;answerKey:string}>
      const failed:Array<{attemptId:string;questionId:string;answerKey:string}>=[]
      for(const item of queued){let saved=false;answerSaveChain.current=answerSaveChain.current.then(async()=>{try{await api('/api/quest/answer',{method:'POST',body:JSON.stringify(item)});saved=true}catch{}});await answerSaveChain.current;if(!saved)failed.push(item)}
      if(failed.length)localStorage.setItem('nutrition-answer-queue',JSON.stringify(failed));else localStorage.removeItem('nutrition-answer-queue')
      if(localStorage.getItem('nutrition-backup-pending')==='1'&&state?.attempt?.id){try{await api('/api/quest/backup',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,displayName:state.participant.display_name,answers:JSON.parse(localStorage.getItem('nutrition-local-answers')||'{}')})});localStorage.removeItem('nutrition-backup-pending')}catch{}}
      if(failed.length===0&&localStorage.getItem('nutrition-offline-completed')==='1'&&state?.attempt?.id){try{await api('/api/quest/submit',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id})});localStorage.removeItem('nutrition-offline-completed');localStorage.removeItem('nutrition-offline-mode');localStorage.removeItem('nutrition-local-answers');setOfflineCompleted(false);setOfflineMode(false);await refresh()}catch{}}
    }
    const interval = setInterval(sync,2000)
    window.addEventListener('online', sync); sync()
    return () => { clearInterval(interval); window.removeEventListener('online', sync) }
  }, [api, token, state, refresh, offlineMode])

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    const name = String(form.get('name') || '').trim()
    if (authMode === 'signup' && password !== confirmPassword) { setMessage(locale==='nb'?'Passordene er ikke like.':'Passwords do not match.'); return }
    setAuthBusy(true)
    try {
      if (authMode === 'signup') {
        const response = await fetch('/api/quest/register', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({name,email,password}) })
        const payload = await response.json()
        if (!response.ok) setMessage(payload.error || 'Registration could not be completed.')
        else { setAccountName(name); setMessage(t.checkEmail); setAuthMode('login') }
      } else {
        const { error } = await getQuestSupabase().auth.signInWithPassword({email,password})
        if (error) setMessage(error.message === 'Email not confirmed' ? t.checkEmail : error.message)
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not connect. Please try again.') }
    finally { setAuthBusy(false) }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('')
    try { const form = new FormData(event.currentTarget); const payload = await api('/api/quest/join', { method:'POST', body:JSON.stringify({ code:form.get('code'), displayName:form.get('displayName') }) }); applyState(payload.state) }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not join') }
  }

  const released = eventOf(state)?.released_section ?? 0
  const releasedQuestions = useMemo(() => offlineMode ? QUEST_ASSESSMENT.questions : QUEST_ASSESSMENT.questions.filter((q) => q.order <= released * 5), [released,offlineMode])
  const current = QUEST_ASSESSMENT.questions[questionIndex]
  const section = QUEST_ASSESSMENT.sections.find((s) => s.order === Math.ceil((current?.order || 1) / 5))
  const releasedComplete = releasedQuestions.every((question) => answers[question.id])
  const allComplete = QUEST_ASSESSMENT.questions.every((question) => answers[question.id])

  // Every move to new content on a phone should start at the top with the
  // question list folded away, otherwise the disclosure and the previous
  // scroll position push the question off screen.
  useEffect(() => {
    if (screen !== 'questions') return
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    const heading = document.getElementById('quest-focus')
    if (heading instanceof HTMLElement) heading.focus({ preventScroll: true })
  }, [questionIndex, screen, sectionIntro, waitingAtSection])

  // The cohort spread appears below the question list on the waiting screen,
  // which is off-screen on a phone, so nobody would notice it arrive.
  const distributionShown = Boolean(state?.distributions?.[String(released)])
  useEffect(() => {
    if (!distributionShown || waitingAtSection === null) return
    const id = window.setTimeout(() => {
      const panel = document.getElementById('quest-distribution')
      if (panel instanceof HTMLElement) panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(id)
  }, [distributionShown, waitingAtSection])

  // Results arrive underneath the waiting message, so bring them into view
  // rather than leaving the participant looking at an unchanged screen.
  const resultsOnScreen = Boolean(state?.attempt?.submitted_at) && Boolean(eventOf(state)?.results_released)
  useEffect(() => {
    if (!resultsOnScreen) return
    const id = window.setTimeout(() => {
      const results = document.getElementById('quest-results')
      if (results instanceof HTMLElement) {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' })
        results.focus({ preventScroll: true })
      }
    }, 120)
    return () => window.clearTimeout(id)
  }, [resultsOnScreen])

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])

  useEffect(() => {
    if (!state || offlineMode) return
    const priorRelease = previousReleased.current
    previousReleased.current = released
    const firstUnanswered = QUEST_ASSESSMENT.questions.findIndex((question) => question.order <= released * 5 && !answers[question.id])
    // Only place the cursor on the first unanswered question when arriving/resuming.
    // Running this on every render made it a magnet: navigating back to an answered
    // question was instantly undone, and answering a question ahead of an
    // already-answered one skipped over it.
    if (priorRelease === null && firstUnanswered >= 0 && firstUnanswered > questionIndex) setQuestionIndex(firstUnanswered)
    if (priorRelease === null && firstUnanswered === -1 && released > 0) { setQuestionIndex(Math.min(24,released * 5 - 1)); if (released < 5) setWaitingAtSection(released) }
    if (priorRelease !== null && released > priorRelease) {
      const firstQuestionIndex = (released - 1) * 5
      setWaitingAtSection(null)
      setQuestionIndex(firstQuestionIndex)
      setSectionIntro(released)
    } else if (priorRelease === null && firstUnanswered >= 5 && firstUnanswered % 5 === 0) {
      setQuestionIndex(firstUnanswered)
      setSectionIntro(Math.floor(firstUnanswered / 5) + 1)
    }
  }, [answers, offlineMode, questionIndex, released, state])

  useEffect(() => {
    if (!offlineMode || !state?.attempt?.id || Object.keys(answers).length !== 25) return
    localStorage.setItem('nutrition-offline-completed','1')
    localStorage.setItem('nutrition-backup-pending','1')
    setOfflineCompleted(true)
    if (!navigator.onLine) return
    api('/api/quest/backup',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,answers})})
      .then(()=>{localStorage.removeItem('nutrition-backup-pending');refresh().catch(()=>undefined)})
      .catch(()=>undefined)
  }, [answers,api,offlineMode,refresh,state])

  async function choose(questionId: string, answerKey: string) {
    if (!state?.attempt?.id) return
    const wasUnanswered = !answers[questionId]
    const nextAnswers={...answers,[questionId]:answerKey};setAnswers(nextAnswers);localStorage.setItem('nutrition-local-answers',JSON.stringify(nextAnswers));setMessage('')
    const item = { attemptId:state.attempt.id, questionId, answerKey }
    const currentSectionNumber = Math.ceil(current.order / 5)
    const currentSectionComplete = QUEST_ASSESSMENT.questions.filter((question)=>Math.ceil(question.order/5)===currentSectionNumber).every((question)=>nextAnswers[question.id])
    const shouldVerifySection = wasUnanswered && !offlineMode && released < 5 && currentSectionNumber === released && currentSectionComplete
    const queue = JSON.parse(localStorage.getItem('nutrition-answer-queue') || '[]');localStorage.setItem('nutrition-answer-queue',JSON.stringify([...queue.filter((q:any)=>q.questionId!==questionId),item]))
    if(wasUnanswered&&questionIndex<releasedQuestions.length-1&&!shouldVerifySection)advanceTimer.current=setTimeout(()=>{advanceTimer.current=null;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();setQuestionIndex((index)=>Math.min(index+1,releasedQuestions.length-1))},160)
    if(!offlineMode&&navigator.onLine){answerSaveChain.current=answerSaveChain.current.then(async()=>{try{await api('/api/quest/answer',{method:'POST',body:JSON.stringify(item)});const remaining=(JSON.parse(localStorage.getItem('nutrition-answer-queue')||'[]')as typeof queue).filter((q:any)=>q.questionId!==questionId||q.answerKey!==answerKey);if(remaining.length)localStorage.setItem('nutrition-answer-queue',JSON.stringify(remaining));else localStorage.removeItem('nutrition-answer-queue')}catch{}});await answerSaveChain.current}
    if(shouldVerifySection){try{const payload=await api('/api/quest/state');const recorded=new Set((payload.state?.attempt?.nutrition_answers||[]).map((answer:{question_id:string})=>answer.question_id));const missing=QUEST_ASSESSMENT.questions.find((question)=>Math.ceil(question.order/5)===currentSectionNumber&&!recorded.has(question.id));if(missing){setQuestionIndex(missing.order-1);setMessage(t.answerMissing)}else{setWaitingAtSection(released)}}catch{setMessage(t.answerMissing)}}
  }

  async function submit() {
    if (!state?.attempt?.id || !allComplete) return
    setSaving(true)
    if(offlineMode){localStorage.setItem('nutrition-backup-pending','1');localStorage.setItem('nutrition-offline-completed','1');setOfflineCompleted(true);if(navigator.onLine){try{await api('/api/quest/backup',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,displayName:state.participant.display_name,answers})});localStorage.removeItem('nutrition-backup-pending')}catch{}}setSaving(false);return}
    try {
      // Answers are saved one at a time as they are chosen; a failed request is
      // swallowed so it cannot interrupt the session, which means the server can
      // legitimately be missing an answer the participant can see ticked here.
      // Push anything it is missing before submitting, so a dropped request does
      // not strand someone on the last question.
      try {
        const payload = await api('/api/quest/state')
        const recorded = new Set((payload.state?.attempt?.nutrition_answers || []).map((entry: { question_id: string }) => entry.question_id))
        const unsynced = QUEST_ASSESSMENT.questions.filter((question) => answers[question.id] && !recorded.has(question.id))
        for (const question of unsynced) await api('/api/quest/answer',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,questionId:question.id,answerKey:answers[question.id]})})
      } catch {}
      await api('/api/quest/submit',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id})});localStorage.removeItem('nutrition-local-answers');await refresh() }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not submit') } finally { setSaving(false) }
  }

  async function toggleOfflineMode() {
    setMessage('')
    if (!offlineMode) {
      setOfflineMode(true)
      localStorage.setItem('nutrition-offline-mode','1')
      return
    }
    setConnectionBusy(true)
    try {
      if (!navigator.onLine) throw new Error(t.reconnectFailed)
      const payload = await api('/api/quest/state')
      applyState(payload.state)
      localStorage.removeItem('nutrition-offline-mode')
      setOfflineMode(false)
      window.dispatchEvent(new Event('online'))
    } catch {
      setMessage(t.reconnectFailed)
    } finally {
      setConnectionBusy(false)
    }
  }

  let resultAddon: React.ReactNode = null
  const releasedLimit = offlineMode ? 25 : released * 5
  const firstUnansweredIndex = QUEST_ASSESSMENT.questions.findIndex((item) => item.order <= releasedLimit && !answers[item.id])
  const goToQuestion = (index: number) => { cancelAutoAdvance(); setNavOpen(false); setWaitingAtSection(null); setSectionIntro(null); setMessage(''); setQuestionIndex(index) }
  const navInner = (
    <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1 lg:max-h-[calc(100vh-9rem)]">
      {QUEST_ASSESSMENT.sections.filter((item) => (item.order - 1) * 5 < releasedLimit).map((item) => (
        <div key={item.id}>
          <p className="mb-2 text-sm font-medium">{item.order}. {item.title[locale]}</p>
          <ul className="space-y-1">
            {item.questions.filter((entry) => entry.order <= releasedLimit).map((entry) => {
              const idx = entry.order - 1
              const isCurrent = screen === 'questions' && !sectionIntro && waitingAtSection === null && idx === questionIndex
              const answered = Boolean(answers[entry.id])
              return (
                <li key={entry.id}>
                  <button type="button" onClick={() => goToQuestion(idx)} aria-current={isCurrent ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${isCurrent ? 'bg-[#173f2b] text-white' : 'hover:bg-[#f3f7f0]'}`}>
                    <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${isCurrent ? 'bg-white text-[#173f2b]' : answered ? 'bg-[#3f7354] text-white' : 'border border-neutral-300 text-neutral-400'}`}>{answered ? '✓' : entry.order}</span>
                    <span className="truncate">{entry.prompt[locale]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
  const shell = (body: React.ReactNode, withNav = false) => <main className="min-h-screen bg-[#f3f0e8] px-4 py-5 text-[#17251d] sm:px-6 sm:py-10"><div className={`mx-auto ${withNav && releasedLimit > 0 ? 'max-w-6xl' : 'max-w-3xl'}`}><header className="mb-7 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold tracking-[.25em]">FITPRENEUR</span><div className="flex items-center gap-2"><button type="button" aria-pressed={offlineMode} disabled={connectionBusy} onClick={toggleOfflineMode} className={`rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60 ${offlineMode?'bg-amber-100 text-amber-900 ring-2 ring-amber-500':'border border-neutral-300 bg-white'}`}>{connectionBusy?t.reconnecting:t.noConnection}</button><div className="flex rounded-full bg-white p-1 shadow-sm"><button onClick={()=>setLocale('en')} aria-pressed={locale==='en'} className={`rounded-full px-3 py-1 text-sm ${locale==='en'?'bg-[#173f2b] text-white':''}`}>EN</button><button onClick={()=>setLocale('nb')} aria-pressed={locale==='nb'} className={`rounded-full px-3 py-1 text-sm ${locale==='nb'?'bg-[#173f2b] text-white':''}`}>NO</button></div></div></header>{withNav && releasedLimit > 0 ? <div className="lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-8 lg:items-start"><div><details open={navOpen} onToggle={(e)=>setNavOpen((e.currentTarget as HTMLDetailsElement).open)} className="mb-5 rounded-2xl bg-white p-4 shadow-sm lg:hidden"><summary className="cursor-pointer text-sm font-semibold">{t.navLabel}</summary><div className="mt-3">{navInner}</div></details><nav aria-label={t.navLabel} className="hidden rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:block"><p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">{t.navLabel}</p>{navInner}</nav></div><div>{body}{resultAddon}</div></div> : <>{body}{resultAddon}</>}</div></main>
  if (screen === 'loading') return shell(<p className="py-20 text-center">Loading…</p>)
  if (screen === 'signin') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Secure access</p><h1 className="mb-6 text-4xl font-medium">{authMode==='signup'?t.create:t.login}</h1><form onSubmit={authenticate}>{authMode==='signup'&&<label className="mb-4 block font-medium">{t.name}<input name="name" required maxLength={80} autoComplete="name" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>}<label className="mb-4 block font-medium">{t.email}<input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label><label className="mb-4 block font-medium">{t.password}<input name="password" type="password" minLength={8} required autoComplete={authMode==='signup'?'new-password':'current-password'} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>{authMode==='signup'&&<label className="block font-medium">{locale==='nb'?'Bekreft passord':'Confirm password'}<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>}<p className="mb-5 mt-2 text-sm text-neutral-500">{t.emailHelp}</p><button disabled={authBusy} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white disabled:opacity-50">{authBusy?(locale==='nb'?'Vent litt …':'Please wait…'):(authMode==='signup'?t.create:t.login)}</button></form><button type="button" disabled={authBusy} onClick={()=>{setMessage('');setAuthMode(authMode==='signup'?'login':'signup')}} className="mt-5 w-full text-sm font-medium underline underline-offset-4 disabled:opacity-50">{authMode==='signup'?`${t.haveAccount} ${t.login}`:`${t.needAccount} ${t.create}`}</button>{message&&<p className="mt-4 rounded-xl bg-[#edf3e9] p-4" role="status">{message}</p>}</section>)
  if (screen === 'join') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><h1 className="mb-6 text-4xl font-medium">Join the live session</h1><form onSubmit={join}><label className="mb-5 block font-medium">{t.code}<input name="code" required autoCapitalize="characters" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4 uppercase tracking-[.18em]" /></label><label className="mb-6 block font-medium">{t.name}<input name="displayName" required defaultValue={accountName} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label><button className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{t.join}</button></form>{message&&<p className="mt-4 text-red-700" role="alert">{message}</p>}</section>)
  if (screen === 'intro') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-12"><p className="mb-4 text-xs font-semibold tracking-[.25em] text-emerald-800">{t.brand}</p><h1 className="mb-6 text-4xl font-medium sm:text-6xl">{t.title}</h1><p className="mb-4 text-lg">{t.intro}</p><p className="mb-7 text-neutral-600">{t.detail}</p><div className="mb-8 rounded-2xl bg-[#edf3e9] p-5"><p className="font-medium">{t.instruction}</p><p className="mt-3 text-sm text-neutral-600">{t.consistently}</p></div><button onClick={()=>{setQuestionIndex(0);setScreen('questions')}} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{t.start}</button></section>)

  const event = eventOf(state)
  if (event?.status === 'paused' && !offlineMode) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">Pause</h1><p>{t.paused}</p></section>)
  if (!offlineMode && released === 0) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><div className="mx-auto mb-6 h-12 w-12 animate-pulse rounded-full bg-[#edf3e9]" aria-hidden="true" /><h1 className="mb-4 text-4xl font-medium">{locale==='nb'?'Venter på oppstart':'Waiting to begin'}</h1><p>{locale==='nb'?'Fasilitatoren starter del 1 snart. Denne siden oppdateres automatisk.':'The facilitator will start Part 1 shortly. This page will update automatically.'}</p></section>)
  if (!offlineMode && sectionIntro) {
    const introSection = QUEST_ASSESSMENT.sections.find((item) => item.order === sectionIntro)
    return shell(<section className="rounded-[2rem] bg-white p-7 shadow-sm sm:p-12"><p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">{t.part} {sectionIntro} / 5</p><h1 className="mb-5 text-4xl font-medium sm:text-5xl">{introSection?.title[locale]}</h1><p className="mb-8 text-lg leading-relaxed text-neutral-600">{introSection?.description[locale]}</p><button onClick={()=>{setQuestionIndex((sectionIntro-1)*5);setSectionIntro(null)}} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{locale==='nb'?`Start del ${sectionIntro}`:`Start Part ${sectionIntro}`}</button></section>)
  }
  if (offlineCompleted && !state?.attempt?.submitted_at) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">{t.submitted}</h1><p>{t.resultWait}</p></section>)
  if (state?.attempt?.submitted_at) {
    if (!event?.results_released) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">{t.submitted}</h1><p>{t.resultWait}</p></section>)
    const sectionScores = state.attempt.section_scores || [0,0,0,0,0]
    const feedback = state.attempt.feedback?.message
    const bookingUrl = state.attempt.booking_url || event.booking_url || process.env.NEXT_PUBLIC_QUEST_BOOKING_URL || `mailto:kennethtinglum@bni.com?subject=${encodeURIComponent(locale==='nb'?'Samtale om ernæringsfitness':'Nutrition Fitness follow-up session')}`
    resultAddon = <FastingChallenge locale={locale} sectionScores={sectionScores} answerRecords={state.attempt.nutrition_answers} bookingUrl={bookingUrl} accessToken={token} enrollment={state.fastingChallenge} />
    return shell(<section id="quest-results" tabIndex={-1} className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10 focus:outline-none"><p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">{t.score}</p><h1 className="my-4 text-6xl font-medium">{state.attempt.total_score} <span className="text-2xl text-neutral-400">/ 100</span></h1><div className="my-8 space-y-3">{QUEST_ASSESSMENT.sections.map((s,i)=>{const expanded=expandedResultSection===i;const guidance=sectionGuidance(i,Number(sectionScores[i]||0),state.attempt.nutrition_answers,locale);return <div key={s.id} className="overflow-hidden rounded-2xl border border-neutral-200"><button type="button" aria-expanded={expanded} aria-controls={`section-result-${i}`} onClick={()=>setExpandedResultSection(expanded?null:i)} className="w-full p-4 text-left hover:bg-[#f7faf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f2b]"><div className="mb-2 flex items-center justify-between gap-4"><span className="font-medium">{s.title[locale]}</span><span className="flex shrink-0 items-center gap-3"><strong>{sectionScores[i]} / 20</strong><span aria-hidden="true" className="text-xl">{expanded?'−':'+'}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-[#3f7354]" style={{width:`${sectionScores[i]*5}%`}} /></div></button>{expanded&&<div id={`section-result-${i}`} className="quest-question-enter border-t border-neutral-200 bg-[#f7faf5] p-5"><p className="leading-relaxed text-neutral-700">{guidance.meaning}</p><p className="mt-3 leading-relaxed text-neutral-700">{guidance.focus}</p><h3 className="mb-1 mt-5 font-semibold">{locale==='nb'?'Hva du kan utvikle':'What you can build'}</h3><p className="leading-relaxed text-neutral-700">{guidance.action}</p><h3 className="mb-1 mt-5 font-semibold">{locale==='nb'?'Hva du kan få igjen for det':'What you could gain'}</h3><p className="leading-relaxed text-neutral-700">{guidance.benefit}</p><h3 className="mb-3 mt-6 font-semibold">{locale==='nb'?'Spørsmål for spørsmål':'Question by question'}</h3><div className="space-y-2">{QUEST_ASSESSMENT.questions.filter((question)=>Math.ceil(question.order/5)===s.order).map((question)=>{const record=state.attempt.nutrition_answers?.find((a)=>a.question_id===question.id);const chosen=question.choices.find((c)=>c.id===record?.answer_key);const whyOpen=expandedQuestionWhy===question.id;return <div key={question.id} className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs font-semibold text-emerald-800">Q{question.order} · {record?.score ?? 0} / 4</p><p className="mt-1 font-medium">{question.prompt[locale]}</p>{chosen&&<p className="mt-2 text-sm text-neutral-600"><span className="font-medium">{locale==='nb'?'Ditt svar':'Your answer'} ({chosen.id}):</span> {chosen.text[locale]}</p>}{question.assesses&&<p className="mt-2 text-sm text-neutral-500"><span className="font-medium">{locale==='nb'?'Hva spørsmålet måler':'What this assesses'}:</span> {question.assesses[locale]}</p>}{question.why&&<><button type="button" aria-expanded={whyOpen} aria-controls={`why-${question.id}`} onClick={()=>setExpandedQuestionWhy(whyOpen?null:question.id)} className="mt-3 text-sm font-medium text-[#173f2b] underline underline-offset-4">{whyOpen?(locale==='nb'?'Skjul':'Hide'):(locale==='nb'?'Hvorfor dette betyr noe':'Why this matters')}</button>{whyOpen&&<p id={`why-${question.id}`} className="quest-question-enter mt-3 rounded-lg bg-[#f7faf5] p-3 text-sm leading-relaxed text-neutral-700">{question.why[locale]}</p>}</>}</div>})}</div><p className="mt-5 text-sm text-neutral-500">{locale==='nb'?'Dette er en refleksjon basert på svarene dine, ikke en diagnose eller individuell medisinsk anbefaling.':'This is a reflection based on your answers, not a diagnosis or individualized medical advice.'}</p></div>}</div>})}</div><p className="mb-6 text-center text-sm text-neutral-500">{locale==='nb'?'Trykk på en del for å se din personlige tilbakemelding.':'Select any section to see your personalized feedback.'}</p><h2 className="mb-3 text-2xl font-medium">{t.meaning}</h2><p className="text-neutral-600">{t.meaningBody}</p>{feedback&&<aside className="mt-8 rounded-2xl bg-[#edf3e9] p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-900">{t.feedback}</p><p className="whitespace-pre-wrap leading-relaxed">{feedback}</p></aside>}<button type="button" aria-expanded={showNextStep} onClick={()=>setShowNextStep((shown)=>!shown)} className="mt-8 w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{t.learnMore}</button>{showNextStep&&<div className="quest-question-enter mt-5 rounded-2xl border border-[#cddbcf] bg-[#f7faf5] p-5 sm:p-7"><h2 className="mb-3 text-2xl font-medium">{t.nextStep}</h2><p className="leading-relaxed text-neutral-700">{resultGuidance(sectionScores,locale)}</p><a href={bookingUrl} target={bookingUrl.startsWith('http')?'_blank':undefined} rel={bookingUrl.startsWith('http')?'noreferrer':undefined} className="mt-6 block rounded-xl border border-[#173f2b] bg-white px-5 py-3 text-center font-medium text-[#173f2b]">{t.book}</a></div>}</section>)
  }
  if (!offlineMode && waitingAtSection === released && released < 5) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">{t.part} {released} / 5</p><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3e9] text-2xl" aria-hidden="true">✓</div><h1 id="quest-focus" tabIndex={-1} className="mb-4 text-4xl font-medium focus:outline-none">{locale==='nb'?`Del ${released} er fullført`:`Part ${released} completed`}</h1><p>{locale==='nb'?`Venter på at fasilitatoren åpner del ${released+1}.`:`Waiting for the facilitator to open Part ${released+1}.`}</p><button onClick={()=>{setWaitingAtSection(null);setQuestionIndex(Math.max(0,releasedQuestions.length-1))}} className="mt-7 rounded-xl border border-neutral-300 px-5 py-3">{t.review}</button><ul className="mx-auto mt-7 max-w-xl space-y-2 text-left">{QUEST_ASSESSMENT.questions.filter((entry)=>Math.ceil(entry.order/5)===released).map((entry)=>{const answered=Boolean(answers[entry.id]);const chosen=entry.choices.find((choice)=>choice.id===answers[entry.id]);return <li key={entry.id}><button type="button" onClick={()=>goToQuestion(entry.order-1)} className="flex w-full items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-[#173f2b]"><span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${answered?'bg-[#3f7354] text-white':'border border-neutral-300 text-neutral-400'}`}>{answered?'✓':entry.order}</span><span className="min-w-0"><span className="block text-sm font-medium">{entry.prompt[locale]}</span>{chosen&&<span className="mt-0.5 block truncate text-xs text-neutral-500">{chosen.id} · {chosen.text[locale]}</span>}</span></button></li>})}</ul>{(() => { const d = state?.distributions?.[String(released)]; if (!d) return null; return (<div id="quest-distribution" className="mt-8 border-t border-neutral-200 pt-6 text-left"><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">{t.howRoom}</p><p className="mt-1 text-sm text-neutral-500">{t.roomNote}</p><div className="mt-5 space-y-5">{d.questions.map((entry) => { const question = QUEST_ASSESSMENT.questions.find((item) => item.id === entry.id); if (!question) return null; const mine = answers[entry.id]; return (<div key={entry.id}><p className="mb-2 text-sm font-medium">{question.order}. {question.prompt[locale]}</p><div className="space-y-1">{entry.counts.map((count, index) => { const letter = 'ABCDE'[index]; const percent = entry.total ? Math.round(count / entry.total * 100) : 0; const isMine = mine === letter; return (<div key={letter} className="flex items-center gap-3"><span className={`w-4 shrink-0 text-xs font-semibold ${isMine ? 'text-[#173f2b]' : 'text-neutral-400'}`}>{letter}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${letter}: ${count} of ${entry.total}, ${percent} percent`}><div className={`h-full rounded-full ${isMine ? 'bg-[#173f2b]' : 'bg-[#8fb3a0]'}`} style={{ width: `${percent}%` }} /></div><span className="w-16 shrink-0 text-right text-xs text-neutral-500">{percent}%{isMine ? ` · ${t.youChose}` : ''}</span></div>); })}</div></div>); })}</div></div>); })()}</section>, true)

  const questionTone = ['bg-white','bg-[#fbf7ee]','bg-[#f2f7f0]'][current.order%3]
  return shell(<><div className="mb-5"><div className="mb-2 flex justify-between text-sm"><span>{t.part} {section?.order} / 5</span><span>{t.question} {current.order} {t.of} 25</span></div><div className="h-2 overflow-hidden rounded-full bg-[#d9ddd5]" role="progressbar" aria-valuemin={0} aria-valuemax={25} aria-valuenow={current.order}><div className="h-full bg-[#3f7354] transition-all" style={{width:`${current.order*4}%`}} /></div></div><section key={current.id} className={`quest-question-enter rounded-[2rem] p-5 shadow-sm sm:p-10 ${questionTone}`}><p className="mb-4 text-sm font-medium uppercase tracking-[.14em] text-emerald-800">{section?.title[locale]}</p><h1 id="quest-focus" tabIndex={-1} className="mb-3 text-2xl font-medium sm:text-4xl focus:outline-none">{current.prompt[locale]}</h1>{current.context&&<p className="mb-5 text-neutral-500">{current.context[locale]}</p>}<fieldset className="space-y-3"><legend className="sr-only">Choose one answer</legend>{current.choices.map((choice)=><label key={`${current.id}-${choice.id}`} className={`flex min-h-[68px] cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${answers[current.id]===choice.id?'border-[#173f2b] bg-[#edf3e9] ring-2 ring-[#173f2b]':'border-neutral-200 bg-white/70 hover:border-neutral-400'}`}><input type="radio" name={current.id} value={choice.id} checked={answers[current.id]===choice.id} onChange={()=>choose(current.id,choice.id)} className="mt-1 h-5 w-5 accent-[#173f2b]"/><span><strong className="mr-2 font-medium">{choice.id}</strong>{choice.text[locale]}</span></label>)}</fieldset>{message&&<p className="mt-4 text-sm text-amber-800" role="status">{message}</p>}<div className="mt-7 flex flex-wrap items-center gap-3 sm:justify-between"><button type="button" disabled={questionIndex===0} onClick={()=>{cancelAutoAdvance();setQuestionIndex((i)=>Math.max(0,i-1))}} className="rounded-xl border border-neutral-300 px-5 py-3 disabled:opacity-30">{t.previous}</button>{firstUnansweredIndex>=0&&firstUnansweredIndex!==questionIndex&&<button type="button" onClick={()=>goToQuestion(firstUnansweredIndex)} className="rounded-xl border border-[#173f2b] px-4 py-3 text-sm font-medium text-[#173f2b]">{t.jumpNext}</button>}{current.order===25?<button type="button" disabled={!allComplete||saving} onClick={submit} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">{saving?t.save:t.submitted}</button>:questionIndex<releasedQuestions.length-1?<button type="button" disabled={!answers[current.id]||saving} onClick={()=>{cancelAutoAdvance();setQuestionIndex((i)=>i+1)}} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">{saving?t.save:t.next}</button>:(releasedComplete&&released<5&&!offlineMode?<button type="button" onClick={()=>setWaitingAtSection(released)} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white">{t.doneReview}</button>:<span />)}</div></section></>, true)
}
