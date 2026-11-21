import { supabaseAdmin } from '../lib/supabase/server';

const SHELL = (params: {
  title: string;
  preheader: string;
  stripText: string;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  bodyHtml: string;
  heroImage?: string;
}) => `<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${params.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#e8e2d5;color:#292b24;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased}
table{border-collapse:collapse}
img{display:block;border:0;max-width:100%}
a{color:#b53e2d}
@media(max-width:640px){.pad{padding-left:20px!important;padding-right:20px!important}.h1{font-size:36px!important}}
</style></head><body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${params.preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:16px 0">
<table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#faf6ed;border:1px solid #d5cebf">
<tr><td class="pad" style="padding:18px 32px;border-bottom:1px solid #d5cebf">
  <table role="presentation" width="100%"><tr>
    <td style="font-family:'Barlow Condensed','Bahnschrift Condensed','DIN Condensed','Franklin Gothic Medium',Arial,sans-serif;font-weight:700;font-size:24px;line-height:.88;color:#292b24">TINGLUM<br>GÅRD<span style="color:#b53e2d">.</span></td>
    <td align="right" valign="middle" style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#66675a">Namdalseid · Ullgris jul 2026</td>
  </tr></table>
</td></tr>
<tr><td class="pad" style="background:#b53e2d;color:#faf6ed;padding:11px 32px;font-size:12px;font-weight:700">${params.stripText}</td></tr>
${params.heroImage ? `<tr><td><img src="${params.heroImage}" width="680" height="230" style="width:100%;height:230px;object-fit:cover;display:block" alt="Tinglum Gård"></td></tr>` : ''}
<tr><td class="pad" style="padding:28px 32px">
  <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b53e2d;margin:0 0 8px">${params.eyebrow}</div>
  <h1 class="h1" style="font-family:'Barlow Condensed','Bahnschrift Condensed','DIN Condensed','Franklin Gothic Medium',Arial,sans-serif;font-weight:700;text-transform:uppercase;font-size:44px;line-height:.96;margin:0 0 18px;color:#292b24">${params.headlineLine1}<br><span style="color:#b53e2d">${params.headlineLine2}</span></h1>
  ${params.bodyHtml}
</td></tr>
<tr><td class="pad" style="padding:22px 32px;border-top:1px solid #d5cebf">
  <p style="margin:0;font-size:14px;line-height:1.7;color:#292b24">Lurer du på noe? Bare svar på denne e-posten.<br><strong>Hilsen Kenneth</strong> · Tinglum Gård</p>
</td></tr>
<tr><td class="pad" style="padding:16px 32px;border-top:1px solid #d5cebf;font-size:11px;line-height:1.65;color:#66675a">
  Tinglum Gård · Tinglemsvegen 91 · 7750 Namdalseid · <a href="https://xn--tinglumgrd-85a.no/min-side" style="color:#66675a">Min side</a>
</td></tr>
</table>
</td></tr></table></body></html>`;

