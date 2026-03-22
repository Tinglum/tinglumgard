import { dispatchEmail } from '@/lib/email/dispatch';
import { processScheduledCampaigns } from '@/lib/email/campaigns';
import { cancelQueueEntry, enqueueEmailRecord } from '@/lib/email/queue';
import { renderManagedTemplate } from '@/lib/email/render';
import { getEmailSchemaStatus } from '@/lib/email/schema';
import { buildCustomerOrderLink, buildCustomerPathLink } from '@/lib/email/links';
import { supabaseAdmin } from '@/lib/supabase/server';

type Ymd = { year: number; month: number; day: number };

type LifecycleConfig = {
  timezone: string;
  pigRemainderDueDate: string;
  pigRemainderReminderDays: number[];
  pigPostOrderExplainerDelayDays: number;
  eggRemainderReminderDays: number[];
  eggOverdueGraceHours: number;
  chickenPickupReminderDays: number[];
  chickenAutoReadyDaysBefore: number;
  campaignSendViaApiCronOnly: boolean;
  appBaseUrl: string;
};

type FlowDefinition = {
  id: string;
  flow_key: string;
  template_key: string;
  mode: 'shadow' | 'active' | 'disabled';
  active: boolean;
  product_scope: string;
};

type FlowInstance = {
  id: string;
  flow_key: string;
  entity_type: string;
  entity_id: string;
  trigger_date_key: string;
  status: string;
  locale: string;
  to_email: string | null;
  payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  scheduled_for: string;
};

type FlowRunSummary = {
  scanned: number;
  due: number;
  enqueued: number;
  completed: number;
  skipped: number;
  failed: number;
  missingEmail: number;
  campaignsQueued: number;
};

type LifecycleTemplateSeed = {
  templateKey: string;
  classification: 'transactional' | 'support' | 'promotional' | 'system';
  productScope: 'pig' | 'eggs' | 'chickens' | 'shared';
  subjectNo: string;
  subjectEn: string;
  bodyNo: string;
  bodyEn: string;
  variables: string[];
};

type LifecycleFlowSeed = {
  flowKey: string;
  eventType: string;
  productScope: 'pig' | 'eggs' | 'chickens' | 'shared';
  templateKey: string;
  mode: 'shadow' | 'active' | 'disabled';
  active: boolean;
  sendOffsetMinutes: number;
};

type FlowMatrixRow = {
  flowKey: string;
  productScope: 'pig' | 'eggs' | 'chickens' | 'shared';
  eventType: string;
  templateKey: string;
  triggerRule: string;
  scheduleLocalTime: string;
  stopRules: string[];
};

const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  timezone: 'Europe/Oslo',
  pigRemainderDueDate: '2026-11-16',
  pigRemainderReminderDays: [30, 21, 14, 7, 3, 1],
  pigPostOrderExplainerDelayDays: 10,
  eggRemainderReminderDays: [11, 9, 7, 6],
  eggOverdueGraceHours: 48,
  chickenPickupReminderDays: [3, 1],
  chickenAutoReadyDaysBefore: 4,
  campaignSendViaApiCronOnly: true,
  appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no',
};

const EGG_HATCH_FOLLOWUP_DELAY_DAYS = 5;

