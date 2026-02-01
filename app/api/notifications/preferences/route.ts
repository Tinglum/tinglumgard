import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/notifications/preferences - Get customer's notification preferences
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { data: preferences, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('customer_phone', session.phoneNumber)
      .maybeSingle();

    if (error) {
      logError('notification-prefs-get', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        email_enabled: true,
        sms_enabled: false,
        order_updates_enabled: true,
        delivery_reminders_enabled: true,
        referral_notifications_enabled: true,
        promotional_enabled: true,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    logError('notification-prefs-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/preferences - Update notification preferences
export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const updates = await request.json();

    const { data: preferences, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(
        {
          customer_phone: session.phoneNumber,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_phone' }
      )
      .select()
      .single();

    if (error) {
      logError('notification-prefs-patch', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    logError('notification-prefs-patch-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
