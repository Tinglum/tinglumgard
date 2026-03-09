import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Online remainder payment is no longer available for chicken orders',
      code: 'CHICKEN_REMAINDER_ONLINE_DISABLED',
      message:
        'Remaining balance is paid physically at pickup. Please contact support if you need help.',
    },
    { status: 410 }
  );
}
