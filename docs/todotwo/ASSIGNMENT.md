# TodoTwo — free-text assignment

Phase 5. Kenneth types what he wants ("divide all tasks evenly, but Robert
does no housekeeping tasks. Amber is off Thursday and Friday.") and sees the
resulting rota before anything is written.

## What decides what

**Claude never decides who is assigned to anything.** It only reads the free
text against a roster of real people and real task-group names it is handed,
and translates it into the five `Constraint` shapes `lib/todotwo/domain/assignment.ts`
already knows how to enforce (`unavailable_weekday`, `unavailable_dates`,
`exclude_tasks`, `only_people`, `max_per_day`). The deterministic, unit-tested
`buildAssignmentPlan()` in that file does the actual assigning — greedy,
fewest-assigned-first, ties broken by name. Same input, same rota, every time,
and every choice is explained in the `reason` on each assignment.

This split is why a wrong or ambiguous instruction is safe: at worst the AI
layer produces no constraint (reported as `unresolved`), never a wrong
assignment.

## The pieces

- `lib/todotwo/domain/assignment-ai.ts` — `parseConstraints(text, context)`.
  Calls Claude (`claude-opus-5`, `client.messages.parse` with a Zod output
  schema) to get names and task-group labels, then resolves those against the
  roster with `resolveConstraints` — a pure function, so it is unit tested
  without an API key or network call. An unmatched name becomes an
  `unresolved` entry with a "did you mean" suggestion when one is close
  enough; a wrong guess is never silently turned into a real constraint.
- `POST /api/todotwo/assign/preview` — staff-only. Loads active people and
  open (`draft`/`unassigned`) tasks in the given date window, calls
  `parseConstraints`, runs `buildAssignmentPlan()`, and returns the full plan.
  **Writes nothing.**
- `POST /api/todotwo/assign/apply` — staff-only. Takes the exact
  `{taskId, personId}` pairs a preview produced and applies them one at a
  time through `todotwo.assign_task` — the same security-definer RPC the
  single-task and rota UIs already use, so it gets the same staff check and
  audit trail. No new database function or table was needed for this phase.
  There is no cross-row transaction (separate RPC calls cannot share one), so
  a partial failure is reported per row rather than silently rolled back or
  silently ignored.
- `app/todotwo/(app)/routines/assign/page.tsx` +
  `components/todotwo/assign/assignment-console.tsx` — the screen. A text
  box, a date window, Preview (shows the constraints in plain English, the
  resulting rota by person with counts, any unresolved names/task groups, and
  anything left unassignable), and Apply — disabled until a preview has
  succeeded with zero unresolved references.

## Failure modes

- `ANTHROPIC_API_KEY` unset: `parseConstraints` throws
  `AssignmentAiUnavailableError` before any network call; the preview route
  answers `503 ai_unavailable` with a clear message, and the page shows it as
  an error rather than crashing.
- No active people, or no open tasks in the window: `422` with a plain
  message, before Claude is ever called.
- A name or task-group label the model cannot confidently match: reported in
  `unresolved`, not guessed. Apply stays disabled while any are present.
- A constraint that matched nothing in this window (e.g. a weekday
  restriction on a person with no eligible tasks at all): surfaced as
  `inertConstraints`, the same field `buildAssignmentPlan()` already produces
  — usually a sign the instruction was misread.

## What was deliberately not added

No new migration, table, or `security definer` function. `todotwo.assign_task`
already does exactly what applying a plan needs — staff check, active-person
enforcement is inherited from the existing schema, audit trail via the
existing trigger — and adding a bulk-apply RPC would have duplicated it for no
new capability. `tests/todotwo/rls/assign.test.ts` covers the batch-apply
pattern (coordinator succeeds row by row, a non-staff caller is refused on
every row, a nonexistent task is a no-op rather than a silent success)
directly against that RPC.
