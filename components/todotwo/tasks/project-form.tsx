'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/todotwo/ui/button'
import { FIELD_CLASS } from './steps-fields'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { TaskRow } from '@/lib/todotwo/queries'
import { farmWeek } from '@/lib/todotwo/domain/weekly-projects'

export function ProjectForm({ task }: { task?: TaskRow }) {
  const id = useId()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState(Boolean(task?.planned_week))
  const [hasDue, setHasDue] = useState(Boolean(task?.due_date))
  return <details className="text-sm"><summary className="cursor-pointer py-3 font-semibold text-[var(--tt-accent)]">{task ? 'Edit project / dates' : '+ Add a project'}</summary>
    <form className="flex flex-col gap-3 py-3" onSubmit={async event => {
      event.preventDefault()
      const form = event.currentTarget
      const fields = new FormData(form)
      setPending(true); setError(null)
      try {
        const { error } = await getTodoTwoBrowserClient().rpc('save_farm_project', {
          p_task_id: task?.id ?? null, p_title: fields.get('title'), p_description: fields.get('description') || null,
          p_planned_week: scheduled ? farmWeek(String(fields.get('week'))).start : null,
          p_due_date: hasDue ? fields.get('due') : null,
          p_due_date_certainty: hasDue ? fields.get('certainty') : 'definite',
        })
        if (error) throw error
        if (!task) { form.reset(); setScheduled(false); setHasDue(false) }
        form.closest('details')?.removeAttribute('open')
        router.refresh()
      } catch (err) { setError(err instanceof Error || (err && typeof err === 'object' && 'message' in err) ? String(err.message) : 'Could not save the project. Try again.') }
      finally { setPending(false) }
    }}>
      <label htmlFor={`${id}-title`}>Project name<input id={`${id}-title`} name="title" className={FIELD_CLASS} defaultValue={task?.title} required maxLength={500} /></label>
      <div><label htmlFor={`${id}-description`}>What needs doing?</label><textarea id={`${id}-description`} name="description" className={FIELD_CLASS} defaultValue={task?.description ?? ''} maxLength={10000} rows={3} /></div>
      <div><label htmlFor={`${id}-plan`}>When?</label><select id={`${id}-plan`} className={FIELD_CLASS} value={scheduled ? 'week' : 'later'} onChange={e => setScheduled(e.target.value === 'week')}><option value="later">To do later · no planned week</option><option value="week">Plan for a specific week</option></select></div>
      {scheduled && <label htmlFor={`${id}-week`}>Choose any day in the planned week<input id={`${id}-week`} className={FIELD_CLASS} type="date" name="week" defaultValue={task?.planned_week ?? ''} required /><span className="text-xs text-[var(--tt-ink-3)]">The plan covers Monday–Sunday of that week.</span></label>}
      <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={hasDue} onChange={e => setHasDue(e.target.checked)} />Set a due date</label>
      {hasDue && <><label htmlFor={`${id}-due`}>Due date<input id={`${id}-due`} type="date" name="due" className={FIELD_CLASS} defaultValue={task?.due_date ?? ''} required /></label>
        <div><label htmlFor={`${id}-certainty`}>How firm is the date?</label><select id={`${id}-certainty`} name="certainty" className={FIELD_CLASS} defaultValue={task?.due_date_certainty ?? 'definite'}><option value="definite">DEFINITE · must be done by this date</option><option value="approximate">Approximate · target date, flexible</option></select></div></>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : task ? 'Save project' : 'Add project'}</Button>
      {error && <p role="alert" className="text-[var(--tt-danger)]">{error}</p>}
    </form>
  </details>
}
