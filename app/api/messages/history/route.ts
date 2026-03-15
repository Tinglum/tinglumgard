import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchCommunicationHistory } from '@/lib/email/history';

export async function GET() {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email && !session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const all = await fetchCommunicationHistory({
      userId: session.userId,
      email: session.email as string | undefined,
      phone: session.phoneNumber as string | undefined,
      limit: 200,
    });

    // Only show emails actually sent TO this customer, not admin/owner notifications
    const sessionEmail = (session.email || '').toLowerCase().trim();

    const communications = all.filter((entry) => {
      const toEmail = (entry.toEmail || '').toLowerCase().trim();
      // If the entry has a to_email, it must match the customer's email
      if (toEmail && sessionEmail) return toEmail === sessionEmail;
      // Legacy entries matched by order_id without to_email — keep them
      // (they were found via order ownership, so they belong to this customer)
      if (!toEmail && entry.source === 'legacy_email_log') return true;
      return false;
    });

    return NextResponse.json({ communications });
  } catch (error) {
    console.error('messages-history-get', error);
    return NextResponse.json({ error: 'Failed to fetch communication history' }, { status: 500 });
  }
}
