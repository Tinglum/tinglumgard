interface OrderConfirmationParams {
  customerName: string;
  orderNumber: string;
  boxSize: 8 | 12;
  ribbeChoice: string;
  deliveryType: string;
  freshDelivery: boolean;
  extraProducts: string[];
  depositAmount: number;
  totalAmount: number;
  language: 'no' | 'en';
}

export function getOrderConfirmationTemplate({
  customerName,
  orderNumber,
  boxSize,
  depositAmount,
  totalAmount,
  language,
}: OrderConfirmationParams): { subject: string; html: string } {
  if (language === 'en') {
    return {
      subject: `Order Confirmation - ${orderNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .amount { font-size: 28px; font-weight: 700; color: #2C1810; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Order Received!</h2>
      <p>Hi ${customerName},</p>
      <p>Thank you for your order <strong>${orderNumber}</strong>.</p>
      <p>Your ${boxSize}kg pork box has been reserved. We will send you a Vipps payment request for the 50% deposit shortly.</p>
      <div class="amount">Total: kr ${totalAmount.toLocaleString('nb-NO')}</div>
      <div class="amount" style="font-size: 18px;">Deposit (50%): kr ${depositAmount.toLocaleString('nb-NO')}</div>
      <p>Best regards,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
      `,
    };
  }

  return {
    subject: `Bestilling mottatt - ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .amount { font-size: 28px; font-weight: 700; color: #2C1810; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Bestilling mottatt!</h2>
      <p>Hei ${customerName},</p>
      <p>Takk for din bestilling <strong>${orderNumber}</strong>.</p>
      <p>Din ${boxSize}kg griskasse er reservert. Vi sender deg snart en Vipps-betalingsforespørsel for forskuddet på 50%.</p>
      <div class="amount">Totalt: kr ${totalAmount.toLocaleString('nb-NO')}</div>
      <div class="amount" style="font-size: 18px;">Forskudd (50%): kr ${depositAmount.toLocaleString('nb-NO')}</div>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

interface RemainderReminderParams {
  customerName: string;
  orderNumber: string;
  remainderAmount: number;
  paymentUrl: string;
  dueDate: string;
  language: 'no' | 'en';
}

export function getRemainderReminderTemplate({
  customerName,
  orderNumber,
  remainderAmount,
  paymentUrl,
  dueDate,
  language,
}: RemainderReminderParams): { subject: string; html: string } {
  if (language === 'en') {
    return {
      subject: `Remainder Payment Due - Order ${orderNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .button { display: inline-block; background: #1a1a1a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .amount { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 20px 0; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hi ${customerName},</h2>
      <p>Thank you for your deposit payment for order <strong>${orderNumber}</strong>.</p>
      <p>The remainder payment for your beef box is now due.</p>

      <div class="info-box">
        <p style="margin: 0;"><strong>Order:</strong> ${orderNumber}</p>
        <p style="margin: 10px 0 0 0;"><strong>Due date:</strong> ${dueDate}</p>
      </div>

      <div style="text-align: center;">
        <div class="amount">kr ${remainderAmount.toLocaleString('nb-NO')}</div>
        <a href="${paymentUrl}" class="button">Pay Remainder with Vipps</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have already paid, please disregard this reminder. Your order will be locked after the due date.
      </p>

      <p>Best regards,<br>Tinglum Gård</p>
    </div>
    <div class="footer">
      <p>Tinglum Gård • Trondheim, Norway</p>
    </div>
  </div>
</body>
</html>
      `,
    };
  }

  return {
    subject: `Restbetaling forfaller - Ordre ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .button { display: inline-block; background: #1a1a1a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .amount { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 20px 0; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hei ${customerName},</h2>
      <p>Takk for forskudd for ordre <strong>${orderNumber}</strong>.</p>
      <p>Restbetalingen for din okseboks forfaller nå.</p>

      <div class="info-box">
        <p style="margin: 0;"><strong>Ordrenummer:</strong> ${orderNumber}</p>
        <p style="margin: 10px 0 0 0;"><strong>Forfallsdato:</strong> ${dueDate}</p>
      </div>

      <div style="text-align: center;">
        <div class="amount">kr ${remainderAmount.toLocaleString('nb-NO')}</div>
        <a href="${paymentUrl}" class="button">Betal rest med Vipps</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Hvis du allerede har betalt, kan du se bort fra denne påminnelsen. Bestillingen din vil bli låst etter forfallsdato.
      </p>

      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
    <div class="footer">
      <p>Tinglum Gård • Trondheim, Norge</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

interface OrderLockedParams {
  customerName: string;
  orderNumber: string;
  language: 'no' | 'en';
}

export function getOrderLockedTemplate({
  customerName,
  orderNumber,
  language,
}: OrderLockedParams): { subject: string; html: string } {
  if (language === 'en') {
    return {
      subject: `Order ${orderNumber} Locked - Finalized`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hi ${customerName},</h2>
      <p>Your order <strong>${orderNumber}</strong> has been locked and finalized.</p>
      <p>No further changes can be made to your order. We're preparing your beef box for pickup/delivery.</p>
      <p>You'll receive a notification when your order is ready.</p>
      <p>Thank you for your order!</p>
      <p>Best regards,<br>Tinglum Gård</p>
    </div>
    <div class="footer">
      <p>Tinglum Gård • Trondheim, Norway</p>
    </div>
  </div>
</body>
</html>
      `,
    };
  }

  return {
    subject: `Ordre ${orderNumber} låst - Ferdigstilt`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hei ${customerName},</h2>
      <p>Din ordre <strong>${orderNumber}</strong> er nå låst og ferdigstilt.</p>
      <p>Ingen flere endringer kan gjøres. Vi klargjør okseboksen din for henting/levering.</p>
      <p>Du vil motta beskjed når bestillingen din er klar.</p>
      <p>Takk for din bestilling!</p>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
    <div class="footer">
      <p>Tinglum Gård • Trondheim, Norge</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// Admin notification when new order deposit is paid
interface AdminOrderNotificationParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  boxSize: 8 | 12;
  deliveryType: string;
  freshDelivery: boolean;
  ribbeChoice: string;
  extraProducts: any[];
  depositAmount: number;
  remainderAmount: number;
  totalAmount: number;
  referralDiscount?: number;
  rebateDiscount?: number;
}

export function getAdminOrderNotificationTemplate(params: AdminOrderNotificationParams): { subject: string; html: string } {
  const discountInfo = params.referralDiscount || params.rebateDiscount 
    ? `<p><strong>Rabatt:</strong> kr ${(params.referralDiscount || params.rebateDiscount || 0).toLocaleString('nb-NO')}</p>`
    : '';

  const extrasList = params.extraProducts?.length > 0
    ? `<ul>${params.extraProducts.map(p => `<li>${p.name} (${p.quantity}x kr ${p.price})</li>`).join('')}</ul>`
    : '<p>Ingen</p>';

  return {
    subject: `Ny ordre mottatt - ${params.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: #2C1810; color: white; padding: 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px; margin: 20px 0; border-radius: 8px; }
    .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2C1810; }
    .amount { font-size: 18px; font-weight: 700; color: #2C1810; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ny ordre registrert</h1>
    </div>
    <div class="content">
      <h2>Ordre ${params.orderNumber}</h2>
      <p><strong>Status:</strong> Forskudd betalt ✓</p>
      
      <div class="section">
        <h3>Kundeinformasjon</h3>
        <p><strong>Navn:</strong> ${params.customerName}</p>
        <p><strong>E-post:</strong> ${params.customerEmail}</p>
        <p><strong>Telefon:</strong> ${params.customerPhone}</p>
      </div>

      <div class="section">
        <h3>Ordredetaljer</h3>
        <p><strong>Kassestørrelse:</strong> ${params.boxSize}kg</p>
        <p><strong>Ribbe valg:</strong> ${params.ribbeChoice}</p>
        <p><strong>Leveringstype:</strong> ${params.deliveryType}</p>
        <p><strong>Fersk levering:</strong> ${params.freshDelivery ? 'Ja (+200 kr)' : 'Nei'}</p>
        <p><strong>Ekstra produkter:</strong></p>
        ${extrasList}
      </div>

      <div class="section">
        <h3>Betalingsoversikt</h3>
        ${discountInfo}
        <p class="amount">Forskudd betalt: kr ${params.depositAmount.toLocaleString('nb-NO')}</p>
        <p class="amount">Restbetaling: kr ${params.remainderAmount.toLocaleString('nb-NO')}</p>
        <p class="amount">Totalt: kr ${params.totalAmount.toLocaleString('nb-NO')}</p>
      </div>

      <p style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 4px;">
        <strong>Neste steg:</strong> Kunden får påminnelse om restbetaling 2 uker før henting.
      </p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// Admin notification for egg orders
interface AdminEggOrderNotificationParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  breedName: string;
  weekNumber: number;
  deliveryMonday: string;
  quantity: number;
  pricePerEgg: number;
  deliveryMethod: string;
  depositAmount: number;
  remainderAmount: number;
  totalAmount: number;
}

export function getAdminEggOrderNotificationTemplate(
  params: AdminEggOrderNotificationParams
): { subject: string; html: string } {
  const formatNok = (amountOre: number) =>
    Math.round(amountOre / 100).toLocaleString('nb-NO');

  const deliveryLabel =
    params.deliveryMethod === 'posten'
      ? 'Posten levering'
      : params.deliveryMethod === 'e6_pickup'
      ? 'E6 møtepunkt'
      : 'Henting på gården';

  const deliveryDate = new Date(params.deliveryMonday).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    subject: `Ny rugeegg-ordre mottatt - ${params.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px; margin: 20px 0; border-radius: 8px; }
    .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #1f2937; }
    .amount { font-size: 18px; font-weight: 700; color: #111827; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ny rugeegg-ordre</h1>
    </div>
    <div class="content">
      <h2>Ordre ${params.orderNumber}</h2>
      <p><strong>Status:</strong> Forskudd betalt ✓</p>

      <div class="section">
        <h3>Kundeinformasjon</h3>
        <p><strong>Navn:</strong> ${params.customerName}</p>
        <p><strong>E-post:</strong> ${params.customerEmail}</p>
        <p><strong>Telefon:</strong> ${params.customerPhone}</p>
      </div>

      <div class="section">
        <h3>Ordredetaljer</h3>
        <p><strong>Rase:</strong> ${params.breedName}</p>
        <p><strong>Uke:</strong> ${params.weekNumber}</p>
        <p><strong>Levering:</strong> ${deliveryDate}</p>
        <p><strong>Antall:</strong> ${params.quantity} egg</p>
        <p><strong>Pris per egg:</strong> kr ${formatNok(params.pricePerEgg)}</p>
        <p><strong>Leveringsmåte:</strong> ${deliveryLabel}</p>
      </div>

      <div class="section">
        <h3>Betalingsoversikt</h3>
        <p class="amount">Forskudd betalt: kr ${formatNok(params.depositAmount)}</p>
        <p class="amount">Restbetaling: kr ${formatNok(params.remainderAmount)}</p>
        <p class="amount">Totalt: kr ${formatNok(params.totalAmount)}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// Customer message confirmation email
interface CustomerMessageConfirmationParams {
  customerName: string;
  messageId: string;
  subject: string;
  message: string;
  orderNumber?: string;
}

export function getCustomerMessageConfirmationTemplate(params: CustomerMessageConfirmationParams): { subject: string; html: string } {
  const threadId = `msg_${params.messageId}`;
  
  return {
    subject: `[${threadId}] Melding mottatt - ${params.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .message-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .ticket { background: #e3f2fd; padding: 10px; border-radius: 4px; font-family: monospace; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Melding mottatt</h2>
      <p>Hei ${params.customerName},</p>
      <p>Vi har mottatt din melding og vil svare deg så snart som mulig.</p>
      
      <p><strong>Referansenummer:</strong> <span class="ticket">${threadId}</span></p>
      ${params.orderNumber ? `<p><strong>Ordre:</strong> ${params.orderNumber}</p>` : ''}
      
      <div class="message-box">
        <p><strong>Din melding:</strong></p>
        <p style="white-space: pre-wrap;">${params.message}</p>
      </div>

      <p><strong>Du kan svare på denne e-posten direkte</strong>, og svaret vil automatisk legges til i samtalen.</p>
      
      <p>Du kan også følge med på meldingen din på <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no'}/min-side">Min Side</a>.</p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Forventet svartid: Innen 24 timer på hverdager
      </p>

      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// Admin reply notification to customer
interface AdminReplyNotificationParams {
  customerName: string;
  messageId: string;
  subject: string;
  replyText: string;
  adminName: string;
}

export function getAdminReplyNotificationTemplate(params: AdminReplyNotificationParams): { subject: string; html: string } {
  const threadId = `msg_${params.messageId}`;
  
  return {
    subject: `[${threadId}] Svar på: ${params.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .reply-box { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Svar fra ${params.adminName}</h2>
      <p>Hei ${params.customerName},</p>
      <p>Du har fått et svar på din melding:</p>
      
      <div class="reply-box">
        <p style="white-space: pre-wrap;">${params.replyText}</p>
      </div>

      <p><strong>Du kan svare direkte på denne e-posten</strong>, eller gå til <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no'}/min-side">Min Side</a> for å se hele samtalen.</p>
      
      <p>Vennlig hilsen,<br>${params.adminName}<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}
