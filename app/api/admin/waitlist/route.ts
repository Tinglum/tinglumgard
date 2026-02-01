import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    const { data: waitlist, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (format === 'csv') {
      const csv = generateCSV(waitlist || []);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ waitlist: waitlist || [] });
  } catch (error) {
    logError('admin-waitlist-get', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('waitlist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-waitlist-delete', error);
    return NextResponse.json(
      { error: 'Failed to delete waitlist entry' },
      { status: 500 }
    );
  }
}

function generateCSV(waitlist: any[]): string {
  const headers = ['Email', 'Name', 'Phone', 'Created At'];

  const rows = waitlist.map((entry) => {
    return [
      entry.email,
      entry.name || '',
      entry.phone || '',
      new Date(entry.created_at).toLocaleDateString('nb-NO'),
    ]
      .map((field) => `"${field}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