const LIFECYCLE_TEMPLATE_SEEDS: LifecycleTemplateSeed[] = [
  {
    templateKey: 'pig.remainder.explainer.full',
    classification: 'transactional',
    productScope: 'pig',
    subjectNo: 'Slik fungerer restbetalingen for {{order_number}}',
    subjectEn: 'How remainder payment works for {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Takk for bestillingen din. Restbetalingen for <strong>{{order_number}}</strong> er <strong>{{remainder_amount_nok}}</strong>, med forfall <strong>{{due_date}}</strong>.</p><p>Du finner full oversikt og neste steg på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>The remainder for <strong>{{order_number}}</strong> is <strong>{{remainder_amount_nok}}</strong>, due on <strong>{{due_date}}</strong>.</p><p><a href="{{order_url}}">Go to My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'order_url'],
  },
  {
    templateKey: 'pig.remainder.explainer.reduced',
    classification: 'transactional',
    productScope: 'pig',
    subjectNo: 'Oppdatering for {{order_number}}',
    subjectEn: 'Update for {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Vi har registrert at restbetalingen for <strong>{{order_number}}</strong> allerede er betalt.</p><p>Du finner ordredetaljene på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>The remainder is already registered for <strong>{{order_number}}</strong>.</p><p><a href="{{order_url}}">Go to My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  },
  {
    templateKey: 'pig.remainder.reminder',
    classification: 'transactional',
    productScope: 'pig',
    subjectNo: 'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
    subjectEn: 'Remainder reminder ({{days_left}} days) - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Dette er en vennlig påminnelse om restbetaling for <strong>{{order_number}}</strong>.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}<br/><strong>Forfall:</strong> {{due_date}} ({{days_left}} dager igjen)</p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Remainder for <strong>{{order_number}}</strong>: <strong>{{remainder_amount_nok}}</strong>.</p><p>Due date: <strong>{{due_date}}</strong> ({{days_left}} days left).</p><p><a href="{{order_url}}">Go to My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'order_url'],
  },
  {
    templateKey: 'egg.remainder.reminder',
    classification: 'transactional',
    productScope: 'eggs',
    subjectNo: 'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
    subjectEn: 'Remainder reminder ({{days_left}} days) - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Restbetalingen for rugeeggordren <strong>{{order_number}}</strong> gjenstår.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}<br/><strong>Forfall:</strong> {{due_date}}</p><p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>The remainder for hatching egg order <strong>{{order_number}}</strong> is still outstanding.</p><p>Amount: <strong>{{remainder_amount_nok}}</strong><br/>Due date: <strong>{{due_date}}</strong></p><p><a href="{{order_url}}">Open your order on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'order_url'],
  },
  {
    templateKey: 'egg.delivery.day_before',
    classification: 'transactional',
    productScope: 'eggs',
    subjectNo: 'Rugeeggene dine er på vei! - {{order_number}}',
    subjectEn: 'Your hatching eggs are on the way! - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Rugeegg-bestilling <strong>{{order_number}}</strong> er nå sendt!</p><p>Sporingsnummer: <strong>{{tracking_number}}</strong><br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p><p>Sørg for å ha rugemaskinen klar når pakken ankommer.</p><p><a href="{{order_url}}">Se bestillingen på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Hatching egg order <strong>{{order_number}}</strong> is now shipped!</p><p>Tracking number: <strong>{{tracking_number}}</strong><br/><a href="{{tracking_url}}">Track with Posten</a></p><p>Make sure to have your incubator ready when the package arrives.</p><p><a href="{{order_url}}">View your order on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'tracking_number', 'tracking_url', 'order_url'],
  },
  {
    templateKey: 'egg.order.shipped.customer',
    classification: 'transactional',
    productScope: 'eggs',
    subjectNo: 'Rugeeggene er sendt - {{order_number}}',
    subjectEn: 'Your hatching eggs are on the way - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Vi har sendt bestillingen din <strong>{{order_number}}</strong> med Posten.</p><p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p><p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}</p><p><strong>Levering:</strong> Uke {{delivery_week}} ({{delivery_date}})</p><p><strong>Hva skjer nå?</strong><br/>1) Følg sporingen hos Posten<br/>2) Kontroller eggene ved mottak<br/>3) Gå til Min side hvis du trenger hjelp</p><p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Your order <strong>{{order_number}}</strong> has been shipped with Posten.</p><p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track your parcel</a></p><p><strong>Order lines:</strong></p>{{order_lines_html}}<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remaining:</strong> {{remainder_amount_nok}}</p><p><strong>Delivery:</strong> Week {{delivery_week}} ({{delivery_date}})</p><p><strong>What happens next?</strong><br/>1) Track the parcel<br/>2) Check the eggs on arrival<br/>3) Use My Page if you need help</p><p><a href="{{order_url}}">Open your order on My Page</a></p>',
    variables: [
      'customer_name',
      'customer_first_name',
      'order_number',
      'tracking_number',
      'tracking_url',
      'order_lines_html',
      'total_quantity',
      'total_amount_nok',
      'deposit_amount_nok',
      'remainder_amount_nok',
      'delivery_week',
      'delivery_date',
      'order_url',
    ],
  },
  {
    templateKey: 'egg.hatch.followup',
    classification: 'transactional',
    productScope: 'eggs',
    subjectNo: 'Lykke til med klekkingen - {{order_number}}',
    subjectEn: 'Happy hatching - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Vi h&aring;per klekkingen g&aring;r fint for <strong>{{order_number}}</strong>.</p><p>Har du sp&oslash;rsm&aring;l underveis, send oss gjerne en melding via nettsiden.</p><p><a href="{{message_url}}">Send melding p&aring; Min side</a></p><hr/><p><strong>Tilbud fra Tinglum G&aring;rd:</strong> Du f&aring;r <strong>10% rabatt p&aring; forskuddet</strong> p&aring; valgfri Mangalitsa-kasse med koden <strong>{{deposit_discount_code}}</strong>.</p><p><a href="{{pork_url}}">Se Mangalitsa-kasser</a></p><p><strong>Vennerrabatt:</strong> Del vennerrabattkoden din. Venner f&aring;r rabatt, og du kan tjene kreditt tilsvarende opptil <strong>50% av forskuddet</strong> n&aring;r de bestiller.</p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>We hope your hatch is going well for <strong>{{order_number}}</strong>.</p><p>If you have any questions, send us a message through the website.</p><p><a href="{{message_url}}">Send a message on My Page</a></p><hr/><p><strong>Special offer from Tinglum Gard:</strong> Get <strong>10% off your deposit</strong> on any Mangalitsa box with code <strong>{{deposit_discount_code}}</strong>.</p><p><a href="{{pork_url}}">Explore Mangalitsa boxes</a></p><p><strong>Referral bonus:</strong> Share your referral code. Your friends get a discount, and you can earn credit worth up to <strong>50% of your deposit</strong> as they order.</p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'message_url', 'pork_url', 'deposit_discount_code'],
  },
  {
    templateKey: 'egg.order.forfeited',
    classification: 'transactional',
    productScope: 'eggs',
    subjectNo: 'Bestillingen er kansellert - {{order_number}}',
    subjectEn: 'Order cancelled - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Bestillingen <strong>{{order_number}}</strong> er kansellert fordi restbetalingen ikke ble registrert innen fristen.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Order <strong>{{order_number}}</strong> was cancelled because the remainder was not registered before the deadline.</p><p><a href="{{order_url}}">View details on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  },
  {
    templateKey: 'chicken.ready_for_pickup',
    classification: 'transactional',
    productScope: 'chickens',
    subjectNo: 'Kyllingene er klare for henting - {{order_number}}',
    subjectEn: 'Chickens ready for pickup - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Bestilling <strong>{{order_number}}</strong> er klar for henting.</p><p>Du finner alle detaljer på Min side.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Order <strong>{{order_number}}</strong> is ready for pickup.</p><p><a href="{{order_url}}">View details on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  },
  {
    templateKey: 'chicken.pickup.reminder',
    classification: 'transactional',
    productScope: 'chickens',
    subjectNo: 'Påminnelse om henting ({{days_left}} dager) – {{order_number}}',
    subjectEn: 'Pickup reminder ({{days_left}} days) - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Dette er en påminnelse om henting for <strong>{{order_number}}</strong>.</p><p><strong>Hentedato:</strong> {{pickup_date}} ({{days_left}} dager igjen)</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Pickup reminder for <strong>{{order_number}}</strong>.</p><p>Pickup date: <strong>{{pickup_date}}</strong> ({{days_left}} days left).</p><p><a href="{{order_url}}">View details on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'pickup_date', 'days_left', 'order_url'],
  },
  {
    templateKey: 'chicken.remainder.collected',
    classification: 'transactional',
    productScope: 'chickens',
    subjectNo: 'Kvittering for restbetaling - {{order_number}}',
    subjectEn: 'Receipt for remainder payment - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Restbetalingen for <strong>{{order_number}}</strong> er registrert ved henting.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}">Se bestillingen på Min side</a></p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>The remainder payment for <strong>{{order_number}}</strong> was registered at pickup.</p><p>Amount: <strong>{{remainder_amount_nok}}</strong>.</p><p><a href="{{order_url}}">View your order on My Page</a></p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'order_url'],
  },
  {
    templateKey: 'chicken.order.followup',
    classification: 'transactional',
    productScope: 'chickens',
    subjectNo: 'Takk for kyllingbestillingen - {{order_number}}',
    subjectEn: 'Thanks for your chicken order - {{order_number}}',
    bodyNo:
      '<p>Hei {{customer_first_name}},</p><p>Takk for bestillingen av kyllinger fra Tinglum Gård! Vi gleder oss til du henter dem.</p><p>Har du spørsmål, send oss gjerne en melding via nettsiden.</p><p><a href="{{message_url}}">Send melding på Min side</a></p><hr/><p><strong>Tilbud fra Tinglum Gård:</strong> Som kyllingkunde har du <strong>10% rabatt på forskuddet</strong> på din første Mangalitsa-kasse. Rabatten legges til automatisk ved bestilling.</p><p><a href="{{pork_url}}">Besøk tinglumgård.no</a></p><p><strong>Vennerabatt:</strong> Del vennerabattkoden din. Venner får rabatt, og du kan tjene kreditt tilsvarende opptil <strong>50% av forskuddet</strong> når de bestiller.</p>',
    bodyEn:
      '<p>Hi {{customer_first_name}},</p><p>Thank you for your chicken order from Tinglum Gård! We look forward to your pickup.</p><p>If you have any questions, feel free to send us a message on the website.</p><p><a href="{{message_url}}">Send a message on My Page</a></p><hr/><p><strong>Offer from Tinglum Gård:</strong> As a chicken customer, you get <strong>10% off the deposit</strong> on your first Mangalitsa box. The discount is applied automatically at checkout.</p><p><a href="{{pork_url}}">Visit tinglumgård.no</a></p><p><strong>Referral bonus:</strong> Share your referral code. Friends get a discount, and you can earn credit worth up to <strong>50% of the deposit</strong> when they order.</p>',
    variables: ['customer_name', 'customer_first_name', 'order_number', 'message_url', 'pork_url', 'order_url'],
  },
];

const LIFECYCLE_FLOW_SEEDS: LifecycleFlowSeed[] = [
  {
    flowKey: 'pig.remainder.explainer',
    eventType: 'pig.deposit_paid',
    productScope: 'pig',
    templateKey: 'pig.remainder.explainer.full',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'pig.remainder.reminder',
    eventType: 'pig.deposit_paid',
    productScope: 'pig',
    templateKey: 'pig.remainder.reminder',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'egg.remainder.reminder',
    eventType: 'egg.deposit_paid',
    productScope: 'eggs',
    templateKey: 'egg.remainder.reminder',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'egg.delivery.day_before',
    eventType: 'egg.order.shipped_followup',
    productScope: 'eggs',
    templateKey: 'egg.delivery.day_before',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'egg.hatch.followup',
    eventType: 'egg.order.shipped',
    productScope: 'eggs',
    templateKey: 'egg.hatch.followup',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'egg.order.forfeited',
    eventType: 'egg.overdue_forfeit',
    productScope: 'eggs',
    templateKey: 'egg.order.forfeited',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'chicken.ready_for_pickup',
    eventType: 'chicken.auto_ready_for_pickup',
    productScope: 'chickens',
    templateKey: 'chicken.ready_for_pickup',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'chicken.pickup.reminder',
    eventType: 'chicken.pickup_reminder',
    productScope: 'chickens',
    templateKey: 'chicken.pickup.reminder',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'chicken.remainder.collected',
    eventType: 'chicken.remainder_collected',
    productScope: 'chickens',
    templateKey: 'chicken.remainder.collected',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 0,
  },
  {
    flowKey: 'chicken.order.followup',
    eventType: 'chicken.remainder_collected',
    productScope: 'chickens',
    templateKey: 'chicken.order.followup',
    mode: 'active',
    active: true,
    sendOffsetMinutes: 60, // 1 hour after pickup receipt
  },
];

const LIFECYCLE_FLOW_MATRIX: FlowMatrixRow[] = [
  {
    flowKey: 'pig.remainder.explainer',
    productScope: 'pig',
    eventType: 'pig.deposit_paid',
    templateKey: 'pig.remainder.explainer.full|pig.remainder.explainer.reduced',
    triggerRule: 'created_at + pig_post_order_explainer_delay_days',
    scheduleLocalTime: '10:00 Europe/Oslo',
    stopRules: ['order.cancelled', 'order.refunded'],
  },
  {
    flowKey: 'pig.remainder.reminder',
    productScope: 'pig',
    eventType: 'pig.deposit_paid',
    templateKey: 'pig.remainder.reminder',
    triggerRule: 'pig_remainder_due_date - pig_remainder_reminder_days[]',
    scheduleLocalTime: '10:00 Europe/Oslo',
    stopRules: ['remainder_already_paid', 'order.cancelled', 'order.refunded'],
  },
  {
    flowKey: 'egg.remainder.reminder',
    productScope: 'eggs',
    eventType: 'egg.deposit_paid',
    templateKey: 'egg.remainder.reminder',
    triggerRule: 'delivery_monday - egg_remainder_reminder_days[]',
    scheduleLocalTime: '09:00 Europe/Oslo',
    stopRules: ['remainder_not_due', 'order.cancelled', 'order.forfeited'],
  },
  {
    flowKey: 'egg.delivery.day_before',
    productScope: 'eggs',
    eventType: 'egg.order.shipped_followup',
    templateKey: 'egg.delivery.day_before',
    triggerRule: 'marked_shipped_at + 1 day',
    scheduleLocalTime: '08:00 Europe/Oslo (first morning after shipment)',
    stopRules: ['order.cancelled', 'order.forfeited', 'status_not_eligible'],
  },
  {
    flowKey: 'egg.hatch.followup',
    productScope: 'eggs',
    eventType: 'egg.order.shipped',
    templateKey: 'egg.hatch.followup',
    triggerRule: 'marked_shipped_at + 5 days',
    scheduleLocalTime: 'shipped_at + 5d',
    stopRules: ['order.cancelled', 'missing_recipient_email'],
  },
  {
    flowKey: 'egg.order.forfeited',
    productScope: 'eggs',
    eventType: 'egg.overdue_forfeit',
    templateKey: 'egg.order.forfeited',
    triggerRule: 'remainder_due_date 23:59 + egg_overdue_grace_hours',
    scheduleLocalTime: 'due_end + grace',
    stopRules: ['not_applicable', 'already_paid', 'order.cancelled'],
  },
  {
    flowKey: 'chicken.ready_for_pickup',
    productScope: 'chickens',
    eventType: 'chicken.auto_ready_for_pickup',
    templateKey: 'chicken.ready_for_pickup',
    triggerRule: 'pickup_monday - chicken_auto_ready_days_before',
    scheduleLocalTime: '08:00 Europe/Oslo',
    stopRules: ['order.cancelled', 'order.picked_up'],
  },
  {
    flowKey: 'chicken.pickup.reminder',
    productScope: 'chickens',
    eventType: 'chicken.pickup_reminder',
    templateKey: 'chicken.pickup.reminder',
    triggerRule: 'pickup_monday - chicken_pickup_reminder_days[]',
    scheduleLocalTime: '08:30 Europe/Oslo',
    stopRules: ['order.cancelled', 'order.picked_up'],
  },
  {
    flowKey: 'chicken.remainder.collected',
    productScope: 'chickens',
    eventType: 'chicken.remainder_collected',
    templateKey: 'chicken.remainder.collected',
    triggerRule: 'on manual collect endpoint',
    scheduleLocalTime: 'immediate',
    stopRules: ['template_missing', 'missing_recipient_email'],
  },
  {
    flowKey: 'chicken.order.followup',
    productScope: 'chickens',
    eventType: 'chicken.remainder_collected',
    templateKey: 'chicken.order.followup',
    triggerRule: 'remainder_collected + 1 hour',
    scheduleLocalTime: '+60min from event',
    stopRules: ['template_missing', 'missing_recipient_email'],
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parseJsonString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function parseJsonNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseJsonBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function parseJsonNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const parsed = value
    .map((entry) => (typeof entry === 'number' ? entry : Number.parseInt(String(entry), 10)))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.round(entry));
  return parsed.length > 0 ? parsed : fallback;
}

function normalizeEmail(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parseIsoDate(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function ymdToKey(ymd: Ymd): string {
  return `${String(ymd.year).padStart(4, '0')}-${String(ymd.month).padStart(2, '0')}-${String(
    ymd.day
  ).padStart(2, '0')}`;
}

function addDays(ymd: Ymd, delta: number): Ymd {
  const utc = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function partsMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

function getZonedDateTimeParts(date: Date, timeZone: string): Ymd & { hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const map = partsMap(formatter.formatToParts(date));
  return {
    year: Number.parseInt(map.year || '0', 10),
    month: Number.parseInt(map.month || '1', 10),
    day: Number.parseInt(map.day || '1', 10),
    hour: Number.parseInt(map.hour || '0', 10),
    minute: Number.parseInt(map.minute || '0', 10),
    second: Number.parseInt(map.second || '0', 10),
  };
}

function getTimeZoneOffsetMillis(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(ymd: Ymd, hour: number, minute: number, timeZone: string): Date {
  let utcGuess = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0));
  for (let i = 0; i < 2; i += 1) {
    const offset = getTimeZoneOffsetMillis(utcGuess, timeZone);
    utcGuess = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0) - offset);
  }
  return utcGuess;
}

function formatDateForLocale(ymd: Ymd, locale: 'no' | 'en', timeZone: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nb-NO', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(zonedDateTimeToUtc(ymd, 12, 0, timeZone));
}

function toNoCurrency(amountNok: number): string {
  return `kr ${Math.round(amountNok).toLocaleString('nb-NO')}`;
}

function customerOrderLink(scope: string, entityId: string, appBaseUrl: string): string {
  if (scope === 'eggs') return buildCustomerOrderLink(appBaseUrl, 'egg', entityId);
  if (scope === 'chickens') return buildCustomerOrderLink(appBaseUrl, 'chicken', entityId);
  return buildCustomerOrderLink(appBaseUrl, 'pig', entityId);
}

async function getLifecycleConfig(): Promise<LifecycleConfig> {
  const keys = [
    'email_trigger_timezone',
    'pig_remainder_due_date',
    'pig_remainder_reminder_days',
    'pig_post_order_explainer_delay_days',
    'egg_remainder_reminder_days',
    'egg_overdue_grace_hours',
    'chicken_pickup_reminder_days',
    'chicken_auto_ready_days_before',
    'campaign_send_via_api_cron_only',
  ];

  const { data } = await supabaseAdmin.from('app_config').select('key, value').in('key', keys);
  const map: Record<string, unknown> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }

  return {
    timezone: parseJsonString(map.email_trigger_timezone, DEFAULT_LIFECYCLE_CONFIG.timezone),
    pigRemainderDueDate: parseJsonString(map.pig_remainder_due_date, DEFAULT_LIFECYCLE_CONFIG.pigRemainderDueDate),
    pigRemainderReminderDays: parseJsonNumberArray(
      map.pig_remainder_reminder_days,
      DEFAULT_LIFECYCLE_CONFIG.pigRemainderReminderDays
    ),
    pigPostOrderExplainerDelayDays: parseJsonNumber(
      map.pig_post_order_explainer_delay_days,
      DEFAULT_LIFECYCLE_CONFIG.pigPostOrderExplainerDelayDays
    ),
    eggRemainderReminderDays: parseJsonNumberArray(
      map.egg_remainder_reminder_days,
      DEFAULT_LIFECYCLE_CONFIG.eggRemainderReminderDays
    ),
    eggOverdueGraceHours: parseJsonNumber(
      map.egg_overdue_grace_hours,
      DEFAULT_LIFECYCLE_CONFIG.eggOverdueGraceHours
    ),
    chickenPickupReminderDays: parseJsonNumberArray(
      map.chicken_pickup_reminder_days,
      DEFAULT_LIFECYCLE_CONFIG.chickenPickupReminderDays
    ),
    chickenAutoReadyDaysBefore: parseJsonNumber(
      map.chicken_auto_ready_days_before,
      DEFAULT_LIFECYCLE_CONFIG.chickenAutoReadyDaysBefore
    ),
    campaignSendViaApiCronOnly: parseJsonBoolean(
      map.campaign_send_via_api_cron_only,
      DEFAULT_LIFECYCLE_CONFIG.campaignSendViaApiCronOnly
    ),
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || DEFAULT_LIFECYCLE_CONFIG.appBaseUrl,
  };
}

export async function ensureLifecycleSeedData(): Promise<{
  ok: boolean;
  missingTables: string[];
  seededTemplateKeys: string[];
  seededFlowKeys: string[];
}> {
  const schema = await getEmailSchemaStatus(['email_templates', 'email_flows']);
  if (!schema.ready) {
    return {
      ok: false,
      missingTables: schema.missingTables,
      seededTemplateKeys: [],
      seededFlowKeys: [],
    };
  }

  const templateRows = LIFECYCLE_TEMPLATE_SEEDS.map((seed) => ({
    template_key: seed.templateKey,
    classification: seed.classification,
    product_scope: seed.productScope,
    subject_no: seed.subjectNo,
    subject_en: seed.subjectEn,
    body_no: seed.bodyNo,
    body_en: seed.bodyEn,
    variables: seed.variables,
    active: true,
  }));

  const seededTemplateKeys = LIFECYCLE_TEMPLATE_SEEDS.map((entry) => entry.templateKey);
  const { data: existingTemplateRows, error: existingTemplateError } = await supabaseAdmin
    .from('email_templates')
    .select('template_key')
    .in('template_key', seededTemplateKeys);
  if (existingTemplateError) throw existingTemplateError;

  const existingTemplateKeys = new Set(
    (existingTemplateRows || []).map((row) => String(row.template_key || ''))
  );
  const missingTemplateRows = templateRows.filter(
    (row) => !existingTemplateKeys.has(String(row.template_key || ''))
  );

  if (missingTemplateRows.length > 0) {
    const { error: templateInsertError } = await supabaseAdmin
      .from('email_templates')
      .insert(missingTemplateRows);
    if (templateInsertError) throw templateInsertError;
  }

  const flowRows = LIFECYCLE_FLOW_SEEDS.map((seed) => ({
    flow_key: seed.flowKey,
    event_type: seed.eventType,
    product_scope: seed.productScope,
    template_key: seed.templateKey,
    mode: seed.mode,
    active: seed.active,
    send_offset_minutes: seed.sendOffsetMinutes,
  }));

  const seededFlowKeys = LIFECYCLE_FLOW_SEEDS.map((entry) => entry.flowKey);
  const { data: existingFlowRows, error: existingFlowError } = await supabaseAdmin
    .from('email_flows')
    .select('flow_key')
    .in('flow_key', seededFlowKeys);
  if (existingFlowError) throw existingFlowError;

  const existingFlowKeys = new Set((existingFlowRows || []).map((row) => String(row.flow_key || '')));
  const missingFlowRows = flowRows.filter((row) => !existingFlowKeys.has(String(row.flow_key || '')));

  if (missingFlowRows.length > 0) {
    const { error: flowInsertError } = await supabaseAdmin.from('email_flows').insert(missingFlowRows);
    if (flowInsertError) throw flowInsertError;
  }

  return {
    ok: true,
    missingTables: [],
    seededTemplateKeys,
    seededFlowKeys,
  };
}

async function getFlowMap(): Promise<Map<string, FlowDefinition>> {
  const { data } = await supabaseAdmin
    .from('email_flows')
    .select('id, flow_key, template_key, mode, active, product_scope')
    .in('flow_key', [
      'pig.remainder.explainer',
      'pig.remainder.reminder',
      'egg.remainder.reminder',
      'egg.delivery.day_before',
      'egg.hatch.followup',
      'egg.order.forfeited',
      'chicken.ready_for_pickup',
      'chicken.pickup.reminder',
      'chicken.remainder.collected',
      'chicken.order.followup',
    ]);

  const map = new Map<string, FlowDefinition>();
  for (const row of data || []) {
    map.set(String(row.flow_key), {
      id: String(row.id),
      flow_key: String(row.flow_key),
      template_key: String(row.template_key),
      mode: row.mode as FlowDefinition['mode'],
      active: Boolean(row.active),
      product_scope: String(row.product_scope || 'shared'),
    });
  }
  return map;
}

async function insertFlowInstance(row: {
  flowId: string;
  flowKey: string;
  productScope: string;
  entityType: string;
  entityId: string;
  triggerDateKey: string;
  scheduledFor: string;
  toEmail: string | null;
  locale: 'no' | 'en';
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}): Promise<boolean> {
  const { error } = await supabaseAdmin.from('email_flow_instances').insert({
    flow_id: row.flowId,
    flow_key: row.flowKey,
    product_scope: row.productScope,
    entity_type: row.entityType,
    entity_id: row.entityId,
    trigger_date_key: row.triggerDateKey,
    scheduled_for: row.scheduledFor,
    status: 'scheduled',
    to_email: row.toEmail,
    locale: row.locale,
    payload: row.payload,
    metadata: row.metadata,
  });

  if (!error) return true;
  const duplicate =
    String(error.code || '') === '23505' || String(error.message || '').toLowerCase().includes('duplicate');
  if (duplicate) return false;
  throw error;
}

async function updateFlowInstanceStatus(
  instanceId: string,
  updates: {
    status: 'scheduled' | 'enqueued' | 'skipped' | 'cancelled' | 'failed' | 'completed';
    queueId?: string | null;
    lastError?: string | null;
    processedAt?: string | null;
    idempotencyKey?: string | null;
    metadataPatch?: Record<string, unknown>;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: updates.status,
    queue_id: updates.queueId ?? null,
    last_error: updates.lastError ?? null,
    processed_at: updates.processedAt ?? null,
    idempotency_key: updates.idempotencyKey ?? null,
  };

  if (updates.metadataPatch) {
    const { data: current } = await supabaseAdmin
      .from('email_flow_instances')
      .select('metadata')
      .eq('id', instanceId)
      .maybeSingle();
    patch.metadata = {
      ...asRecord(current?.metadata),
      ...updates.metadataPatch,
    };
  }

  await supabaseAdmin.from('email_flow_instances').update(patch).eq('id', instanceId);
}

async function pigRemainderPaid(orderId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('payment_type', 'remainder')
    .eq('status', 'completed');
  return (count || 0) > 0;
}

async function eggOutstandingOre(orderId: string, remainderAmountOre: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from('egg_payments')
    .select('amount_nok')
    .eq('egg_order_id', orderId)
    .eq('payment_type', 'remainder')
    .eq('status', 'completed');

  const paidOre = (data || []).reduce((sum, row) => sum + Math.round(Number(row.amount_nok || 0) * 100), 0);
  return Math.max(0, Math.round(Number(remainderAmountOre || 0)) - paidOre);
}

export async function reconcileEggPaymentDependentFlowInstances(
  orderId: string,
  reason = 'egg_remainder_not_due'
): Promise<void> {
  const { data: instances, error: instanceError } = await supabaseAdmin
    .from('email_flow_instances')
    .select('id, status, queue_id')
    .eq('entity_type', 'egg_order')
    .eq('entity_id', orderId)
    .in('flow_key', ['egg.remainder.reminder', 'egg.order.forfeited'])
    .in('status', ['scheduled', 'enqueued']);

  if (instanceError) {
    throw instanceError;
  }

  if (!instances || instances.length === 0) {
    return;
  }

  const queueIds = Array.from(
    new Set(
      instances
        .map((instance) => String(instance.queue_id || '').trim())
        .filter(Boolean)
    )
  );

  const queueMap = new Map<string, { status: string; sentAt: string | null }>();
  if (queueIds.length > 0) {
    const { data: queueRows, error: queueError } = await supabaseAdmin
      .from('email_dispatch_queue')
      .select('id, status, sent_at')
      .in('id', queueIds);

    if (queueError) {
      throw queueError;
    }

    for (const row of queueRows || []) {
      queueMap.set(String(row.id), {
        status: String(row.status || ''),
        sentAt: row.sent_at ? String(row.sent_at) : null,
      });
    }
  }

  const nowIso = new Date().toISOString();

  for (const instance of instances) {
    const instanceId = String(instance.id || '');
    if (!instanceId) continue;

    const queueId = String(instance.queue_id || '').trim();
    const queue = queueId ? queueMap.get(queueId) : undefined;
    const queueStatus = String(queue?.status || '');

    if (String(instance.status || '') === 'enqueued' && queueStatus === 'sent') {
      await updateFlowInstanceStatus(instanceId, {
        status: 'completed',
        queueId: queueId || null,
        lastError: null,
        processedAt: queue?.sentAt || nowIso,
      });
      continue;
    }

    if (queueId && ['pending', 'processing', 'failed'].includes(queueStatus)) {
      await cancelQueueEntry(queueId);
    }

    await updateFlowInstanceStatus(instanceId, {
      status: 'cancelled',
      queueId: queueId || null,
      lastError: reason,
      processedAt: nowIso,
    });
  }
}

async function releaseEggInventory(inventoryId: string, quantity: number): Promise<void> {
  const { data: inventory } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .maybeSingle();

  if (!inventory) return;

  const nextAllocated = Math.max(0, Number(inventory.eggs_allocated || 0) - quantity);
  const remainingAfter = Number(inventory.eggs_available || 0) - nextAllocated;
  let nextStatus = String(inventory.status || 'open');
  if (remainingAfter <= 0) {
    nextStatus = 'sold_out';
  } else if (nextStatus === 'sold_out') {
    nextStatus = 'open';
  }

  await supabaseAdmin
    .from('egg_inventory')
    .update({
      eggs_allocated: nextAllocated,
      status: nextStatus,
    })
    .eq('id', inventoryId);
}

async function materializePigFlowInstances(flowMap: Map<string, FlowDefinition>, config: LifecycleConfig): Promise<number> {
  const explainerFlow = flowMap.get('pig.remainder.explainer');
  const reminderFlow = flowMap.get('pig.remainder.reminder');
  if (!explainerFlow || !reminderFlow) return 0;

  const dueDate = parseIsoDate(config.pigRemainderDueDate);
  if (!dueDate) return 0;

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, status, remainder_amount, deposit_amount, total_amount, box_size, mangalitsa_preset_id, created_at')
    .in('status', ['deposit_paid', 'paid', 'ready_for_pickup', 'completed']);

  let inserted = 0;
  const nowMs = Date.now();

  for (const order of orders || []) {
    const orderId = String(order.id);
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    const createdParts = getZonedDateTimeParts(createdAt, config.timezone);
    const createdYmd: Ymd = { year: createdParts.year, month: createdParts.month, day: createdParts.day };
    const explainerYmd = addDays(createdYmd, config.pigPostOrderExplainerDelayDays);
    const toEmail = normalizeEmail(order.customer_email);
    const orderUrl = customerOrderLink('pig', orderId, config.appBaseUrl);
    const locale: 'no' | 'en' = 'no';
    const remainderNok = Number(order.remainder_amount || 0);

    const explainerInserted = await insertFlowInstance({
      flowId: explainerFlow.id,
      flowKey: explainerFlow.flow_key,
      productScope: explainerFlow.product_scope,
      entityType: 'order',
      entityId: orderId,
      triggerDateKey: `explainer:${ymdToKey(explainerYmd)}`,
      scheduledFor: zonedDateTimeToUtc(explainerYmd, 10, 0, config.timezone).toISOString(),
      toEmail: toEmail || null,
      locale,
      payload: {
        customer_name: String(order.customer_name || 'Kunde'),
        order_number: String(order.order_number || ''),
        remainder_amount_nok: toNoCurrency(remainderNok),
        due_date: formatDateForLocale(dueDate, locale, config.timezone),
        order_url: orderUrl,
      },
      metadata: {
        product_scope: 'pig',
        flow_key: explainerFlow.flow_key,
        trigger_offset_days: config.pigPostOrderExplainerDelayDays,
      },
    });
    if (explainerInserted) inserted += 1;

    const reminderDates = config.pigRemainderReminderDays
      .map((days) => ({
        days,
        when: zonedDateTimeToUtc(addDays(dueDate, -days), 10, 0, config.timezone),
      }))
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    const earliestReminderAt = reminderDates[0]?.when.getTime() || nowMs;
    const isLateOrder = createdAt.getTime() > earliestReminderAt;
    const futureCandidates = reminderDates.filter((entry) => entry.when.getTime() > nowMs);
    const selected = isLateOrder ? (futureCandidates.length > 0 ? [futureCandidates[0]] : []) : futureCandidates;

    const totalReminders = config.pigRemainderReminderDays.length;
    const depositNok = Number(order.deposit_amount || 0);
    const totalNok = Number(order.total_amount || 0) || (depositNok + remainderNok);
    const boxLabel = String(order.box_size || 'Mangalitsa-boks');

    for (let ri = 0; ri < selected.length; ri++) {
      const reminder = selected[ri];
      const reminderNumber = isLateOrder ? totalReminders : (config.pigRemainderReminderDays.indexOf(reminder.days) + 1);
      const reminderInserted = await insertFlowInstance({
        flowId: reminderFlow.id,
        flowKey: reminderFlow.flow_key,
        productScope: reminderFlow.product_scope,
        entityType: 'order',
        entityId: orderId,
        triggerDateKey: `remainder:${config.pigRemainderDueDate}:${reminder.days}`,
        scheduledFor: reminder.when.toISOString(),
        toEmail: toEmail || null,
        locale,
        payload: {
          customer_name: String(order.customer_name || 'Kunde'),
          order_number: String(order.order_number || ''),
          remainder_amount_nok: toNoCurrency(remainderNok),
          deposit_amount_nok: toNoCurrency(depositNok),
          total_amount_nok: toNoCurrency(totalNok),
          due_date: formatDateForLocale(dueDate, locale, config.timezone),
          days_left: reminder.days,
          reminder_number: reminderNumber,
          total_reminders: totalReminders,
          box_label: boxLabel,
          tip_index: ri,
          order_url: orderUrl,
        },
        metadata: {
          product_scope: 'pig',
          flow_key: reminderFlow.flow_key,
          trigger_offset_days: reminder.days,
        },
      });
      if (reminderInserted) inserted += 1;
    }
  }

  return inserted;
}

async function materializeEggFlowInstances(flowMap: Map<string, FlowDefinition>, config: LifecycleConfig): Promise<number> {
  const reminderFlow = flowMap.get('egg.remainder.reminder');
  const dayBeforeFlow = flowMap.get('egg.delivery.day_before');
  const hatchFollowupFlow = flowMap.get('egg.hatch.followup');
  const forfeitFlow = flowMap.get('egg.order.forfeited');
  if (!reminderFlow || !dayBeforeFlow || !forfeitFlow) return 0;

  const { data: orders } = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, order_number, customer_name, customer_email, status, week_number, delivery_monday, remainder_due_date, remainder_amount, deposit_amount, total_amount, breed_name, quantity, marked_shipped_at, updated_at'
    )
    .in('status', ['deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered']);

  let inserted = 0;

  await supabaseAdmin
    .from('email_flow_instances')
    .update({
      status: 'cancelled',
      last_error: 'legacy_delivery_day_before_replaced',
      processed_at: new Date().toISOString(),
    })
    .eq('flow_key', 'egg.delivery.day_before')
    .eq('status', 'scheduled')
    .not('trigger_date_key', 'like', 'shipped-followup:%');

  for (const order of orders || []) {
    const orderId = String(order.id);
    const toEmail = normalizeEmail(order.customer_email);
    const locale: 'no' | 'en' = 'no';
    const orderUrl = customerOrderLink('eggs', orderId, config.appBaseUrl);
    const deliveryYmd = parseIsoDate(String(order.delivery_monday || ''));
    if (!deliveryYmd) continue;
    const eggStatus = String(order.status || '');

    if (eggStatus === 'deposit_paid') {
      const outstanding = await eggOutstandingOre(orderId, Number(order.remainder_amount || 0));
      if (outstanding > 0) {
        const eggTotalReminders = config.eggRemainderReminderDays.length;
        const eggDepositOre = Number(order.deposit_amount || 0);
        const eggTotalOre = Number(order.total_amount || 0);
        const eggBreedName = String(order.breed_name || 'Rugeegg');
        const eggQuantity = Number(order.quantity || 0);

        for (let ei = 0; ei < config.eggRemainderReminderDays.length; ei++) {
          const days = config.eggRemainderReminderDays[ei];
          const scheduleYmd = addDays(deliveryYmd, -days);
          const reminderInserted = await insertFlowInstance({
            flowId: reminderFlow.id,
            flowKey: reminderFlow.flow_key,
            productScope: reminderFlow.product_scope,
            entityType: 'egg_order',
            entityId: orderId,
            triggerDateKey: `remainder:${ymdToKey(deliveryYmd)}:${days}`,
            scheduledFor: zonedDateTimeToUtc(scheduleYmd, 9, 0, config.timezone).toISOString(),
            toEmail: toEmail || null,
            locale,
            payload: {
              customer_name: String(order.customer_name || 'Kunde'),
              order_number: String(order.order_number || ''),
              remainder_amount_nok: toNoCurrency(Math.round(outstanding / 100)),
              deposit_amount_nok: toNoCurrency(Math.round(eggDepositOre / 100)),
              total_amount_nok: toNoCurrency(Math.round(eggTotalOre / 100)),
              breed_name: eggBreedName,
              total_quantity: eggQuantity,
              due_date: formatDateForLocale(
                parseIsoDate(String(order.remainder_due_date || '')) || deliveryYmd,
                locale,
                config.timezone
              ),
              days_left: days,
              reminder_number: ei + 1,
              total_reminders: eggTotalReminders,
              tip_index: ei,
              order_url: orderUrl,
            },
            metadata: {
              product_scope: 'eggs',
              flow_key: reminderFlow.flow_key,
              trigger_offset_days: days,
            },
          });
          if (reminderInserted) inserted += 1;
        }

        const dueDate = parseIsoDate(String(order.remainder_due_date || ''));
        if (dueDate) {
          const dueEnd = zonedDateTimeToUtc(dueDate, 23, 59, config.timezone);
          const forfeitAt = new Date(dueEnd.getTime() + config.eggOverdueGraceHours * 60 * 60 * 1000);
          const forfeitInserted = await insertFlowInstance({
            flowId: forfeitFlow.id,
            flowKey: forfeitFlow.flow_key,
            productScope: forfeitFlow.product_scope,
            entityType: 'egg_order',
            entityId: orderId,
            triggerDateKey: `forfeit:${ymdToKey(dueDate)}:grace-${config.eggOverdueGraceHours}`,
            scheduledFor: forfeitAt.toISOString(),
            toEmail: toEmail || null,
            locale,
            payload: {
              customer_name: String(order.customer_name || 'Kunde'),
              order_number: String(order.order_number || ''),
              order_url: orderUrl,
            },
            metadata: {
              product_scope: 'eggs',
              flow_key: forfeitFlow.flow_key,
              trigger_offset_days: 0,
            },
          });
          if (forfeitInserted) inserted += 1;
        }
      } else {
        await reconcileEggPaymentDependentFlowInstances(orderId, 'order_fully_paid');
      }
    } else {
      await reconcileEggPaymentDependentFlowInstances(orderId, 'order_no_longer_remainder_due');
    }

    // Send the shipment follow-up the first morning after the order was marked as shipped.
    if (eggStatus === 'shipped') {
      const shippedAtRaw = String(order.marked_shipped_at || order.updated_at || '');
      const shippedAt = shippedAtRaw ? new Date(shippedAtRaw) : null;
      if (!shippedAt || Number.isNaN(shippedAt.getTime())) continue;

      const shippedYmd = getZonedDateTimeParts(shippedAt, config.timezone);
      const followupYmd = addDays(
        {
          year: shippedYmd.year,
          month: shippedYmd.month,
          day: shippedYmd.day,
        },
        1
      );
      const trackingNumber = String((order as any).tracking_number || '');
      const trackingUrl = trackingNumber.startsWith('http')
        ? trackingNumber
        : trackingNumber
          ? `https://sporing.posten.no/sporing/${trackingNumber}`
          : '';
      const dayBeforeInserted = await insertFlowInstance({
        flowId: dayBeforeFlow.id,
        flowKey: dayBeforeFlow.flow_key,
        productScope: dayBeforeFlow.product_scope,
        entityType: 'egg_order',
        entityId: orderId,
        triggerDateKey: `shipped-followup:${shippedAt.toISOString().slice(0, 10)}`,
        scheduledFor: zonedDateTimeToUtc(followupYmd, 8, 0, config.timezone).toISOString(),
        toEmail: toEmail || null,
        locale,
        payload: {
          customer_name: String(order.customer_name || 'Kunde'),
          order_number: String(order.order_number || ''),
          delivery_date: formatDateForLocale(deliveryYmd, locale, config.timezone),
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          order_url: orderUrl,
          tip_index: 1,
        },
        metadata: {
          product_scope: 'eggs',
          flow_key: dayBeforeFlow.flow_key,
          trigger_offset_days: 1,
        },
      });
      if (dayBeforeInserted) inserted += 1;
    }

    if (hatchFollowupFlow && (eggStatus === 'shipped' || eggStatus === 'delivered')) {
      const shippedAtRaw = String(order.marked_shipped_at || order.updated_at || '');
      const shippedAt = shippedAtRaw ? new Date(shippedAtRaw) : null;
      if (shippedAt && !Number.isNaN(shippedAt.getTime())) {
        const followupAt = new Date(
          shippedAt.getTime() + EGG_HATCH_FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000
        );
        const hatchFollowupInserted = await insertFlowInstance({
          flowId: hatchFollowupFlow.id,
          flowKey: hatchFollowupFlow.flow_key,
          productScope: hatchFollowupFlow.product_scope,
          entityType: 'egg_order',
          entityId: orderId,
          triggerDateKey: `hatch-followup:${shippedAt.toISOString().slice(0, 10)}`,
          scheduledFor: followupAt.toISOString(),
          toEmail: toEmail || null,
          locale,
          payload: {
            customer_name: String(order.customer_name || 'Kunde'),
            order_number: String(order.order_number || ''),
            message_url: buildCustomerPathLink(config.appBaseUrl, '/min-side'),
            pork_url: config.appBaseUrl,
            deposit_discount_code: '',
            tip_index: 2,
            order_url: orderUrl,
          },
          metadata: {
            product_scope: 'eggs',
            flow_key: hatchFollowupFlow.flow_key,
            trigger_offset_days: EGG_HATCH_FOLLOWUP_DELAY_DAYS,
          },
        });
        if (hatchFollowupInserted) inserted += 1;
      }
    }
  }

  return inserted;
}

async function materializeChickenFlowInstances(flowMap: Map<string, FlowDefinition>, config: LifecycleConfig): Promise<number> {
  const readyFlow = flowMap.get('chicken.ready_for_pickup');
  const pickupReminderFlow = flowMap.get('chicken.pickup.reminder');
  if (!readyFlow || !pickupReminderFlow) return 0;

  const { data: orders } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, customer_name, customer_email, status, pickup_monday, remainder_amount_nok, created_at')
    .in('status', ['deposit_paid', 'ready_for_pickup', 'fully_paid']);

  let inserted = 0;
  for (const order of orders || []) {
    const orderId = String(order.id);
    const pickupYmd = parseIsoDate(String(order.pickup_monday || ''));
    if (!pickupYmd) continue;

    const locale: 'no' | 'en' = 'no';
    const toEmail = normalizeEmail(order.customer_email);
    const orderUrl = customerOrderLink('chickens', orderId, config.appBaseUrl);
    const status = String(order.status || '');

    if (status === 'deposit_paid') {
      const readyYmd = addDays(pickupYmd, -config.chickenAutoReadyDaysBefore);
      const readyInserted = await insertFlowInstance({
        flowId: readyFlow.id,
        flowKey: readyFlow.flow_key,
        productScope: readyFlow.product_scope,
        entityType: 'chicken_order',
        entityId: orderId,
        triggerDateKey: `ready:${ymdToKey(readyYmd)}`,
        scheduledFor: zonedDateTimeToUtc(readyYmd, 8, 0, config.timezone).toISOString(),
        toEmail: toEmail || null,
        locale,
        payload: {
          customer_name: String(order.customer_name || 'Kunde'),
          order_number: String(order.order_number || ''),
          pickup_date: formatDateForLocale(pickupYmd, locale, config.timezone),
          remainder_amount_nok: toNoCurrency(Number(order.remainder_amount_nok || 0)),
          order_url: orderUrl,
        },
        metadata: {
          product_scope: 'chickens',
          flow_key: readyFlow.flow_key,
          trigger_offset_days: config.chickenAutoReadyDaysBefore,
        },
      });
      if (readyInserted) inserted += 1;
    }

    // Build reminder candidates and filter to future-only (avoid blast when order is placed late)
    const nowMs = Date.now();
    const reminderCandidates = config.chickenPickupReminderDays
      .map((days) => ({
        days,
        when: zonedDateTimeToUtc(addDays(pickupYmd, -days), 8, 30, config.timezone),
      }))
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    const orderCreatedAt = order.created_at ? new Date(order.created_at).getTime() : nowMs;
    const earliestReminderAt = reminderCandidates[0]?.when.getTime() || nowMs;
    const isLateOrder = orderCreatedAt > earliestReminderAt;
    const futureCandidates = reminderCandidates.filter((r) => r.when.getTime() > nowMs);
    // Late orders: send at most 1 future reminder; normal orders: send all future reminders
    const selectedReminders = isLateOrder
      ? futureCandidates.length > 0
        ? [futureCandidates[0]]
        : []
      : futureCandidates;

    for (const reminder of selectedReminders) {
      const scheduleYmd = addDays(pickupYmd, -reminder.days);
      const reminderInserted = await insertFlowInstance({
        flowId: pickupReminderFlow.id,
        flowKey: pickupReminderFlow.flow_key,
        productScope: pickupReminderFlow.product_scope,
        entityType: 'chicken_order',
        entityId: orderId,
        triggerDateKey: `pickup-reminder:${ymdToKey(pickupYmd)}:${reminder.days}`,
        scheduledFor: reminder.when.toISOString(),
        toEmail: toEmail || null,
        locale,
        payload: {
          customer_name: String(order.customer_name || 'Kunde'),
          order_number: String(order.order_number || ''),
          pickup_date: formatDateForLocale(pickupYmd, locale, config.timezone),
          days_left: reminder.days,
          remainder_amount_nok: toNoCurrency(Number(order.remainder_amount_nok || 0)),
          order_url: orderUrl,
        },
        metadata: {
          product_scope: 'chickens',
          flow_key: pickupReminderFlow.flow_key,
          trigger_offset_days: reminder.days,
        },
      });
      if (reminderInserted) inserted += 1;
    }
  }

  return inserted;
}

async function materializeAllInstances(
  flowMap: Map<string, FlowDefinition>,
  config: LifecycleConfig
): Promise<number> {
  const [pig, eggs, chickens] = await Promise.all([
    materializePigFlowInstances(flowMap, config),
    materializeEggFlowInstances(flowMap, config),
    materializeChickenFlowInstances(flowMap, config),
  ]);
  return pig + eggs + chickens;
}

async function createMissingEmailQueueAlert(instance: FlowInstance): Promise<string | null> {
  const idempotencyKey = `email:flow-runner:missing-email:${instance.entity_type}:${instance.entity_id}:${instance.flow_key}:${instance.trigger_date_key}`;
  const queued = await enqueueEmailRecord({
    idempotencyKey,
    classification: 'system',
    toEmail: 'missing-email@tinglum.invalid',
    subject: `Missing recipient for ${instance.flow_key}`,
    html: `<p>Missing recipient email for flow ${instance.flow_key} (${instance.entity_type} ${instance.entity_id}).</p>`,
    status: 'cancelled',
    sourcePath: '/api/cron/email-flow-runner',
    metadata: {
      flow_key: instance.flow_key,
      entity_type: instance.entity_type,
      entity_id: instance.entity_id,
      trigger_date_key: instance.trigger_date_key,
      missing_email_alert: true,
    },
    nextAttemptAt: new Date().toISOString(),
    lastError: 'missing_recipient_email',
  });

  return queued.record.id;
}

async function applyEggForfeit(orderId: string, config: LifecycleConfig): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, status, inventory_id, quantity, remainder_due_date, remainder_amount, egg_order_additions(inventory_id, quantity)'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return false;
  const status = String(order.status || '');
  if (status === 'forfeited' || status === 'cancelled') return false;

  const dueYmd = parseIsoDate(String(order.remainder_due_date || ''));
  if (!dueYmd) return false;
  const dueEnd = zonedDateTimeToUtc(dueYmd, 23, 59, config.timezone);
  const forfeitAt = new Date(dueEnd.getTime() + config.eggOverdueGraceHours * 60 * 60 * 1000);
  if (Date.now() < forfeitAt.getTime()) return false;

  const outstanding = await eggOutstandingOre(String(order.id), Number(order.remainder_amount || 0));
  if (outstanding <= 0) return false;

  await releaseEggInventory(String(order.inventory_id), Number(order.quantity || 0));
  const additions = Array.isArray(order.egg_order_additions) ? order.egg_order_additions : [];
  for (const addition of additions) {
    const inventoryId = String((addition as { inventory_id?: string }).inventory_id || '');
    const quantity = Number((addition as { quantity?: number }).quantity || 0);
    if (inventoryId) {
      await releaseEggInventory(inventoryId, quantity);
    }
  }

  await supabaseAdmin
    .from('egg_orders')
    .update({
      status: 'forfeited',
      forfeited_at: new Date().toISOString(),
      forfeit_reason: 'Remainder not paid by due date + grace period',
    })
    .eq('id', orderId)
    .neq('status', 'forfeited');

  return true;
}

