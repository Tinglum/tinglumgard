import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * todotwo.task_templates / task_template_steps — farm-wide read, staff-only
 * write. See supabase/migrations/20260908095200_todotwo_task_templates.sql.
 */

const env: RlsEnv | null = readRlsEnv()
const describeTemplates = env ? describe : describe.skip

describeTemplates('task templates', () => {
  const e = env as RlsEnv

  let staff: Actor
  let worker: Actor
  let templateId: string
  let projectId: string

  beforeAll(async () => {
    staff = await createActor(e, 'template-staff', ['coordinator'])
    worker = await createActor(e, 'template-worker', ['workawayer'])

    const db = adminClient(e)

    const { data: project } = await db
      .from('projects')
      .insert({ name: `Template fixture ${Date.now()}`, slug: `template-fixture-${Date.now()}` })
      .select('id')
      .single()
    projectId = project!.id as string

    const { data: template } = await db
      .from('task_templates')
      .insert({ name: `RLS fixture template ${Date.now()}` })
      .select('id')
      .single()
    templateId = template!.id as string
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('task_template_steps').delete().eq('template_id', templateId)
    await db.from('task_templates').delete().eq('id', templateId)
    await db.from('projects').delete().eq('id', projectId)
    for (const actor of [staff, worker]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('lets a non-staff person read templates', async () => {
    const { data, error } = await worker.db.from('task_templates').select('id').eq('id', templateId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('stops a non-staff person from creating a template', async () => {
    const { error } = await worker.db
      .from('task_templates')
      .insert({ name: `should not exist ${Date.now()}` })
    expect(error).toBeTruthy()
  })

  it('stops a non-staff person from editing a template', async () => {
    const { error } = await worker.db
      .from('task_templates')
      .update({ name: 'renamed by worker' })
      .eq('id', templateId)
    // Either an explicit error, or a silent no-op (RLS filters the row out of
    // the update rather than erroring) — either way the row must not change.
    const db = adminClient(e)
    const { data } = await db.from('task_templates').select('name').eq('id', templateId).single()
    expect(data?.name).not.toBe('renamed by worker')
    void error
  })

  it('stops a non-staff person from deleting a template', async () => {
    await worker.db.from('task_templates').delete().eq('id', templateId)

    const db = adminClient(e)
    const { data } = await db.from('task_templates').select('id').eq('id', templateId)
    expect(data).toHaveLength(1)
  })

  it('stops a non-staff person from adding a step', async () => {
    const { error } = await worker.db
      .from('task_template_steps')
      .insert({ template_id: templateId, title: 'sneaky step' })
    expect(error).toBeTruthy()
  })

  it('lets staff create, edit, and delete', async () => {
    const { data: created, error: insertError } = await staff.db
      .from('task_templates')
      .insert({ name: `staff-created ${Date.now()}` })
      .select('id')
      .single()
    expect(insertError).toBeNull()

    const { error: updateError } = await staff.db
      .from('task_templates')
      .update({ description: 'updated by staff' })
      .eq('id', created!.id as string)
    expect(updateError).toBeNull()

    const { error: deleteError } = await staff.db
      .from('task_templates')
      .delete()
      .eq('id', created!.id as string)
    expect(deleteError).toBeNull()
  })

  it('stops a non-staff person from applying a template', async () => {
    const { error } = await worker.db.rpc('apply_task_template', {
      p_template_id: templateId,
      p_project_id: projectId,
      p_section_id: null,
      p_due_date: '2030-01-01',
    })
    expect(error).toBeTruthy()
  })

  it('lets staff apply a template', async () => {
    const { data: newTaskId, error } = await staff.db.rpc('apply_task_template', {
      p_template_id: templateId,
      p_project_id: projectId,
      p_section_id: null,
      p_due_date: '2030-01-01',
    })
    expect(error).toBeNull()
    expect(newTaskId).toBeTruthy()

    const db = adminClient(e)
    await db.from('tasks').delete().eq('id', newTaskId as string)
  })
})