const TEMPLATES = [
  {
    template_key: 'pig.order.deposit.confirmed.customer',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Takk for bestillingen – {{order_number}} er reservert (få resten dekket med venner)',
    subject_en: 'Order confirmed – {{order_number}} is reserved',
    body_no: SHELL({
      title: 'Bestillingen er bekreftet – {{order_number}}',
      preheader: 'Tusen takk! Forskuddet er registrert. Slakt 2. uken i desember – og del lenken din for å få resten av boksen dekket.',
      stripText: 'Ordre {{order_number}} bekreftet &nbsp;·&nbsp; Slakt 2. uken i desember &nbsp;·&nbsp; Alt leveres fryst og vakumpakket',
      eyebrow: 'Tusen takk for bestillingen',
      headlineLine1: 'BOKSEN DIN ER RESERVERT,',
      headlineLine2: '{{customer_first_name}}.',
      heroImage: 'https://xn--tinglumgrd-85a.no/recipes/julespesial-julemiddag.jpg?v=2',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Tusen takk for at du bestilte utegående Mangalitsa ullgris fra oss på Tinglum Gård. Vi har registrert forskuddet ditt for <strong>{{order_number}}</strong>, og boksen din er nå reservert.</p>

  <table role="presentation" width="100%" style="background:#f5f0e4;border:1px solid #d5cebf;margin:0 0 20px"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.7">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#66675a;margin-bottom:8px">Bestillingen din · {{order_number}}</div>
    <table role="presentation" width="100%" style="font-size:14px">
      <tr><td style="padding:4px 0;color:#4f5046">Boks</td><td align="right" style="padding:4px 0"><strong>{{box_label}}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#4f5046">Ribbevalg</td><td align="right" style="padding:4px 0">{{ribbe_choice}}</td></tr>
      <tr><td style="padding:4px 0;color:#4f5046">Henting / levering</td><td align="right" style="padding:4px 0"><strong>{{delivery_label}}</strong></td></tr>
      {{discount_html}}
      <tr><td style="padding:8px 0 4px;border-top:1px solid #d5cebf;color:#4f5046">Forskudd betalt nå</td><td align="right" style="padding:8px 0 4px;border-top:1px solid #d5cebf"><strong style="color:#b53e2d">{{deposit_amount_nok}}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#4f5046">Rest før levering</td><td align="right" style="padding:4px 0"><strong>{{remainder_amount_nok}}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#4f5046">Totalt</td><td align="right" style="padding:4px 0"><strong>{{total_amount_nok}}</strong></td></tr>
    </table>
    {{extras_html}}
  </td></tr></table>

  <div style="background:#fffdf8;border:1px solid #d5cebf;border-left:4px solid #b53e2d;padding:18px 20px;margin:0 0 20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b53e2d;margin-bottom:8px">Hva skjer fremover?</div>
    <ol style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.7;color:#292b24">
      <li><strong>Slakt i 2. uken i desember:</strong> Grisene slaktes og parteres i uke 50. Alt kjøttet vakumpakkes og fryses inn for topp kvalitet.</li>
      <li><strong>Restbetaling før utlevering:</strong> Du får egen e-post når restbetalingen åpner. Eventuell vennebonus trekkes automatisk fra!</li>
      <li><strong>Utlevering før jul:</strong> Henting på gården i Namdalseid etter avtale · <strong>Trondheim søndag 20. desember</strong> · <strong>E6 og Majorstuen (Oslo) mandag 21. desember</strong>.</li>
    </ol>
  </div>

  <table role="presentation" width="100%" style="margin:0 0 6px"><tr>
    <td style="background:#b53e2d" align="center"><a href="{{order_url}}" style="display:block;padding:14px 20px;color:#faf6ed;text-decoration:none;font-size:14px;font-weight:700">Se bestillingen på Min side &nbsp;→</a></td>
  </tr></table>

  {{referral_share_html}}`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, thank you for ordering Mangalitsa pork from Tinglum Farm! Your deposit for <strong>{{order_number}}</strong> ({{box_label}}) is confirmed. Slaughter takes place in the 2nd week of December (all boxes are vacuum-packed and frozen). Pickup: farm by arrangement, Trondheim Sunday 20 Dec, E6 &amp; Majorstuen Oslo Monday 21 Dec.</p><p><a href="{{order_url}}">View your order on My page</a></p>{{referral_share_html}}`,
  },
  {
    template_key: 'pig.order.referral.nudge',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Tips venner før slakt – få restbeløpet på {{order_number}} ned mot 0 kr',
    subject_en: 'Share with friends before slaughter – cut your balance on {{order_number}}',
    body_no: SHELL({
      title: 'Få restbeløpet på boksen ned mot 0 kr',
      preheader: 'Hver venn som bestiller via din lenke får 15 % rabatt – og du får {{per_friend_credit_nok}} trukket fra restbeløpet.',
      stripText: 'Ordre {{order_number}} &nbsp;·&nbsp; Slakt i 2. uken i desember &nbsp;·&nbsp; Del med venner før restbetalingen',
      eyebrow: 'En rask påminnelse til deg',
      headlineLine1: 'KUTT RESTBELØPET',
      headlineLine2: 'MED VENNEBONUS.',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Om noen uker nærmer vi oss slakt (2. uken i desember) for <strong>{{box_label}}</strong> ({{order_number}}).</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Husk at du kan redusere restbeløpet ditt før levering ved å dele din personlige lenke med venner, familie eller kolleger som også vil ha utegående ullgris til jul. De får <strong>15 % rabatt</strong>, og du får <strong>{{per_friend_credit_nok}} per venn</strong> (opptil 5 venner = hele restbeløpet på boksen dekket!).</p>
  {{referral_share_html}}`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, remember you can share your personal link before slaughter in the 2nd week of December: friends get 15% off and you earn {{per_friend_credit_nok}} per friend (up to 5 friends).</p>{{referral_share_html}}`,
  },
  {
    template_key: 'pig.remainder.explainer.full',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Slakt nærmer seg i 2. uken i desember – {{order_number}}',
    subject_en: 'Slaughter is approaching (2nd week of December) – {{order_number}}',
    body_no: SHELL({
      title: 'Slakt nærmer seg – {{order_number}}',
      preheader: 'Grisene slaktes i 2. uken i desember og leveres fryst og vakumpakket. Siste sjanse til å samle vennebonus før restbetaling!',
      stripText: 'Ordre {{order_number}} &nbsp;·&nbsp; Slakt i 2. uken i desember &nbsp;·&nbsp; Henting 20.–21. desember',
      eyebrow: 'Oppdatering fra Tinglum Gård',
      headlineLine1: 'SLAKT NÆRMER SEG.',
      headlineLine2: 'SLIK FUNGERER RESTEN.',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Nå nærmer vi oss slakt i <strong>2. uken i desember</strong> for din <strong>{{box_label}}</strong> ({{order_number}}). Alt kjøttet parteres, vakumpakkes og fryses inn slik at det holder topp kvalitet hele veien til julemiddagen.</p>
  <table role="presentation" width="100%" style="background:#f5f0e4;border:1px solid #d5cebf;margin:0 0 18px"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.7">
    <strong>Henting / levering:</strong> {{delivery_label}}<br>
    <strong>Restbeløp før evt. ny vennebonus:</strong> {{remainder_amount_nok}}<br>
    <span style="font-size:12px;color:#66675a">Du får egen e-post med betalingslenke når restbetalingen er klar.</span>
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.65"><strong>Fortsatt tid til å dele med venner!</strong> Alle venner som bestiller og betaler forskuddet før restbetalingen din trekker <strong>{{per_friend_credit_nok}}</strong> rett av boksen din:</p>
  {{referral_share_html}}`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, slaughter is approaching in the 2nd week of December for {{order_number}}. Everything is vacuum-packed and frozen. There is still time to share your link with friends before final balance payment.</p>{{referral_share_html}}`,
  },
  {
    template_key: 'pig.remainder.reminder',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Restbetaling for din ullgriskasse – {{order_number}}',
    subject_en: 'Final balance payment for your pork box – {{order_number}}',
    body_no: SHELL({
      title: 'Restbetaling – {{order_number}}',
      preheader: 'Tid for restbetaling for {{order_number}} ({{remainder_amount_nok}}) før utlevering.',
      stripText: 'Ordre {{order_number}} &nbsp;·&nbsp; Restbetaling klar &nbsp;·&nbsp; {{delivery_label}}',
      eyebrow: 'Klar for siste steg',
      headlineLine1: 'RESTBETALING',
      headlineLine2: 'FOR {{order_number}}.',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Boksen din (<strong>{{box_label}}</strong>) nærmer seg utlevering. Eventuell opptjent vennebonus er allerede trukket fra.</p>
  <table role="presentation" width="100%" style="background:#f5f0e4;border:1px solid #d5cebf;margin:0 0 20px"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.7">
    <strong>Restbeløp å betale:</strong> <span style="color:#b53e2d;font-size:17px"><strong>{{remainder_amount_nok}}</strong></span><br>
    <strong>Henting / levering:</strong> {{delivery_label}}
  </td></tr></table>
  <table role="presentation" width="100%"><tr>
    <td style="background:#b53e2d" align="center"><a href="{{order_url}}" style="display:block;padding:15px 20px;color:#faf6ed;text-decoration:none;font-size:14px;font-weight:700">Betal restbeløpet på Min side &nbsp;→</a></td>
  </tr></table>`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, your balance of <strong>{{remainder_amount_nok}}</strong> for {{order_number}} is now ready to pay on <a href="{{order_url}}">My page</a>.</p>`,
  },
  {
    template_key: 'pig.order.remainder.paid.customer',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Alt er betalt – vi gleder oss til å levere {{order_number}}!',
    subject_en: 'Fully paid – ready for delivery {{order_number}}',
    body_no: SHELL({
      title: 'Restbetalingen er mottatt – {{order_number}}',
      preheader: 'Takk! Hele bestillingen {{order_number}} er nå betalt og klar for utlevering.',
      stripText: 'Ordre {{order_number}} betalt i sin helhet &nbsp;·&nbsp; {{delivery_label}}',
      eyebrow: 'Alt er i boks',
      headlineLine1: 'RESTBETALINGEN',
      headlineLine2: 'ER MOTTATT.',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Tusen takk – vi har registrert restbetalingen for <strong>{{order_number}}</strong> (<strong>{{box_label}}</strong>). Nå er alt betalt og klart til utlevering.</p>
  <table role="presentation" width="100%" style="background:#f5f0e4;border:1px solid #d5cebf;margin:0 0 20px"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.7">
    <strong>Henting / levering:</strong> {{delivery_label}}<br>
    <strong>Pakking:</strong> Alt leveres fryst og vakumpakket – klar rett i fryseren eller til tining før julaften.
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.65"><strong>Tips til julemiddagen:</strong> Ullgrisribba leveres uten svor og har høy fettmarmorering – stek den lavt og lenge for utrolig saftig kjøtt! Se våre oppskrifter på <a href="https://xn--tinglumgrd-85a.no/oppskrifter" style="color:#b53e2d;font-weight:700">tinglumgård.no/oppskrifter →</a></p>`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, your final payment for {{order_number}} is received. Everything is frozen and vacuum-packed. See recipes at <a href="https://xn--tinglumgrd-85a.no/oppskrifter">tinglumgård.no/oppskrifter</a>.</p>`,
  },
  {
    template_key: 'pig.order.ready_for_pickup',
    classification: 'transactional',
    product_scope: 'pig',
    subject_no: 'Ullgriskassen din er klar for henting – {{order_number}}',
    subject_en: 'Your pork box is ready for collection – {{order_number}}',
    body_no: SHELL({
      title: 'Klar for henting – {{order_number}}',
      preheader: 'Boksen din ({{box_label}}) er pakket, fryst og klar til henting!',
      stripText: 'Ordre {{order_number}} klar &nbsp;·&nbsp; {{delivery_label}}',
      eyebrow: 'Klar for jul',
      headlineLine1: 'BOKSEN DIN ER',
      headlineLine2: 'KLAR FOR HENTING.',
      heroImage: 'https://xn--tinglumgrd-85a.no/recipes/norsk-ribbe-uten-svor.png',
      bodyHtml: `
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hei {{customer_first_name}}! Nå er <strong>{{box_label}}</strong> ({{order_number}}) pakket, fryst og klar for utlevering.</p>
  <table role="presentation" width="100%" style="background:#f5f0e4;border:1px solid #d5cebf;margin:0 0 20px"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.7">
    <strong>Henting:</strong> {{delivery_label}}<br>
    <strong>Tips:</strong> Ta gjerne med en kjølebag eller eske hvis du har litt kjørevei hjem.
  </td></tr></table>
  <p style="margin:0 0 18px;font-size:14px;line-height:1.65">Trenger du inspirasjon til ribba (uten svor), julepølsene eller stykningsdelene i romjula? Sjekk <a href="https://xn--tinglumgrd-85a.no/oppskrifter" style="color:#b53e2d;font-weight:700">oppskriftene våre her →</a></p>
  <p style="margin:0;font-size:15px;font-weight:700;color:#292b24">Riktig god jul fra oss på Tinglum Gård!</p>`,
    }),
    body_en: `<p>Hi {{customer_first_name}}, your box {{box_label}} ({{order_number}}) is packed, frozen, and ready for pickup: {{delivery_label}}. Merry Christmas from Tinglum Farm!</p>`,
  },
];

async function main() {
  for (const tpl of TEMPLATES) {
    const { data: existing } = await supabaseAdmin
      .from('email_templates')
      .select('id')
      .eq('template_key', tpl.template_key)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from('email_templates')
        .update({
          classification: tpl.classification,
          product_scope: tpl.product_scope,
          subject_no: tpl.subject_no,
          subject_en: tpl.subject_en,
          body_no: tpl.body_no,
          body_en: tpl.body_en,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(`Update ${tpl.template_key} failed: ${error.message}`);
      console.log('UPDATED:', tpl.template_key);
    } else {
      const { error } = await supabaseAdmin.from('email_templates').insert({
        ...tpl,
        active: true,
      });
      if (error) throw new Error(`Insert ${tpl.template_key} failed: ${error.message}`);
      console.log('INSERTED:', tpl.template_key);
    }
  }
  console.log(`All ${TEMPLATES.length} pig email templates upgraded in Supabase.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
