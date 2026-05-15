import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { APP_BASE_URL } from '@/lib/constants/app'

interface InventoryOverallocationParams {
  orderId: string
  orderNumber: string
  customerName?: string
  errorMessage: string
  source: string
}

export async function notifyInventoryOverallocation(params: InventoryOverallocationParams): Promise<void> {
  const { orderId, orderNumber, customerName, errorMessage, source } = params

  console.warn('Inventory overallocation:', { orderId, orderNumber, source, errorMessage })

  await supabaseAdmin.from('app_notifications').insert({
    type: 'inventory_overallocation',
    title: `Lagerbeholdning overskredet: ${orderNumber}`,
    body: `Betaling ble registrert for ${orderNumber}${customerName ? ` (${customerName})` : ''}, men eggreservasjon feilet: ${errorMessage}. Sjekk lagerbeholdning og juster manuelt.`,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      customer_name: customerName || null,
      error_message: errorMessage,
      source,
    },
    read: false,
  })

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM || ''
  if (!adminEmail || adminEmail === 'noreply@yourdomain.com') return

  const appUrl = APP_BASE_URL

  await dispatchEmail({
    to: adminEmail,
    subject: `⚠️ Eggreservasjon feilet – ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Betaling registrert, men eggreservasjon feilet</h2>
        <p>Betalingen er registrert, men det var ikke nok egg i lageret til å fullføre reservasjonen. Du må sjekke lagerbeholdningen og eventuelt justere manuelt.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #666;">Ordrenummer</td><td style="padding: 8px 0; font-weight: bold;">${orderNumber}</td></tr>
          ${customerName ? `<tr><td style="padding: 8px 0; color: #666;">Kunde</td><td style="padding: 8px 0;">${customerName}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #666;">Feilmelding</td><td style="padding: 8px 0;">${errorMessage}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Kilde</td><td style="padding: 8px 0;">${source}</td></tr>
        </table>
        <p><a href="${appUrl}/admin" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Gå til admin</a></p>
      </div>
    `,
    eggOrderId: orderId,
    classification: 'operational',
    sourcePath: 'lib.notifications.inventory-overallocation',
    flowKey: 'admin.inventory_overallocation.alert',
    sendImmediately: true,
  })
}
