# Christmas pig box campaign — draft, not launched

Updated 18 November 2026. Current checkout and landing changes are local and unpublished. The customer send requires Kenneth's approval of the finished preview. Neither customer campaign nor reminder is scheduled.

## Confirmed commercial terms

- All customer contacts across pig, egg, chicken, Vipps, website messages and egg wishlist records; deduplicate by normalized email and Norwegian phone number.
- Include Trøndelag, Møre og Romsdal, Innlandet, Oslo, Akershus, Østfold and Vestfold using Bring's current postcode register. Kenneth explicitly includes local farm/E6 pickup customers without a postal address.
- Exclude all complaint/problem history, including resolved complaints, redeliveries, refunds and compensation. Review website messages plus replies, order/admin notes and connected Gmail. Keep evidence IDs and decisions in the private audit folder. Recheck before sending and before the reminder.
- Exclude unsubscribed/suppressed contacts, internal/test addresses and existing pig box purchasers. There is one existing paid pig order.
- 30% discount on the original 50% box deposit = 15% off the original box price. No expiry date. No stacking with other discount codes.
- Example: 3,100 − 465 = 2,635 NOK; 1,085 deposit + 1,550 remainder. Five distinct friends each placing a qualifying box order and paying its deposit should give 5 × 310 = 1,550 NOK credit towards the customer's own box remainder. Own box payment then 1,085 NOK (35% of original price). Delivery and extras are additional.
- Farm pickup free, appointment agreed. Trondheim pickup Sunday 20 December 2026: 200 NOK. E6 meeting points down to Oslo Monday 21 December: 400 NOK. Majorstuen pickup Monday 21 December: 200 NOK; exact meeting point/time to be arranged.
- Scarcity may refer to limited boxes, with no invented deadline or invented stock count. The old 706 kg inventory is unverified and must not be presented as current capacity. Availability is based on active presets, with no invented count.
- Target landing anchor `/#bokser` (the “Hva har du lyst på?” selector).
- Revision requested: each qualifying friend earns 10% of the referrer's ORIGINAL box price, not 10% of the already discounted price. Combined discount is 15/25/35/45/55/65% for 0–5 friends. Familieboks total: 2,635 / 2,325 / 2,015 / 1,705 / 1,395 / 1,085 NOK; outstanding balance: 1,550 / 1,240 / 930 / 620 / 310 / 0 NOK. Deposit stays 1,085 NOK. The email shows an inbox-compatible 0–5 calculator table.
- Friends ALSO get 15% off their own box (30% off its original deposit), automatically through a personal referral link supplied after purchase. This differs from the current legacy referral discount of 20% of deposit (10% of box): update both client and server referral discounts and link attribution before launch; do not simply stack unrelated coupon codes.

## Current audience

39 eligible identities: 22 local pickup contacts and 17 with a recorded postcode in the selected counties. 24 excluded identities (problems, internal contacts and the existing pig customer), 25 outside the area. Eight remaining contacts have only a registration/wishlist and no order/pickup/address evidence; they are held for location review. All shipped-order rows have postcodes (70/70); no shipped buyer is held for a missing address.

Private source snapshot, reviewed exclusions, audience JSON/CSV, preview and screenshots: `.codex-campaign/`, excluded from git. No customer PII is committed.

Regenerate using `node scripts/pig-box-campaign.mjs .codex-campaign`. Run the audience/money checks with `node scripts/pig-box-campaign.mjs --check`.

## Drafts and preview

Main HTML: `content/email/pig-box-christmas-2026.html`. Reminder HTML: `content/email/pig-box-christmas-2026-reminder.html`.

Production campaign draft ID `5e7660ea-7f7b-4f0b-ba6c-802d626fee55`, manual audience, 39 planned recipients, status `draft`, no schedule. `recipient_filter.launch_blocked` and `needs_checkout_changes` document the launch gate; the local campaign enqueue code enforces launch_blocked and requires reviewed per-recipient personalization. Do not mark ready/approved/enqueue until the following work and customer approval are complete.

