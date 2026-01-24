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
      <p>Takk for depositum for ordre <strong>${orderNumber}</strong>.</p>
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
