/**
 * One vocabulary for "is this task finished?", because the app kept answering
 * it differently in different places: the roster counted
 * awaiting_verification as done, task-row counted only completed and
 * verified, and the guest board had a third list. Two screens disagreeing
 * about the same task is the kind of thing that quietly erodes trust in the
 * whole board.
 *
 * The distinction that actually matters is between two different questions,
 * which is why there are two predicates rather than one shared set:
 *
 *   isFinished  — has the work been done, as far as anyone looking at a list
 *                 is concerned? awaiting_verification counts: the person did
 *                 the job, someone else has yet to sign it off.
 *
 *   canUntick   — can this be handed back to "not done"? Only 'completed'
 *                 can: todotwo.uncomplete_task refuses anything else
 *                 ("Task is not completed"). A verified task has been signed
 *                 off and an awaiting_verification one is waiting on somebody
 *                 else, so neither is the current person's to undo.
 */

export type TaskStatus =
  | 'draft'
  | 'unassigned'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'awaiting_verification'
  | 'verified'
  | 'not_completed'
  | 'cancelled'

const FINISHED = new Set<string>(['completed', 'verified', 'awaiting_verification'])

/** Done as far as a list is concerned. Cancelled is not finished — see below. */
export function isFinished(status: string): boolean {
  return FINISHED.has(status)
}

/**
 * Called off, not carried out. Kept apart from finished on purpose: a day
 * whose work was cancelled should not read as a productive one.
 */
export function isCancelled(status: string): boolean {
  return status === 'cancelled'
}

/** Still outstanding — neither finished nor called off. */
export function isOutstanding(status: string): boolean {
  return !isFinished(status) && !isCancelled(status)
}

/** Only a 'completed' task can be un-ticked; uncomplete_task refuses the rest. */
export function canUntick(status: string): boolean {
  return status === 'completed'
}