The two authorized previews were sent through the production email queue to Kenneth's two addresses with a conspicuous preview banner, not as customer campaign messages. Mailgun confirmed both delivered (SMTP 250). Gmail copy ID `1a1ee960ff7e0e25`. No customer campaign queue entries were created.

The proposed offer URL is `/?rebate=KUNDEJUL15&utm_source=customer_email&utm_medium=email&utm_campaign=ullgris_jul_2026#bokser`. The production rebate code has been created and activated at 30% of the original deposit. The LOCAL landing/checkout validates and carries the code, shows original/discounted prices and stores the offer and pickup choice in a session cookie. This code is not deployed yet; production links must not be described as fully tested.

Browser preview checked at 375, 768 and 1440px, including reduced motion and image loading. Mobile width = document width (375px). Only console error was the local preview server's missing favicon. This is browser QA, not cross-client Outlook rendering certification.

## Implemented locally and checked

- Original box prices crossed out with discounted prices in red on the landing page. The large meal photograph at the top is retained. A discount notice appears inside the email-linked box section, explaining that 15% is deducted from the deposit at payment.
- The email pickup parameter preselects farm, Trondheim, E6 or Majorstuen. A first-party session cookie remembers only the offer/referral code and pickup, with SameSite=Lax and Secure on HTTPS. URL parameters still carry the choices when cookies are unavailable. Customer changes persist into checkout.
- Checkout recalculates the offer for each box and checks it again on the server. Transport and extras receive no box discount.
- Paid-only distinct referral qualification, maximum five; atomic balance credit redemption excluding transport/extras; personal SMS/WhatsApp/copy sharing and progress display.
- Names and recorded breeds in customer-specific introductions. Egg buyers get a hatching/chicken question; chicken-only buyers get a chicken question. Preview examples explicitly disclose that the purchase history is illustrative.
- Typecheck and campaign checks passed. Transactional database integration test verified paid-only credit, retry idempotency and zero box balance; fixtures rolled back. Browser checks covered 375/768/1440 widths, reduced motion, valid/invalid/no-code visits, saved pickup across navigation and E6 pricing. No real Vipps payment was made. Targeted lint has one pre-existing checkout effect dependency warning.

## Production data changes already applied

The two migrations dated 20261118125259 and 20261118125932 were applied: original box-price/referral-credit fields, Oslo delivery type, service-role-only paid referral redemption function and the corrected SQL reference concatenation. E6 price is now 400 NOK in app_config; Trondheim/Oslo fee is 200 NOK. KUNDEJUL15 is active with no expiry. These database changes are separate from the still-unpublished frontend/API code.

Authorized tests V4, V5 and V6 were sent only to Kenneth's two addresses through Mailgun and recorded as preview-only emails. V4 delivery was confirmed for both; V5/V6 provider acceptance was confirmed. No customer campaign was queued or sent. Emails sent through Mailgun do not appear in Gmail Sent.

## Remaining before customer launch

1. Isolate relevant code/assets from unrelated existing working-tree changes, build, deploy and verify the actual live landing-to-checkout path. The production API must include the offer, Oslo and paid-referral changes before customer launch.
2. Keep the campaign draft and its personalization synchronized with the final template. Refresh complaints, opt-outs and paid orders before building the final audience. Current local selection remains 39 eligible, 24 excluded, 25 outside, eight location-held.
3. Kenneth clarified that "send this all" meant a test to himself. There is no bulk-send approval. Obtain approval for the final customer campaign before enqueueing it.
4. One reminder is drafted but neither scheduled nor approved for a specific interval. Recheck buyers/issues/opt-outs before any reminder. No recurring reminder.
5. No verified pork testimonial is available; do not invent one. Farm video assets must be deployed before the farm-film link works on production. No numeric stock promise is authorized.
