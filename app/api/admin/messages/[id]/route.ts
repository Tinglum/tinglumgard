import { NextResponse } from 'next/server';

// This endpoint is not used. Replies are handled at /api/admin/messages/[id]/replies.
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 404 });
}
