interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const region = process.env.MAILGUN_REGION || 'eu';
  const apiBase = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';

  if (!apiKey || !domain) {
    return { success: false, error: 'Email service not configured' };
  }

  const fromAddress = process.env.EMAIL_FROM || 'post@tinglum.com';
  const replyTo = process.env.EMAIL_REPLY_TO || fromAddress;

  try {
    const formData = new URLSearchParams();
    formData.append('from', fromAddress);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);
    formData.append('h:Reply-To', replyTo);

    const response = await fetch(`${apiBase}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mailgun API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        to,
        subject,
      });
      return { success: false, error: data.message || 'Failed to send email' };
    }

    console.log('Mailgun API success:', {
      id: data.id,
      message: data.message,
      to,
      subject,
    });

    return { success: true, id: data.id || data.message };
  } catch (error) {
    return { success: false, error: 'Failed to send email' };
  }
}
