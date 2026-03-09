import { sendViaMailgun, type MailgunSendParams } from '@/lib/email/provider-mailgun';

export type SendEmailParams = MailgunSendParams;

// Provider adapter kept for compatibility. Business routes should use dispatchEmail().
export async function sendEmail(params: SendEmailParams) {
  return sendViaMailgun(params);
}
