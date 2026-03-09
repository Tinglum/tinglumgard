import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { retryQueueEntry } from '@/lib/email/queue';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const success = await retryQueueEntry(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Failed to retry queue item' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: params.id });
}