async function processDueInstances(
  flowMap: Map<string, FlowDefinition>
): Promise<Omit<FlowRunSummary, 'scanned' | 'campaignsQueued'>> {
  const { data: instances } = await supabaseAdmin
    .from('email_flow_instances')
    .select('id, flow_key, entity_type, entity_id, trigger_date_key, status, locale, to_email, payload, metadata, scheduled_for')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(500);

  let due = 0;
  let enqueued = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  let missingEmail = 0;

  const config = await getLifecycleConfig();

  for (const raw of instances || []) {
    const instance: FlowInstance = {
      id: String(raw.id),
      flow_key: String(raw.flow_key),
      entity_type: String(raw.entity_type),
      entity_id: String(raw.entity_id),
      trigger_date_key: String(raw.trigger_date_key),
      status: String(raw.status),
      locale: String(raw.locale || 'no'),
      to_email: raw.to_email ? String(raw.to_email) : null,
      payload: asRecord(raw.payload),
      metadata: asRecord(raw.metadata),
      scheduled_for: String(raw.scheduled_for),
    };
    due += 1;

    const flow = flowMap.get(instance.flow_key);
    if (!flow || !flow.active || flow.mode === 'disabled') {
      await updateFlowInstanceStatus(instance.id, {
        status: 'cancelled',
        lastError: 'flow_disabled',
        processedAt: new Date().toISOString(),
      });
      skipped += 1;
      continue;
    }

    let templateKey = flow.template_key;
    let payload = asRecord(instance.payload);
    const locale: 'no' | 'en' = instance.locale === 'en' ? 'en' : 'no';
    const toEmail = normalizeEmail(instance.to_email || payload.customer_email);

    if (instance.flow_key === 'pig.remainder.explainer') {
      const { data: pigOrder } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('id', instance.entity_id)
        .maybeSingle();
      const pigStatus = String(pigOrder?.status || '');
      if (!pigOrder || pigStatus === 'cancelled' || pigStatus === 'refunded') {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'pig_order_not_eligible',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }

      const paid = await pigRemainderPaid(instance.entity_id);
      if (paid) templateKey = 'pig.remainder.explainer.reduced';
    }

    if (instance.flow_key === 'pig.remainder.reminder') {
      const { data: pigOrder } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('id', instance.entity_id)
        .maybeSingle();
      const pigStatus = String(pigOrder?.status || '');
      if (!pigOrder || pigStatus === 'cancelled' || pigStatus === 'refunded') {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'pig_order_not_eligible',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }

      const paid = await pigRemainderPaid(instance.entity_id);
      if (paid) {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'remainder_already_paid',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }
    }

    if (instance.flow_key === 'egg.remainder.reminder') {
      const { data: eggOrder } = await supabaseAdmin
        .from('egg_orders')
        .select('status, remainder_amount')
        .eq('id', instance.entity_id)
        .maybeSingle();

      const outstanding = await eggOutstandingOre(
        instance.entity_id,
        Math.round(Number(eggOrder?.remainder_amount || 0))
      );
      const eggStatus = String(eggOrder?.status || '');
      if (!eggOrder || eggStatus === 'forfeited' || eggStatus === 'cancelled' || outstanding <= 0) {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'egg_remainder_not_due',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }

      payload = {
        ...payload,
        remainder_amount_nok: toNoCurrency(Math.round(outstanding / 100)),
      };
    }

    if (instance.flow_key === 'egg.delivery.day_before') {
      const { data: eggOrder } = await supabaseAdmin
        .from('egg_orders')
        .select('status')
        .eq('id', instance.entity_id)
        .maybeSingle();
      const eggStatus = String(eggOrder?.status || '');
      // Only send when order is actually shipped or delivered
      const eligible = eggStatus === 'shipped' || eggStatus === 'delivered';
      if (!eggOrder || !eligible) {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'egg_day_before_not_eligible',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }
    }

    if (instance.flow_key === 'egg.order.forfeited') {
      const forfeited = await applyEggForfeit(instance.entity_id, config);
      if (!forfeited) {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'forfeit_not_applicable',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }
    }

    if (instance.flow_key === 'chicken.ready_for_pickup') {
      const { data: chickenOrder } = await supabaseAdmin
        .from('chicken_orders')
        .select('status')
        .eq('id', instance.entity_id)
        .maybeSingle();

      const status = String(chickenOrder?.status || '');
      if (!chickenOrder || status === 'cancelled' || status === 'picked_up') {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'chicken_order_not_eligible',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }
      if (status === 'deposit_paid') {
        await supabaseAdmin
          .from('chicken_orders')
          .update({ status: 'ready_for_pickup' })
          .eq('id', instance.entity_id)
          .eq('status', 'deposit_paid');
      }
    }

    if (instance.flow_key === 'chicken.pickup.reminder') {
      const { data: chickenOrder } = await supabaseAdmin
        .from('chicken_orders')
        .select('status')
        .eq('id', instance.entity_id)
        .maybeSingle();

      const status = String(chickenOrder?.status || '');
      if (!chickenOrder || status === 'cancelled' || status === 'picked_up') {
        await updateFlowInstanceStatus(instance.id, {
          status: 'cancelled',
          lastError: 'pickup_reminder_not_eligible',
          processedAt: new Date().toISOString(),
        });
        skipped += 1;
        continue;
      }
    }

    if (!toEmail) {
      const queueId = await createMissingEmailQueueAlert(instance);
      await updateFlowInstanceStatus(instance.id, {
        status: 'cancelled',
        queueId,
        lastError: 'missing_recipient_email',
        processedAt: new Date().toISOString(),
        metadataPatch: { missing_email_alert: true },
      });
      missingEmail += 1;
      skipped += 1;
      continue;
    }

    const rendered = await renderManagedTemplate({
      templateKey,
      locale,
      variables: payload,
    });

    if (!rendered) {
      await updateFlowInstanceStatus(instance.id, {
        status: 'failed',
        lastError: `template_not_found:${templateKey}`,
        processedAt: new Date().toISOString(),
      });
      failed += 1;
      continue;
    }

    const result = await dispatchEmail({
      to: toEmail,
      subject: rendered.subject,
      html: rendered.html,
      classification:
        (rendered.classification as 'transactional' | 'support' | 'promotional' | 'system') || 'transactional',
      locale,
      templateKey: rendered.templateKey,
      sourcePath: '/api/cron/email-flow-runner',
      flowKey: instance.flow_key,
      triggerDateKey: instance.trigger_date_key,
      scheduledFor: instance.scheduled_for,
      productScope: flow.product_scope,
      entityType: instance.entity_type,
      entityId: instance.entity_id,
      orderId: instance.entity_type === 'order' ? instance.entity_id : undefined,
      eggOrderId: instance.entity_type === 'egg_order' ? instance.entity_id : undefined,
      chickenOrderId: instance.entity_type === 'chicken_order' ? instance.entity_id : undefined,
      metadata: {
        ...asRecord(instance.metadata),
        product_scope: flow.product_scope,
        flow_key: instance.flow_key,
      },
      idempotency: {
        source: 'email-flow-runner',
        entity: instance.entity_type,
        id: instance.entity_id,
        template: `${instance.flow_key}:${instance.trigger_date_key}`,
      },
    });

    if (!result.success) {
      await updateFlowInstanceStatus(instance.id, {
        status: 'failed',
        queueId: result.queueId || null,
        lastError: result.error || 'dispatch_failed',
        processedAt: new Date().toISOString(),
      });
      failed += 1;
      continue;
    }

    const nextStatus =
      result.skipped || result.mode === 'shadow' || result.mode === 'legacy' ? 'completed' : 'enqueued';
    await updateFlowInstanceStatus(instance.id, {
      status: nextStatus,
      queueId: result.queueId || null,
      processedAt: new Date().toISOString(),
    });

    if (nextStatus === 'enqueued') {
      enqueued += 1;
    } else {
      completed += 1;
    }
  }

  return { due, enqueued, completed, skipped, failed, missingEmail };
}

