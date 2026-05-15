import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, breedId, quantityHens, seasonYear } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Gyldig e-postadresse kreves' }, { status: 400 });
    }

    const qty = Number(quantityHens);
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: 'Antall høner må være minst 1' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('chicken_interest')
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        breed_id: breedId || null,
        quantity_hens: qty,
        quantity_roosters: 0,
        season_year: seasonYear ? Number(seasonYear) || null : null,
        status: 'pending',
      });

    if (insertError) {
      logError('chickens-interest-insert', insertError);
      return NextResponse.json({ error: 'Kunne ikke registrere interesse' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('chickens-interest-main', error);
    return NextResponse.json({ error: 'Noe gikk galt' }, { status: 500 });
  }
}
