'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { QUEST_ASSESSMENT, QuestLocale } from '@/lib/quest/assessment'
import { getQuestSupabase } from '@/lib/quest/supabase-browser'

type AnswerMap = Record<string, string>
type QuestState = {
  participant: { id: string; display_name: string; event_id: string; nutrition_events: { id: string; name: string; status: string; released_section: number; results_released: boolean } | Array<any> }
  attempt: { id: string; status: string; submitted_at?: string; section_scores?: number[]; total_score?: number; nutrition_answers?: Array<{ question_id: string; answer_key: string; score: number }> }
}

const copy = {
  en: { brand:'FITPRENEUR', title:'Nutrition Fitness Assessment', intro:'Nutrition Fitness is not a test of how many nutrition facts you know, how strict your diet is, or what you weigh.', detail:'It measures your ability to make intentional nutrition choices, understand how your body responds, recognize when your needs change, and adapt your approach accordingly.', instruction:'Answer based on your normal behaviour during the last 6–8 weeks, not what you think the correct answer should be. If you are genuinely between two answers, choose the lower one.', start:'Start assessment', previous:'Previous', next:'Next', save:'Saving…', waiting:'You are caught up', waitBody:'Your answers are saved. The next part will open automatically when the facilitator releases it.', paused:'The facilitator has paused the session. Your answers are safe.', submitted:'Your assessment is complete', resultWait:'Your answers are saved. Your results will appear when the facilitator releases them.', score:'Your Nutrition Fitness Score', meaning:'What your score means', meaningBody:'Your Nutrition Fitness Score reflects the fitness of your nutrition decision-making, not a diagnosis or measurement of your current health. The objective is not perfection. The assessment is designed to show you where your nutrition skills are already strong and where greater awareness, consistency or adaptability could give you more options.', email:'Email address', emailHelp:'Your account lets you continue securely on another device.', password:'Password', create:'Create account', login:'Log in', haveAccount:'Already have an account?', needAccount:'Need an account?', checkEmail:'Check your email and click “Confirm your email”. Then return here and log in.', code:'Event code', name:'Your name', join:'Join session', question:'Question', of:'of', part:'Part', noConnection:'No connection', reconnecting:'Checking…', reconnectFailed:'The server could not be reached. Offline mode is still active.' },
  nb: { brand:'FITPRENEUR', title:'Vurdering av ernæringsfitness', intro:'Ernæringsfitness er ikke en test av hvor mange ernæringsfakta du kan, hvor strengt du spiser eller hva du veier.', detail:'Den måler evnen din til å ta bevisste ernæringsvalg, forstå hvordan kroppen reagerer, oppdage når behovene endrer seg og tilpasse tilnærmingen deretter.', instruction:'Svar ut fra din normale atferd de siste 6–8 ukene, ikke hva du tror er riktig svar. Hvis du står mellom to svar, velg det laveste.', start:'Start vurderingen', previous:'Forrige', next:'Neste', save:'Lagrer …', waiting:'Du er à jour', waitBody:'Svarene dine er lagret. Neste del åpnes automatisk når fasilitatoren frigir den.', paused:'Fasilitatoren har satt økten på pause. Svarene dine er trygge.', submitted:'Vurderingen er fullført', resultWait:'Svarene dine er lagret. Resultatet vises når fasilitatoren frigir det.', score:'Din ernæringsfitness-score', meaning:'Hva poengsummen betyr', meaningBody:'Din ernæringsfitness-score gjenspeiler kvaliteten på beslutningene dine om ernæring, ikke en diagnose eller en måling av din nåværende helse. Målet er ikke perfeksjon. Vurderingen er laget for å vise hvor ernæringsferdighetene dine allerede er sterke, og hvor større bevissthet, konsistens eller tilpasningsevne kan gi deg flere valgmuligheter.', email:'E-postadresse', emailHelp:'Kontoen lar deg fortsette trygt på en annen enhet.', password:'Passord', create:'Opprett konto', login:'Logg inn', haveAccount:'Har du allerede en konto?', needAccount:'Trenger du en konto?', checkEmail:'Sjekk e-posten og klikk «Bekreft e-postadressen din». Gå deretter tilbake hit og logg inn.', code:'Arrangements­kode', name:'Navnet ditt', join:'Bli med', question:'Spørsmål', of:'av', part:'Del', noConnection:'Ingen forbindelse', reconnecting:'Sjekker …', reconnectFailed:'Kunne ikke nå serveren. Frakoblet modus er fortsatt aktiv.' },
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
      if (!token) return
      const queued = JSON.parse(raw || '[]') as Array<{attemptId:string;questionId:string;answerKey:string}>
      const failed:Array<{attemptId:string;questionId:string;answerKey:string}>=[]
      for(const item of queued){try{await api('/api/quest/answer',{method:'POST',body:JSON.stringify(item)})}catch{failed.push(item)}}
      if(failed.length)localStorage.setItem('nutrition-answer-queue',JSON.stringify(failed));else localStorage.removeItem('nutrition-answer-queue')
      if(localStorage.getItem('nutrition-backup-pending')==='1'&&state?.attempt?.id){try{await api('/api/quest/backup',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,displayName:state.participant.display_name,answers:JSON.parse(localStorage.getItem('nutrition-local-answers')||'{}')})});localStorage.removeItem('nutrition-backup-pending')}catch{}}
      if(failed.length===0&&localStorage.getItem('nutrition-offline-completed')==='1'&&state?.attempt?.id){try{await api('/api/quest/submit',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id})});localStorage.removeItem('nutrition-offline-completed');localStorage.removeItem('nutrition-offline-mode');localStorage.removeItem('nutrition-local-answers');setOfflineCompleted(false);setOfflineMode(false);await refresh()}catch{}}
    }
    window.addEventListener('online', sync); sync()
    return () => window.removeEventListener('online', sync)
  }, [api, token, state, refresh])

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

  const released = eventOf(state)?.released_section || 1
  const releasedQuestions = useMemo(() => offlineMode ? QUEST_ASSESSMENT.questions : QUEST_ASSESSMENT.questions.filter((q) => q.order <= released * 5), [released,offlineMode])
  const current = QUEST_ASSESSMENT.questions[questionIndex]
  const section = QUEST_ASSESSMENT.sections.find((s) => s.order === Math.ceil((current?.order || 1) / 5))
  const releasedComplete = releasedQuestions.every((question) => answers[question.id])
  const allComplete = QUEST_ASSESSMENT.questions.every((question) => answers[question.id])

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
    const nextAnswers={...answers,[questionId]:answerKey};setAnswers(nextAnswers);localStorage.setItem('nutrition-local-answers',JSON.stringify(nextAnswers));setMessage('')
    const item = { attemptId:state.attempt.id, questionId, answerKey }
    const queue = JSON.parse(localStorage.getItem('nutrition-answer-queue') || '[]');localStorage.setItem('nutrition-answer-queue',JSON.stringify([...queue.filter((q:any)=>q.questionId!==questionId),item]))
    if(questionIndex<releasedQuestions.length-1)setTimeout(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();setQuestionIndex((index)=>Math.min(index+1,releasedQuestions.length-1))},160)
    if(!offlineMode&&navigator.onLine){try{await api('/api/quest/answer',{method:'POST',body:JSON.stringify(item)});const remaining=(JSON.parse(localStorage.getItem('nutrition-answer-queue')||'[]')as typeof queue).filter((q:any)=>q.questionId!==questionId);if(remaining.length)localStorage.setItem('nutrition-answer-queue',JSON.stringify(remaining));else localStorage.removeItem('nutrition-answer-queue')}catch{}}
  }

  async function submit() {
    if (!state?.attempt?.id || !allComplete) return
    setSaving(true)
    if(offlineMode){localStorage.setItem('nutrition-backup-pending','1');localStorage.setItem('nutrition-offline-completed','1');setOfflineCompleted(true);if(navigator.onLine){try{await api('/api/quest/backup',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id,displayName:state.participant.display_name,answers})});localStorage.removeItem('nutrition-backup-pending')}catch{}}setSaving(false);return}
    try { await api('/api/quest/submit',{method:'POST',body:JSON.stringify({attemptId:state.attempt.id})});localStorage.removeItem('nutrition-local-answers');await refresh() }
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

  const shell = (body: React.ReactNode) => <main className="min-h-screen bg-[#f3f0e8] px-4 py-5 text-[#17251d] sm:px-6 sm:py-10"><div className="mx-auto max-w-3xl"><header className="mb-7 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold tracking-[.25em]">FITPRENEUR</span><div className="flex items-center gap-2"><button type="button" aria-pressed={offlineMode} disabled={connectionBusy} onClick={toggleOfflineMode} className={`rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60 ${offlineMode?'bg-amber-100 text-amber-900 ring-2 ring-amber-500':'border border-neutral-300 bg-white'}`}>{connectionBusy?t.reconnecting:t.noConnection}</button><div className="flex rounded-full bg-white p-1 shadow-sm"><button onClick={()=>setLocale('en')} aria-pressed={locale==='en'} className={`rounded-full px-3 py-1 text-sm ${locale==='en'?'bg-[#173f2b] text-white':''}`}>EN</button><button onClick={()=>setLocale('nb')} aria-pressed={locale==='nb'} className={`rounded-full px-3 py-1 text-sm ${locale==='nb'?'bg-[#173f2b] text-white':''}`}>NO</button></div></div></header>{body}</div></main>
  if (screen === 'loading') return shell(<p className="py-20 text-center">Loading…</p>)
  if (screen === 'signin') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Secure access</p><h1 className="mb-6 text-4xl font-medium">{authMode==='signup'?t.create:t.login}</h1><form onSubmit={authenticate}>{authMode==='signup'&&<label className="mb-4 block font-medium">{t.name}<input name="name" required maxLength={80} autoComplete="name" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>}<label className="mb-4 block font-medium">{t.email}<input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label><label className="mb-4 block font-medium">{t.password}<input name="password" type="password" minLength={8} required autoComplete={authMode==='signup'?'new-password':'current-password'} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>{authMode==='signup'&&<label className="block font-medium">{locale==='nb'?'Bekreft passord':'Confirm password'}<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label>}<p className="mb-5 mt-2 text-sm text-neutral-500">{t.emailHelp}</p><button disabled={authBusy} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white disabled:opacity-50">{authBusy?(locale==='nb'?'Vent litt …':'Please wait…'):(authMode==='signup'?t.create:t.login)}</button></form><button type="button" disabled={authBusy} onClick={()=>{setMessage('');setAuthMode(authMode==='signup'?'login':'signup')}} className="mt-5 w-full text-sm font-medium underline underline-offset-4 disabled:opacity-50">{authMode==='signup'?`${t.haveAccount} ${t.login}`:`${t.needAccount} ${t.create}`}</button>{message&&<p className="mt-4 rounded-xl bg-[#edf3e9] p-4" role="status">{message}</p>}</section>)
  if (screen === 'join') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><h1 className="mb-6 text-4xl font-medium">Join the live session</h1><form onSubmit={join}><label className="mb-5 block font-medium">{t.code}<input name="code" required autoCapitalize="characters" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4 uppercase tracking-[.18em]" /></label><label className="mb-6 block font-medium">{t.name}<input name="displayName" required defaultValue={accountName} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-4" /></label><button className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{t.join}</button></form>{message&&<p className="mt-4 text-red-700" role="alert">{message}</p>}</section>)
  if (screen === 'intro') return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-12"><p className="mb-4 text-xs font-semibold tracking-[.25em] text-emerald-800">{t.brand}</p><h1 className="mb-6 text-4xl font-medium sm:text-6xl">{t.title}</h1><p className="mb-4 text-lg">{t.intro}</p><p className="mb-7 text-neutral-600">{t.detail}</p><div className="mb-8 rounded-2xl bg-[#edf3e9] p-5 font-medium">{t.instruction}</div><button onClick={()=>{setQuestionIndex(0);setScreen('questions')}} className="w-full rounded-xl bg-[#173f2b] px-5 py-4 font-medium text-white">{t.start}</button></section>)

  const event = eventOf(state)
  if (event?.status === 'paused' && !offlineMode) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">Pause</h1><p>{t.paused}</p></section>)
  if (offlineCompleted && !state?.attempt?.submitted_at) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">{t.submitted}</h1><p>{t.resultWait}</p></section>)
  if (state?.attempt?.submitted_at) {
    if (!event?.results_released) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><h1 className="mb-4 text-4xl font-medium">{t.submitted}</h1><p>{t.resultWait}</p></section>)
    const sectionScores = state.attempt.section_scores || [0,0,0,0,0]
    return shell(<section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">{t.score}</p><h1 className="my-4 text-6xl font-medium">{state.attempt.total_score} <span className="text-2xl text-neutral-400">/ 100</span></h1><div className="my-8 space-y-5">{QUEST_ASSESSMENT.sections.map((s,i)=><div key={s.id}><div className="mb-2 flex justify-between gap-4"><span>{s.title[locale]}</span><strong>{sectionScores[i]} / 20</strong></div><div className="h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-[#3f7354]" style={{width:`${sectionScores[i]*5}%`}} /></div></div>)}</div><h2 className="mb-3 text-2xl font-medium">{t.meaning}</h2><p className="text-neutral-600">{t.meaningBody}</p></section>)
  }
  if (!offlineMode && releasedComplete && questionIndex >= releasedQuestions.length - 1 && released < 5) return shell(<section className="rounded-[2rem] bg-white p-10 text-center shadow-sm"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">{t.part} {released} / 5</p><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3e9] text-2xl" aria-hidden="true">✓</div><h1 className="mb-4 text-4xl font-medium">{locale==='nb'?`Del ${released} er fullført`:`Part ${released} completed`}</h1><p>{locale==='nb'?`Venter på at fasilitatoren åpner del ${released+1}.`:`Waiting for the facilitator to open Part ${released+1}.`}</p><button onClick={()=>setQuestionIndex(Math.max(0,questionIndex-1))} className="mt-7 rounded-xl border border-neutral-300 px-5 py-3">{t.previous}</button></section>)

  const questionTone = ['bg-white','bg-[#fbf7ee]','bg-[#f2f7f0]'][current.order%3]
  return shell(<><div className="mb-5"><div className="mb-2 flex justify-between text-sm"><span>{t.part} {section?.order} / 5</span><span>{t.question} {current.order} {t.of} 25</span></div><div className="h-2 overflow-hidden rounded-full bg-[#d9ddd5]" role="progressbar" aria-valuemin={0} aria-valuemax={25} aria-valuenow={current.order}><div className="h-full bg-[#3f7354] transition-all" style={{width:`${current.order*4}%`}} /></div></div><section key={current.id} className={`quest-question-enter rounded-[2rem] p-5 shadow-sm sm:p-10 ${questionTone}`}><p className="mb-4 text-sm font-medium uppercase tracking-[.14em] text-emerald-800">{section?.title[locale]}</p><h1 className="mb-3 text-2xl font-medium sm:text-4xl">{current.prompt[locale]}</h1>{current.context&&<p className="mb-5 text-neutral-500">{current.context[locale]}</p>}<fieldset className="space-y-3"><legend className="sr-only">Choose one answer</legend>{current.choices.map((choice)=><label key={`${current.id}-${choice.id}`} className={`flex min-h-[68px] cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${answers[current.id]===choice.id?'border-[#173f2b] bg-[#edf3e9] ring-2 ring-[#173f2b]':'border-neutral-200 bg-white/70 hover:border-neutral-400'}`}><input type="radio" name={current.id} value={choice.id} checked={answers[current.id]===choice.id} onChange={()=>choose(current.id,choice.id)} className="mt-1 h-5 w-5 accent-[#173f2b]"/><span><strong className="mr-2 font-medium">{choice.id}</strong>{choice.text[locale]}</span></label>)}</fieldset>{message&&<p className="mt-4 text-sm text-amber-800" role="status">{message}</p>}<div className="mt-7 flex justify-between gap-3"><button disabled={questionIndex===0} onClick={()=>setQuestionIndex((i)=>Math.max(0,i-1))} className="rounded-xl border border-neutral-300 px-5 py-3 disabled:opacity-30">{t.previous}</button>{current.order===25?<button disabled={!allComplete||saving} onClick={submit} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">{saving?t.save:t.submitted}</button>:<button disabled={!answers[current.id]||saving||questionIndex>=releasedQuestions.length-1} onClick={()=>setQuestionIndex((i)=>i+1)} className="rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40">{saving?t.save:t.next}</button>}</div></section></>)
}
