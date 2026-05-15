import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, boxSizePreference } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Gyldig e-postadresse kreves' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already on waitlist with status 'waiting' — update preference
    const { data: existing } = await supabaseAdmin
      .from('pork_waitlist')
      .select('id, status')
      .eq('email', normalizedEmail)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (boxSizePreference !== undefined) {
        updates.box_size_preference = Number(boxSizePreference) || null;
      }
      if (name) {
        updates.name = name.trim();
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('pork_waitlist')
          .update(updates)
          .eq('id', existing.id);
      }

      return NextResponse.json({ success: true });
    }

    const { error: insertError } = await supabaseAdmin
      .from('pork_waitlist')
      .insert({
        email: normalizedEmail,
        name: name?.trim() || null,
        box_size_preference: boxSizePreference ? Number(boxSizePreference) || null : null,
        status: 'waiting',
      });

    if (insertError) {
      logError('orders-waitlist-insert', insertError);
      return NextResponse.json({ error: 'Kunne ikke legge til på ventelisten' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('orders-waitlist-main', error);
    return NextResponse.json({ error: 'Noe gikk galt' }, { status: 500 });
  }
}
