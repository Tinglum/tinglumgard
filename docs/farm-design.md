# Tinglum Farm Design

The farm storefront uses the V3 visual identity. The homepage renders
`PigSalesV3` inside the shared farm shell. `/v3` remains a standalone preview.

## Foundations

- Display type: Barlow Condensed, 600 and 700.
- Body and controls: DM Sans, 400 through 700.
- Paper: `#faf6ed`; secondary surface: `#f1ecdf`.
- Ink: `#292b24`; primary action: `#b53e2d`.
- Secondary text: `#66675a`; borders: `#d5cebf`.
- Flat surfaces, fine borders, small corners, expressive headings.
- Real food or breed photographs; matching Lucide icons for box categories
  and missing breed images. Do not use unrelated stock-photo fallbacks.

## Shared Components

`FarmHeader` provides product navigation, the account menu, Vipps login,
unread message counts, egg cart counts, language selection and a mobile menu.
`FarmFooter` provides product links, contact information, legal links and the
existing next-season waitlist. Operational pages use a compact footer.

`styles/farm-design.css` scopes tokens and styles to `.farm-site`. It also
adapts existing utility classes so legacy forms use the same palette without
rewriting their behaviour. New farm components should use the farm tokens
and semantic classes rather than adding another palette or glass effects.
Dialog styling is scoped through the body attribute managed by `AppShell`.

## Route Coverage

The shell covers checkout and confirmations, accounts and payment pages,
recipes and recipe details, eggs and their ordering flow, chickens,
product information, the butcher diagram, legal pages and the not-found page.
Admin, milk and egg collection share the identity with smaller headings and
denser operational controls. BNI MSP, Quest and TodoTwo retain their own shells.

## Interaction Rules

`FarmJourney` shows the active decision and links back to earlier choices.
Mobile pig checkout has five steps, including review; desktop has four with
delivery and payment combined. Egg ordering uses cart, delivery and payment.
Completed desktop choices collapse into editable summaries. Checkout has a
focused header and compact footer. `OrderNextActions` links confirmation
pages to the exact order on Min side without inferring payment success.

- Keep ordering, payment, inventory and session logic in the existing flows.
- Norwegian cut labels omit the parenthetical translations via `displayCutName`.
- Maintain visible keyboard focus, labelled inputs and selected-state semantics.
- Respect reduced motion. Content remains visible before any animation runs.
- Check phone, tablet and desktop widths when changing shared styles.
- Stop the dev server before a production build, then restart with a clean
  development cache so generated production and development files do not mix.
