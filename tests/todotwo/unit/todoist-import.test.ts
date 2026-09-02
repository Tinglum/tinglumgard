import { describe, expect, it } from 'vitest'

import { parseCsv, parseRows } from '@/lib/todotwo/domain/csv'
import {
  buildImportPlan,
  buildRrule,
  cleanProjectName,
  isComplexRule,
  timeOf,
  weekdayOf,
} from '@/lib/todotwo/domain/todoist-import'

describe('CSV parsing', () => {
  it('handles quoted fields containing commas', () => {
    const rows = parseRows('a,"one, two",c')
    expect(rows[0]).toEqual(['a', 'one, two', 'c'])
  })

  it('handles embedded newlines, as the firewood instructions have', () => {
    const rows = parseRows('a,"line one\nline two",c')
    expect(rows[0]).toEqual(['a', 'line one\nline two', 'c'])
  })

  it('handles doubled quotes', () => {
    const rows = parseRows('a,"she said ""hi""",c')
    expect(rows[0]).toEqual(['a', 'she said "hi"', 'c'])
  })

  it('normalises CRLF inside quoted fields', () => {
    const rows = parseRows('a,"one\r\ntwo"')
    expect(rows[0][1]).toBe('one\ntwo')
  })

  it('strips a BOM from the first header cell', () => {
    const rows = parseCsv('﻿TYPE,CONTENT\ntask,Feed the goats')
    expect(rows[0].TYPE).toBe('task')
    expect(rows[0].CONTENT).toBe('Feed the goats')
  })

  it('keeps empty trailing cells', () => {
    const rows = parseRows('a,,c,')
    expect(rows[0]).toEqual(['a', '', 'c', ''])
  })
})

describe('weekday recognition', () => {
  it('reads English, long and short', () => {
    expect(weekdayOf('every Monday at 10am')).toBe('MO')
    expect(weekdayOf('every thu at 10am')).toBe('TH')
    expect(weekdayOf('ev Wednesday')).toBe('WE')
    expect(weekdayOf('every tues at 18')).toBe('TU')
  })

  it('reads German, which is how Anna writes hers', () => {
    expect(weekdayOf('jeden Mo')).toBe('MO')
    expect(weekdayOf('jeden Mi')).toBe('WE')
    expect(weekdayOf('jeden Do')).toBe('TH')
    expect(weekdayOf('jeden Sa')).toBe('SA')
    expect(weekdayOf('jeden So')).toBe('SU')
  })

  it('does not match a short name inside a long one', () => {
    expect(weekdayOf('every sunday at 10')).toBe('SU')
    expect(weekdayOf('every saturday')).toBe('SA')
  })

  it('returns null when no day is named', () => {
    expect(weekdayOf('every week')).toBeNull()
    expect(weekdayOf('')).toBeNull()
  })
})

describe('time recognition', () => {
  it('reads the forms the export actually uses', () => {
    expect(timeOf('every Monday at 10am')).toBe('10:00')
    expect(timeOf('every monday at 18')).toBe('18:00')
    expect(timeOf('every Tue at 07:00')).toBe('07:00')
    expect(timeOf('every other Wednesday at 2 pm')).toBe('14:00')
  })

  it('handles midnight and noon correctly', () => {
    expect(timeOf('at 12am')).toBe('00:00')
    expect(timeOf('at 12pm')).toBe('12:00')
  })

  it('returns null when no time is given', () => {
    expect(timeOf('every monday')).toBeNull()
  })
})

describe('rule building', () => {
  it('collapses all seven days to a daily rule', () => {
    const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    expect(buildRrule(days, null)).toBe('RRULE:FREQ=DAILY')
  })

  it('keeps a partial week as BYDAY, in week order', () => {
    expect(buildRrule(['WE', 'MO'], null)).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')
  })

  it('includes the time when there is one', () => {
    expect(buildRrule(['MO'], '10:00')).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0')
  })

  it('de-duplicates repeated days', () => {
    expect(buildRrule(['WE', 'WE'], null)).toBe('RRULE:FREQ=WEEKLY;BYDAY=WE')
  })

  it('returns null with no days', () => {
    expect(buildRrule([], '10:00')).toBeNull()
  })
})

