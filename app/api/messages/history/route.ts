import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchCommunicationHistory } from '@/lib/email/history';

export async function GET() {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email && !session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const communications = await fetchCommunicationHistory({
      userId: session.userId,
      email: session.email as string | undefined,
      phone: session.phoneNumber as string | undefined,
      limit: 200,
    });

    return NextResponse.json({ communications });
  } catch (error) {
    console.error('messages-history-get', error);
    return NextResponse.json({ error: 'Failed to fetch communication history' }, { status: 500 });
  }
}
