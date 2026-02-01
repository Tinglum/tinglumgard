import { NextResponse } from 'next/server';

// Stubbed route: disabled in favor of POWR embed. Returns 404 to avoid build/runtime errors.
export async function GET() {
  return NextResponse.json({ error: 'Instagram API route disabled - using POWR embed' }, { status: 404 });
}