describe('rules left alone', () => {
  it('refuses to guess at intervals and months', () => {
    expect(isComplexRule('every other day')).toBe(true)
    expect(isComplexRule('every other Wednesday at 2 pm')).toBe(true)
    expect(isComplexRule('jeden 1. Mo')).toBe(true)
  })

  it('accepts plain weekly rules', () => {
    expect(isComplexRule('every Monday at 10am')).toBe(false)
    expect(isComplexRule('jeden Mo')).toBe(false)
  })
})

describe('project naming', () => {
  it('strips the Todoist sort prefix', () => {
    expect(cleanProjectName('A Tinglum Farm TASKS.csv')).toBe('Tinglum Farm TASKS')
    expect(cleanProjectName('C Daily Animals.csv')).toBe('Daily Animals')
  })
})

describe('collapsing weekday copies', () => {
  const header =
    'TYPE,CONTENT,DESCRIPTION,IS_COLLAPSED,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG'

  function row(type: string, content: string, indent = 1, date = '', priority = 4) {
    return `${type},"${content}",,,${priority},${indent},Kenneth (1),,${date},en`
  }

  it('merges seven weekday copies into one series', () => {
    const csv = [
      header,
      'section,Kitchen,,False,,,,,,',
      ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].flatMap(
        (day) => [row('task', 'Kitchen', 1, `every ${day}`), row('task', 'Wipe counters', 2)]
      ),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'D Daily Housekeeping.csv')
    const tasks = plan.project.sections[0].tasks

    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Kitchen')
    expect(tasks[0].rrule).toBe('RRULE:FREQ=DAILY')
    expect(plan.stats.tasksBeforeCollapse).toBe(14)
  })

  it('reports a missing weekday rather than hiding it', () => {
    const csv = [
      header,
      'section,General,,False,,,,,,',
      row('task', 'General', 1, 'every monday'),
      row('task', 'General', 1, 'every wednesday'),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'D Daily Housekeeping.csv')
    const missing = plan.drift.find((d) => d.kind === 'missing-weekday')

    expect(missing).toBeDefined()
    expect(missing?.detail).toContain('TU')
  })

  it('reports a duplicated weekday', () => {
    const csv = [
      header,
      'section,Kitchen,,False,,,,,,',
      row('task', 'Kitchen', 1, 'every wed'),
      row('task', 'Kitchen', 1, 'every wed'),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'D Daily Housekeeping.csv')
    expect(plan.drift.some((d) => d.kind === 'duplicate-weekday')).toBe(true)
  })

  it('keeps the most complete copy and reports what it dropped', () => {
    const csv = [
      header,
      'section,Pigs,,False,,,,,,',
      row('task', 'Pigs', 1, 'every monday'),
      row('task', 'Feed the piglets', 2),
      row('task', 'Feed the teenagers', 2),
      row('task', 'Pigs', 1, 'every tuesday'),
      row('task', 'Feed the piglets', 2),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'C Daily Animals.csv')
    const task = plan.project.sections[0].tasks[0]

    expect(task.children).toHaveLength(2)
    expect(plan.drift.some((d) => d.kind === 'subtask-count')).toBe(true)
  })

  it('nests three levels deep, as the real export does', () => {
    const csv = [
      header,
      'section,Chickens,,False,,,,,,',
      row('task', 'Chickens + Ducks', 1, 'every monday'),
      row('task', 'Lights', 2),
      row('task', 'Make fire', 3),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'C Daily Animals.csv')
    const top = plan.project.sections[0].tasks[0]

    expect(top.children[0].title).toBe('Lights')
    expect(top.children[0].children[0].title).toBe('Make fire')
  })

  it('drops reminders, which exist only to name a person', () => {
    const csv = [
      header,
      'section,Kitchen,,False,,,,,,',
      row('task', 'Kitchen', 1, 'every monday'),
      'reminder,Reminder,,,,,,caro (53231100),,',
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'D Daily Housekeeping.csv')
    expect(plan.stats.remindersSkipped).toBe(1)
  })

  it('leaves a complex rule unconverted rather than guessing', () => {
    const csv = [
      header,
      'section,Scheduled,,False,,,,,,',
      row('task', 'Bi-Weekly garbage run', 1, 'every other Wednesday at 2 pm'),
    ].join('\n')

    const plan = buildImportPlan(parseCsv(csv), 'A Tinglum Farm TASKS.csv')
    const task = plan.project.sections[0].tasks[0]

    expect(task.rrule).toBeNull()
    expect(task.recurrenceText).toBe('every other Wednesday at 2 pm')
    expect(plan.drift.some((d) => d.kind === 'unparsed-rule')).toBe(true)
  })
})
