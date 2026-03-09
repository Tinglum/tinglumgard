import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { getLifecycleOverview, updateLifecycleConfig } from '@/lib/email/lifecycle';

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const overview = await getLifecycleOverview();
  return NextResponse.json(overview);
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));

  const updated = await updateLifecycleConfig({
    timezone: typeof body?.timezone === 'string' ? body.timezone : undefined,
    pigRemainderDueDate:
      typeof body?.pigRemainderDueDate === 'string' ? body.pigRemainderDueDate : undefined,
    pigRemainderReminderDays: Array.isArray(body?.pigRemainderReminderDays)
      ? body.pigRemainderReminderDays
      : undefined,
    pigPostOrderExplainerDelayDays:
      typeof body?.pigPostOrderExplainerDelayDays === 'number'
        ? body.pigPostOrderExplainerDelayDays
        : undefined,
    eggRemainderReminderDays: Array.isArray(body?.eggRemainderReminderDays)
      ? body.eggRemainderReminderDays
      : undefined,
    eggOverdueGraceHours:
      typeof body?.eggOverdueGraceHours === 'number' ? body.eggOverdueGraceHours : undefined,
    chickenPickupReminderDays: Array.isArray(body?.chickenPickupReminderDays)
      ? body.chickenPickupReminderDays
      : undefined,
    chickenAutoReadyDaysBefore:
      typeof body?.chickenAutoReadyDaysBefore === 'number' ? body.chickenAutoReadyDaysBefore : undefined,
    campaignSendViaApiCronOnly:
      typeof body?.campaignSendViaApiCronOnly === 'boolean' ? body.campaignSendViaApiCronOnly : undefined,
  });

  return NextResponse.json({ success: true, config: updated });
}
