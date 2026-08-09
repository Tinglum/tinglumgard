// Shared "Kvittering" (receipt) generator for egg, pig and chicken orders.
// Each product card builds a normalized ReceiptModel (all money in øre) and
// calls openReceipt(). The renderer is product-agnostic: a print-optimized,
// invoice-styled HTML document opened in a new window that auto-triggers the
// browser print dialog (Save as PDF). No server round-trip, no PDF dependency.
//
// MVA is shown as already included in the amount paid. Rate per product:
//   eggs 25 %, pig (meat/næringsmidler) 15 %, chickens (live animals) 25 %.
// A rate of 0 omits the MVA line entirely.

export type Lang = 'no' | 'en'

export type ReceiptLine = {
  name: string
  sub?: string
  qty?: string
  amountOre: number
}

export type ReceiptPay = {
  label: string
  dateIso?: string | null
  vippsRef?: string | null
  amountOre: number
}

export type ReceiptModel = {
  orderNumber: string
  statusLabel: string
  customerName: string
  orderedAt?: string | null
  fulfilledLabel: string
  fulfilledAt?: string | null
  lines: ReceiptLine[]
  totalOre: number
  paidOre: number
  payments: ReceiptPay[]
  mvaRate: number
}

const L: Record<Lang, Record<string, string>> = {
  no: {
    receipt: 'Kvittering',
    order: 'Ordrenr.',
    ordered: 'Bestilt',
    status: 'Status',
    billedTo: 'Kunde',
    description: 'Beskrivelse',
    qty: 'Antall',
    amount: 'Beløp',
    orderTotal: 'Ordretotal',
    payments: 'Betalinger',
    paidTotal: 'Betalt totalt',
    outstanding: 'Gjenstår',
    date: 'Dato',
    confirmation: 'Vipps-referanse',
    print: 'Skriv ut / Lagre som PDF',
    thanks: 'Takk for handelen hos Tinglum Gård.',
    legal: 'Tinglum Gård · Org.nr 995 752 328 MVA · Tinglemsvegen 91, 7750 Namdalseid · post@tinglum.com',
    mvaNote: 'Alle beløp er inkl. mva. Merverdiavgift er spesifisert over.',
  },
  en: {
    receipt: 'Receipt',
    order: 'Order no.',
    ordered: 'Ordered',
    status: 'Status',
    billedTo: 'Customer',
    description: 'Description',
    qty: 'Qty',
    amount: 'Amount',
    orderTotal: 'Order total',
    payments: 'Payments',
    paidTotal: 'Total paid',
    outstanding: 'Outstanding',
    date: 'Date',
    confirmation: 'Vipps reference',
    print: 'Print / Save as PDF',
    thanks: 'Thank you for your order from Tinglum Gård.',
    legal: 'Tinglum Gård · Org. no. 995 752 328 MVA · Tinglemsvegen 91, 7750 Namdalseid · post@tinglum.com',
    mvaNote: 'All amounts include VAT. VAT is specified above.',
  },
}

