# Post-Order Copy Map

This map is the source of truth for customer/admin post-order communication copy and lifecycle behavior.

## Standards
- Voice: professional, clear, friendly.
- Language parity: `no` and `en` must express the same intent.
- Terminology:
  - `forskudd`
  - `restbetaling`
  - `henting`
  - `utsending`
  - `Min side`
- Every transactional template must include:
  - clear status snapshot
  - next step (`Hva skjer nå?` / `What happens next?`)
  - exact dates in Oslo time when relevant
  - deep link to exact order context

## Flow Matrix

| Product | Flow key | Trigger | Template key | Notes |
|---|---|---|---|---|
| Pig | `pig.remainder.explainer` | after deposit paid (+config delay) | `pig.remainder.explainer.full` or `.reduced` | Reduced variant when remainder already paid |
| Pig | `pig.remainder.reminder` | config-driven reminder schedule | `pig.remainder.reminder` | Skips when already paid/cancelled |
| Egg | `egg.remainder.reminder` | `delivery_monday - [11,9,7,6]` (config) | `egg.remainder.reminder` | Stops at outstanding `<= 0` |
| Egg | `egg.delivery.day_before` | day before shipment | `egg.delivery.day_before` | Includes upsell action |
| Egg | `egg.order.shipped` | when marked shipped | `egg.order.shipped.customer` | Includes line breakdown + tracking |
| Egg | `egg.hatch.followup` | 5 days after shipped | `egg.hatch.followup` | Includes support CTA + pork cross-sell |
| Egg | `egg.order.forfeited` | after overdue grace | `egg.order.forfeited` | Cancels and releases inventory |
| Chicken | `chicken.ready_for_pickup` | auto-ready rule | `chicken.ready_for_pickup` | Skips cancelled/picked_up |
| Chicken | `chicken.pickup.reminder` | `-3` and `-1` days (config) | `chicken.pickup.reminder` | Skips cancelled/picked_up |
| Chicken | `chicken.remainder.collected` | admin collect remainder action | `chicken.remainder.collected` | Receipt-style confirmation |

## Required Data Blocks Per Email Type

### Payment-related
- paid now
- remaining amount
- due date (Oslo time)
- status

### Delivery/pickup-related
- method (`Posten`, `henting`, etc.)
- week/date
- address/pickup context when available

### Order content
- explicit line breakdown per breed/item:
  - quantity
  - unit price (when available)
  - subtotal
- total summary

## Admin QA Before Publishing Template
1. NO copy quality and tone.
2. EN parity against NO.
3. Placeholders valid and balanced.
4. Links resolve to exact context after login.
5. Dates and prices formatted correctly.
