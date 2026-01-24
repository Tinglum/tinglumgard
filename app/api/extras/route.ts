import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { data: extras, error } = await supabaseAdmin
      .from('extras_catalog')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching extras:', error);
      return NextResponse.json({ error: 'Failed to fetch extras' }, { status: 500 });
    }

    return NextResponse.json({ extras: extras || [] });
  } catch (error) {
    console.error('Extras API error:', error);
    return NextResponse.json({ error: 'Failed to fetch extras' }, { status: 500 });
  }
}
