import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('key', 'order_modification_cutoff')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      cutoff: config?.value || { year: 2026, week: 46 },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
