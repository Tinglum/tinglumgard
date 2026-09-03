---
name: handoff
description: Preserve the current Claude Code session before a context or usage limit interrupts it. Automatically invoke when Claude Code reports that the current session is genuinely near its usable limit, when continuation risks losing important work, or when Kenneth asks for a handoff or says he is switching sessions or agents.
when_to_use: Invoke after an end-of-session warning, when the 5-hour allowance is at least 92% used, when the 7-day allowance is at least 97% used, or when context is critically low and normal auto-compaction is no longer sufficient. Do not invoke merely because a session is long, during the first normal auto-compaction, or in a new session with no meaningful work to preserve.
allowed-tools: Read, Write, Glob, Grep, Bash(git status *), Bash(git branch *), Bash(git diff *)
effort: low
---

# Session handoff

Create a compact, self-contained handoff that allows another LLM or fresh Claude session to continue the current work immediately.

## Trigger behaviour

When invoked automatically:

1. Stop accepting new work.
2. Finish the current operation only when it can be completed safely in one short step.
3. Otherwise preserve the current state immediately.
4. Do not ask the user any questions.
5. Run only once unless meaningful work changes after the previous handoff.

Manual invocation with `/handoff` always runs, regardless of current limits.

Do not invoke solely because context is approaching its first normal auto-compaction. Invoke when there is a real risk that limits, failed compaction, or loss of detailed context will prevent a reliable continuation.

## Output

Create this file in the current project root:

`handoff-[short-topic].md`

Use a specific lowercase topic of two to five hyphenated words.

If that filename already exists and contains an earlier handoff, add the current date and time:

`handoff-[short-topic]-YYYYMMDD-HHMM.md`

After successfully writing the file, respond only:

`Handoff saved: [relative path]`

Do not paste the handoff into the conversation unless file creation fails.

## Handoff format

```
# Handoff: [specific topic]

## Continue from here

State that the receiving model is continuing an existing task.
Instruct it to:

- act on the handoff rather than summarize it
- use confirmed decisions as the starting point
- not reopen settled decisions without new evidence
- not ask questions already answered here
- preserve Kenneth's terminology and working preferences
- perform the stated next action first

## Goal

In three to six lines, state:

- what Kenneth is trying to accomplish
- the current deliverable
- why it matters, when known
- only the background needed to continue

## Latest request

Paste Kenneth's latest substantive request verbatim.
Include follow-up instructions only when they materially affect the current task.

## Facts and decisions

Use compact bullets for:

- confirmed facts
- settled decisions
- important constraints
- exact names, dates, amounts, percentages, URLs, paths, filenames, commands, identifiers, and model names
- decision reasoning only when needed to prevent reconsideration

Do not mix uncertain information into this section.

## Current state

Distinguish clearly between:

- completed
- validated or tested
- drafted but unapproved
- in progress
- failing
- blocked
- not started

Do not claim that something was completed, tested, saved, sent, committed, deployed,
or validated unless the conversation confirms it.

For software projects, include when available:

- current branch
- relevant modified or untracked files
- tests or checks already run
- their exact results
- whether changes are committed

## Active work

Preserve the material needed to continue without reconstruction.

Text and prompt artifacts:
Paste the complete current version verbatim.
Do not summarize, truncate, rewrite, or use placeholders.

Project files:
For work already saved in accessible project files:

- give every exact file path
- state what changed and its status
- do not duplicate entire files unnecessarily
- include exact snippets only when they are essential to understanding unfinished work
- record unsaved work in full

For Git repositories, inspect `git status`, the current branch, and relevant diffs
before writing this section.
Do not include a huge full diff when the receiving agent will have the same repository.
Include the relevant paths, state, decisions, and exact unresolved portions instead.
When the receiving agent may not have repository access, say which files must be
supplied with the handoff.

If no active artifact exists, write: No active artifact.

## Rejected or superseded

List only approaches that failed, were rejected, were corrected, or were replaced.
State the reason and replacement when applicable.
If none were recorded, write: None recorded.

## Open issues

List unresolved matters only.
Prefix each item with one of:
Unknown, Unverified, Tentative, Blocked, Needs user decision, Needs external verification.
Never guess.
For an important point that cannot be verified, write:
I cannot confirm this from the conversation.

## Resources

List only resources needed to continue: files and attachments, repositories and
branches, URLs, services, tools, external documents, connected accounts.
For each resource, state:

- its exact name or path
- why it matters
- whether it was opened or only mentioned
- whether access transfers
- whether Kenneth must re-upload or reconnect it

Omit this section when no external resources matter.

## User preferences

Include only preferences affecting the current task, written as instructions.
Always include when applicable:

- Be direct and avoid filler.
- Prioritize accuracy over sounding confident.
- Do not invent facts, quotations, data, or citations.
- Separate confirmed facts from assumptions and uncertainty.
- Preserve exact names, numbers, dates, paths, and identifiers.
- Show calculations and inputs when relevant.
- Do not ask questions already answered.
- Provide complete usable artifacts rather than isolated edits.
- Do not use em dashes.

## Next action

Give exactly one concrete instruction telling the receiving model what to do first.
Begin with an action verb.
Do not write vague instructions such as: continue helping, review the handoff,
familiarize yourself with the project, ask Kenneth what he wants.
```

## Rules

1. Use only information present in the conversation, project, or visible tool results.
2. Do not invent missing details.
3. Preserve active non-file work verbatim.
4. Preserve important names, numbers, dates, URLs, paths, filenames, and identifiers exactly.
5. Do not reveal hidden chain-of-thought or private scratchpad content.
6. Do not repeat low-value history or duplicate information between sections.
7. Do not reopen settled decisions without new contradictory evidence.
8. Do not ask for information already included in the handoff.
9. Clearly identify inaccessible or non-transferable resources.
10. Start with `# Handoff:` and end with the single instruction under `## Next action`.

## Emergency mode

When the remaining output budget is critically small, create the handoff immediately using this reduced order:

1. Goal
2. Latest request
3. Facts and decisions
4. Current state
5. Active work
6. Open issues
7. Next action

Preserve exact active work and the next action before lower-value background.
Do not spend the remaining budget explaining omissions.