export async function runEmailFlowRunner(): Promise<{
  ok: boolean;
  runId: string | null;
  summary: FlowRunSummary;
  config: LifecycleConfig;
  error?: string;
}> {
  const config = await getLifecycleConfig();
  const summary: FlowRunSummary = {
    scanned: 0,
    due: 0,
    enqueued: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    missingEmail: 0,
    campaignsQueued: 0,
  };

  const seedStatus = await ensureLifecycleSeedData();
  if (!seedStatus.ok) {
    return {
      ok: false,
      runId: null,
      summary,
      config,
      error: `Missing email schema tables: ${seedStatus.missingTables.join(
        ', '
      )}. Run migration 20260310210000_repair_unified_email_schema.sql.`,
    };
  }

  const flowMap = await getFlowMap();

  const { data: run } = await supabaseAdmin
    .from('email_flow_runs')
    .insert({
      runner_key: 'email-flow-runner',
      started_at: new Date().toISOString(),
      metadata: {
        timezone: config.timezone,
      },
    })
    .select('id')
    .single();

  const runId = run?.id ? String(run.id) : null;

  try {
    summary.scanned = await materializeAllInstances(flowMap, config);
    const dueResult = await processDueInstances(flowMap);
    summary.due = dueResult.due;
    summary.enqueued = dueResult.enqueued;
    summary.completed = dueResult.completed;
    summary.skipped = dueResult.skipped;
    summary.failed = dueResult.failed;
    summary.missingEmail = dueResult.missingEmail;

    const campaigns = await processScheduledCampaigns({
      locale: 'no',
      sourcePath: '/api/cron/email-flow-runner',
      enforceCronOnly: true,
    });
    summary.campaignsQueued = campaigns.queued;

    if (runId) {
      await supabaseAdmin
        .from('email_flow_runs')
        .update({
          finished_at: new Date().toISOString(),
          scanned_count: summary.scanned,
          due_count: summary.due,
          enqueued_count: summary.enqueued,
          skipped_count: summary.skipped,
          failed_count: summary.failed,
          completed_count: summary.completed,
          campaigns_queued_count: summary.campaignsQueued,
          missing_email_count: summary.missingEmail,
          metadata: {
            timezone: config.timezone,
            campaign_send_via_api_cron_only: config.campaignSendViaApiCronOnly,
          },
        })
        .eq('id', runId);
    }

    return {
      ok: true,
      runId,
      summary,
      config,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown flow runner error';

    if (runId) {
      await supabaseAdmin
        .from('email_flow_runs')
        .update({
          finished_at: new Date().toISOString(),
          scanned_count: summary.scanned,
          due_count: summary.due,
          enqueued_count: summary.enqueued,
          skipped_count: summary.skipped,
          failed_count: summary.failed + 1,
          completed_count: summary.completed,
          campaigns_queued_count: summary.campaignsQueued,
          missing_email_count: summary.missingEmail,
          error: message,
          metadata: {
            timezone: config.timezone,
          },
        })
        .eq('id', runId);
    }

    return {
      ok: false,
      runId,
      summary,
      config,
      error: message,
    };
  }
}

export async function materializeLifecycleInstancesOnly(): Promise<{
  ok: boolean;
  inserted: number;
  config: LifecycleConfig;
  missingTables: string[];
  error?: string;
}> {
  const config = await getLifecycleConfig();
  const seedStatus = await ensureLifecycleSeedData();
  if (!seedStatus.ok) {
    return {
      ok: false,
      inserted: 0,
      config,
      missingTables: seedStatus.missingTables,
      error: `Missing email schema tables: ${seedStatus.missingTables.join(', ')}`,
    };
  }

  try {
    const flowMap = await getFlowMap();
    const inserted = await materializeAllInstances(flowMap, config);
    return {
      ok: true,
      inserted,
      config,
      missingTables: [],
    };
  } catch (error) {
    return {
      ok: false,
      inserted: 0,
      config,
      missingTables: [],
      error: error instanceof Error ? error.message : 'Failed to materialize lifecycle instances',
    };
  }
}

export async function getLifecycleOverview() {
  const config = await getLifecycleConfig();
  const seedStatus = await ensureLifecycleSeedData();
  if (!seedStatus.ok) {
    return {
      config,
      flows: [],
      instances: [],
      statusCounts: {},
      missingAlerts: [],
      runs: [],
      schemaStatus: {
        ready: false,
        missingTables: seedStatus.missingTables,
      },
    };
  }

  const materializeResult = await materializeLifecycleInstancesOnly();

  const [flowRows, instanceRows, missingRows, runRows] = await Promise.all([
    supabaseAdmin
      .from('email_flows')
      .select('id, flow_key, event_type, mode, active, product_scope, template_key, send_offset_minutes')
      .order('flow_key', { ascending: true }),
    supabaseAdmin
      .from('email_flow_instances')
      .select(
        'id, flow_key, entity_type, entity_id, trigger_date_key, status, to_email, scheduled_for, queue_id, last_error, created_at, processed_at'
      )
      .order('scheduled_for', { ascending: true })
      .limit(300),
    supabaseAdmin
      .from('email_dispatch_queue')
      .select('id, to_email, status, created_at, last_error, metadata')
      .eq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('email_flow_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(30),
  ]);

  const missingAlerts = (missingRows.data || []).filter((row) => {
    const metadata = asRecord(row.metadata);
    return metadata.missing_email_alert === true;
  });

  const statusCounts = (instanceRows.data || []).reduce<Record<string, number>>((acc, row) => {
    const status = String(row.status || 'unknown');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const nowIso = new Date().toISOString();
  const staleScheduled = (instanceRows.data || []).filter((row) => {
    const status = String(row.status || '');
    const scheduledFor = String(row.scheduled_for || '');
    return status === 'scheduled' && scheduledFor && scheduledFor <= nowIso;
  }).length;
  const failedInstances = (instanceRows.data || []).filter((row) => String(row.status || '') === 'failed').length;
  const enqueuedWithoutQueue = (instanceRows.data || []).filter((row) => {
    const status = String(row.status || '');
    const queueId = String((row as { queue_id?: string | null }).queue_id || '');
    return status === 'enqueued' && !queueId;
  }).length;

  return {
    config,
    flowMatrix: LIFECYCLE_FLOW_MATRIX,
    flows: flowRows.data || [],
    instances: instanceRows.data || [],
    statusCounts,
    consistency: {
      staleScheduled,
      failedInstances,
      enqueuedWithoutQueue,
      ok: staleScheduled === 0 && failedInstances === 0 && enqueuedWithoutQueue === 0,
    },
    missingAlerts,
    runs: runRows.data || [],
    materializedInserted: materializeResult.inserted,
    materializeError: materializeResult.ok ? null : materializeResult.error || null,
    schemaStatus: {
      ready: true,
      missingTables: [],
    },
  };
}

export async function updateLifecycleConfig(updates: Partial<LifecycleConfig>) {
  const rows: Array<{ key: string; value: unknown }> = [];

  if (typeof updates.timezone === 'string' && updates.timezone.trim()) {
    rows.push({ key: 'email_trigger_timezone', value: updates.timezone.trim() });
  }
  if (typeof updates.pigRemainderDueDate === 'string' && updates.pigRemainderDueDate.trim()) {
    rows.push({ key: 'pig_remainder_due_date', value: updates.pigRemainderDueDate.trim() });
  }
  if (Array.isArray(updates.pigRemainderReminderDays)) {
    rows.push({ key: 'pig_remainder_reminder_days', value: updates.pigRemainderReminderDays });
  }
  if (typeof updates.pigPostOrderExplainerDelayDays === 'number') {
    rows.push({
      key: 'pig_post_order_explainer_delay_days',
      value: Math.max(0, Math.round(updates.pigPostOrderExplainerDelayDays)),
    });
  }
  if (Array.isArray(updates.eggRemainderReminderDays)) {
    rows.push({ key: 'egg_remainder_reminder_days', value: updates.eggRemainderReminderDays });
  }
  if (typeof updates.eggOverdueGraceHours === 'number') {
    rows.push({
      key: 'egg_overdue_grace_hours',
      value: Math.max(0, Math.round(updates.eggOverdueGraceHours)),
    });
  }
  if (Array.isArray(updates.chickenPickupReminderDays)) {
    rows.push({ key: 'chicken_pickup_reminder_days', value: updates.chickenPickupReminderDays });
  }
  if (typeof updates.chickenAutoReadyDaysBefore === 'number') {
    rows.push({
      key: 'chicken_auto_ready_days_before',
      value: Math.max(0, Math.round(updates.chickenAutoReadyDaysBefore)),
    });
  }
  if (typeof updates.campaignSendViaApiCronOnly === 'boolean') {
    rows.push({ key: 'campaign_send_via_api_cron_only', value: updates.campaignSendViaApiCronOnly });
  }

  if (rows.length > 0) {
    await supabaseAdmin.from('app_config').upsert(
      rows.map((row) => ({
        key: row.key,
        value: row.value,
      })),
      { onConflict: 'key' }
    );
  }

  return getLifecycleConfig();
}
