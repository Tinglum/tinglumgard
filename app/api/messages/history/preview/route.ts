import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Customer-facing email preview endpoint.
 * Returns the HTML body of a sent email so the customer can view it on Min side.
 * Only returns emails belonging to the authenticated customer.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email && !session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const source = searchParams.get('source');
  const id = searchParams.get('id');

  if (!id || (source !== 'email_dispatch_queue' && source !== 'legacy_email_log')) {
    return NextResponse.json({ error: 'Valid source and id are required' }, { status: 400 });
  }

  try {
    if (source === 'email_dispatch_queue') {
      const { data, error } = await supabaseAdmin
        .from('email_dispatch_queue')
        .select('id, subject, html, to_email, to_phone, sent_at, created_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('email-preview-queue', error);
        return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      // Verify this email belongs to the current customer
      const ownerMatch = belongsToSession(
        { email: data.to_email, phone: data.to_phone },
        session,
      );
      if (!ownerMatch) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      return NextResponse.json({
        preview: {
          subject: String(data.subject || ''),
          html: String(data.html || ''),
          sentAt: data.sent_at ? String(data.sent_at) : null,
          createdAt: data.created_at ? String(data.created_at) : null,
        },
      });
    }

    // Legacy email_log
    const { data, error } = await supabaseAdmin
      .from('email_log')
      .select('id, recipient, subject, message, sent_at, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('email-preview-legacy', error);
      return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const ownerMatch = belongsToSession(
      { email: data.recipient, phone: null },
      session,
    );
    if (!ownerMatch) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({
      preview: {
        subject: String(data.subject || ''),
        html: String(data.message || ''),
        sentAt: data.sent_at ? String(data.sent_at) : null,
        createdAt: data.created_at ? String(data.created_at) : null,
      },
    });
  } catch (err) {
    console.error('email-preview-error', err);
    return NextResponse.json({ error: 'Failed to fetch email preview' }, { status: 500 });
  }
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-8);
}

function belongsToSession(
  target: { email: string | null; phone: string | null },
  session: { email?: string | null; phoneNumber?: string | null; userId?: string | null },
): boolean {
  if (session.email && target.email && session.email.toLowerCase() === target.email.toLowerCase()) {
    return true;
  }
  const sessionDigits = normalizePhone(session.phoneNumber);
  const targetDigits = normalizePhone(target.phone);
  if (sessionDigits && targetDigits && sessionDigits === targetDigits) {
    return true;
  }
  return false;
}
