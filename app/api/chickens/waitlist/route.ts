import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, breedId, hatchId, quantityHens } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Gyldig e-postadresse kreves' }, { status: 400 });
    }

    if (!breedId) {
      return NextResponse.json({ error: 'Rase er påkrevd' }, { status: 400 });
    }

    const qty = Number(quantityHens);
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: 'Antall høner må være minst 1' }, { status: 400 });
    }

    // Verify breed exists
    const { data: breed, error: breedError } = await supabaseAdmin
      .from('chicken_breeds')
      .select('id')
      .eq('id', breedId)
      .maybeSingle();

    if (breedError || !breed) {
      return NextResponse.json({ error: 'Ugyldig rase' }, { status: 400 });
    }

    // Check for duplicate (same email + breed + waiting)
    const { data: existing } = await supabaseAdmin
      .from('chicken_waitlist')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('breed_id', breedId)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Du er allerede på ventelisten for denne rasen' },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from('chicken_waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        breed_id: breedId,
        hatch_id: hatchId || null,
        quantity_hens: qty,
        status: 'waiting',
      });

    if (insertError) {
      logError('chickens-waitlist-insert', insertError);
      return NextResponse.json({ error: 'Kunne ikke legge til på ventelisten' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Du er lagt til på ventelisten',
    });
  } catch (error) {
    logError('chickens-waitlist-main', error);
    return NextResponse.json({ error: 'Noe gikk galt' }, { status: 500 });
  }
}
