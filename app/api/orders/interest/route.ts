import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, boxSizePreference, seasonYear } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Gyldig e-postadresse kreves' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('pork_interest')
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        box_size_preference: boxSizePreference ? Number(boxSizePreference) || null : null,
        season_year: seasonYear ? Number(seasonYear) || null : null,
        status: 'pending',
      });

    if (insertError) {
      logError('orders-interest-insert', insertError);
      return NextResponse.json({ error: 'Kunne ikke registrere interesse' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('orders-interest-main', error);
    return NextResponse.json({ error: 'Noe gikk galt' }, { status: 500 });
  }
}
