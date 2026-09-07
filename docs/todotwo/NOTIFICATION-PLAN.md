# TodoTwo notification plan

Notifications are for information a person can act on. The Notifications tab
is a recipient-specific inbox, not a copy of the audit log. Raw task creation,
edits, completions, and other people's assignments do not belong there.

| Event | Recipient | In-app | Push | Opens |
|---|---|---:|---:|---|
| A new day has been generated and assigned | Each person with work that day | One summary per day | Yes, once | Upcoming assignments |
| A task is assigned to or removed from someone within two days | That person | Yes | Yes | The task |
| Someone asks “Can anyone take this?” | Everyone active except the requester | Yes | Yes | Today/help requests |
| Someone takes a help request | The original requester | Yes | Yes | The task |
| A direct handoff or swap is offered, accepted, or declined | The people involved | Yes | Yes | The task or pending offers |
| A farm notice is published | Its intended audience | Yes | Yes for important/urgent; in-app only for info | The notice |
| A task becomes overdue | The assignee; staff only after escalation threshold | Yes | Yes | The task |
| Daily digest | Each person with work | Optional history entry | One scheduled summary, not one push per task | Today |
| Feed or safety check fails | Responsible staff | Yes | Yes, urgent | The task |
| Time off is approved or declined | The requester | Yes | Yes | Time off |

Rules:

- One event produces at most one push per recipient and device.
- A generated day produces “Friday is ready — 3 assignments. Tap to see your assignments,” never one message per generated task.
- Completing ordinary work and editing routine text stay out of the inbox.
- Every push has a useful destination inside TodoTwo.
- Email is a fallback when a person has no working push subscription.
- Expired device subscriptions are removed automatically.
- The delivery job may run repeatedly; stable dedupe keys prevent duplicates.