export function money(ore: number, lang: Lang): string {
  const kr = Math.round(ore) / 100
  const n = kr.toLocaleString(lang === 'no' ? 'nb-NO' : 'en-US', {
    minimumFractionDigits: kr % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${n} kr`
}

export function dateOnly(value: string | null | undefined, lang: Lang): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderReceiptHtml(model: ReceiptModel, lang: Lang): string {
  const t = L[lang]
  const mvaOre = model.mvaRate > 0 ? Math.round(model.paidOre * (model.mvaRate / (1 + model.mvaRate))) : 0
  const mvaPct = Math.round(model.mvaRate * 100)
  const outstandingOre = Math.max(0, model.totalOre - model.paidOre)

  const itemRows = model.lines
    .map(
      (line) => `<tr>
      <td>${line.sub ? `<span class="sub">${esc(line.sub)}</span>` : ''}${esc(line.name)}</td>
      <td class="num">${line.qty ? esc(line.qty) : ''}</td>
      <td class="num">${money(line.amountOre, lang)}</td>
    </tr>`
    )
    .join('\n')

  const payRows = model.payments
    .map(
      (p) => `<tr>
      <td>${esc(p.label)}</td>
      <td>${dateOnly(p.dateIso, lang)}</td>
      <td class="ref">${p.vippsRef ? esc(p.vippsRef) : '—'}</td>
      <td class="num">${money(p.amountOre, lang)}</td>
    </tr>`
    )
    .join('\n')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.receipt} ${esc(model.orderNumber)} - Tinglum Gård</title>
<style>
  :root { --ink:#1c1a16; --muted:#6b6459; --line:#e4ddd2; }
  * { box-sizing: border-box; }
  html,body { margin:0; padding:0; background:#f2efe9; color:var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .sheet { max-width: 820px; margin: 24px auto; background:#fff; padding: 56px 56px 44px;
    box-shadow: 0 12px 40px rgba(0,0,0,.10); }
  .top { display:flex; justify-content:space-between; align-items:flex-start; gap:32px; }
  .brand h1 { margin:0; font-size:22px; letter-spacing:.02em; }
  .brand p { margin:2px 0 0; font-size:12px; color:var(--muted); line-height:1.55; }
  .doc { text-align:right; }
  .doc .kind { font-size:26px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .meta { margin-top:16px; border-top:2px solid var(--ink); padding-top:12px;
    display:grid; grid-template-columns:auto auto; gap:4px 20px; font-size:13px; }
  .meta .k { color:var(--muted); text-align:left; }
  .meta .v { text-align:right; font-variant-numeric: tabular-nums; }
  .parties { margin-top:36px; }
  .parties .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted); }
  .parties .name { font-size:15px; font-weight:600; margin-top:4px; }
  table { width:100%; border-collapse:collapse; margin-top:28px; font-size:13px; }
  thead th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.14em;
    color:var(--muted); border-bottom:1.5px solid var(--ink); padding:0 0 8px; }
  thead th.num, tbody td.num { text-align:right; }
  tbody td { padding:11px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  tbody td .sub { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin-bottom:2px; }
  .num { font-variant-numeric: tabular-nums; }
  .totals { margin-top:20px; margin-left:auto; width:280px; font-size:13px; }
  .totals .row { display:flex; justify-content:space-between; padding:6px 0; }
  .totals .row.grand { border-top:2px solid var(--ink); margin-top:6px; padding-top:12px; font-size:16px; font-weight:600; }
  .totals .row.mva { color:var(--muted); font-size:12px; }
  .totals .row.out { color:#9a3b1b; }
  .section-title { margin:34px 0 0; font-size:10px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted); }
  table.pay { margin-top:10px; }
  table.pay td.ref { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size:11px; color:var(--muted); }
  .foot { margin-top:40px; padding-top:16px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); line-height:1.6; }
  .foot .mva-note { margin-top:2px; }
  .foot .legal { margin-top:12px; padding-top:10px; border-top:1px solid var(--line); font-size:10px; letter-spacing:.01em; }
  .actions { text-align:center; margin:20px auto 40px; }
  .actions button { font:inherit; font-size:13px; padding:10px 22px; border:none; border-radius:999px;
    background:var(--ink); color:#fff; cursor:pointer; }
  @media print {
    html,body { background:#fff; }
    .sheet { box-shadow:none; margin:0; max-width:none; padding:32px 34px; }
    .no-print { display:none !important; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <h1>Tinglum Gård</h1>
        <p>Tinglemsvegen 91<br/>7750 Namdalseid<br/>post@tinglum.com</p>
      </div>
      <div class="doc">
        <div class="kind">${t.receipt}</div>
        <div class="meta">
          <div class="k">${t.order}</div><div class="v">${esc(model.orderNumber)}</div>
          <div class="k">${t.ordered}</div><div class="v">${dateOnly(model.orderedAt, lang)}</div>
          <div class="k">${esc(model.fulfilledLabel)}</div><div class="v">${dateOnly(model.fulfilledAt, lang)}</div>
          <div class="k">${t.status}</div><div class="v">${esc(model.statusLabel)}</div>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="lbl">${t.billedTo}</div>
      <div class="name">${esc(model.customerName)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.description}</th>
          <th class="num">${t.qty}</th>
          <th class="num">${t.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>${t.orderTotal}</span><span class="num">${money(model.totalOre, lang)}</span></div>
      <div class="row grand"><span>${t.paidTotal}</span><span class="num">${money(model.paidOre, lang)}</span></div>
      ${model.mvaRate > 0 ? `<div class="row mva"><span>${lang === 'no' ? 'Herav MVA' : 'Incl. VAT'} (${mvaPct}%)</span><span class="num">${money(mvaOre, lang)}</span></div>` : ''}
      ${outstandingOre > 0 ? `<div class="row out"><span>${t.outstanding}</span><span class="num">${money(outstandingOre, lang)}</span></div>` : ''}
    </div>

    ${
      payRows
        ? `<div class="section-title">${t.payments}</div>
    <table class="pay">
      <thead>
        <tr><th>${t.description}</th><th>${t.date}</th><th>${t.confirmation}</th><th class="num">${t.amount}</th></tr>
      </thead>
      <tbody>${payRows}</tbody>
    </table>`
        : ''
    }

    <div class="foot">
      <div>${t.thanks}</div>
      ${model.mvaRate > 0 ? `<div class="mva-note">${t.mvaNote}</div>` : ''}
      <div class="legal">${t.legal}</div>
    </div>
  </div>

  <div class="actions no-print">
    <button onclick="window.print()">${t.print}</button>
  </div>

  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},350);});</script>
</body>
</html>`
}

/** Opens the receipt in a new window and triggers the print/save-as-PDF dialog. */
export function openReceipt(model: ReceiptModel, lang: Lang): void {
  const html = renderReceiptHtml(model, lang)
  // NB: do not pass 'noopener'/'noreferrer' here — those make window.open()
  // return null, leaving a blank about:blank window we can't write into.
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
    return
  }
  // Popup blocked: fall back to a data URL in a new tab so the user still gets the receipt.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
