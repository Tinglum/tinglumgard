import { dispatchEmail } from '@/lib/email/dispatch'
import { buildEggDailyReport } from '@/lib/eggs/collection'
import { getEggOpsConfig } from '@/lib/eggs/ops-config'

function renderSummaryHtml(report: Awaited<ReturnType<typeof buildEggDailyReport>>): string {
  const rows = report.rows
    .slice(0, 12)
    .map(
      (row) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${row.breed_name}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${row.total_collected}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${row.sellable_standard}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${row.sellable_rate_percent}%</td>
      </tr>
    `
    )
    .join('')

  return `
    <p>Daglig EggOps-oppsummering for <strong>${report.date}</strong>.</p>
    <p>
      Totalt innsamlet: <strong>${report.kpi.total_collected}</strong><br/>
      Salgbare: <strong>${report.kpi.total_sellable}</strong><br/>
      Salgbar-rate: <strong>${report.kpi.sellable_rate}%</strong>
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #d1d5db;">Rase</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #d1d5db;">Total</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #d1d5db;">Salgbare</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #d1d5db;">Rate</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">
      Full CSV: <a href="{{report_link}}">{{report_link}}</a>
    </p>
  `
}

export async function sendEggOpsDailySummary(params?: { date?: string; baseUrl?: string }) {
  const config = await getEggOpsConfig()
  if (!config.summaryEnabled) {
    return { ok: true, skipped: true, reason: 'summary_disabled', sent: 0 }
  }

  const recipients = config.summaryRecipients
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)

  if (recipients.length === 0) {
    return { ok: true, skipped: true, reason: 'no_recipients', sent: 0 }
  }

  const report = await buildEggDailyReport(params?.date)
  const baseUrl = (params?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const reportLink = baseUrl
    ? `${baseUrl}/api/admin/eggs/daily/report?date=${encodeURIComponent(report.date)}&format=csv`
    : `Report date ${report.date}`

  const htmlBody = renderSummaryHtml(report).replaceAll('{{report_link}}', reportLink)
  const subject = `EggOps dagrapport ${report.date} (${report.kpi.total_sellable} salgbare)`

  const results = await Promise.all(
    recipients.map((to) =>
      dispatchEmail({
        to,
        classification: 'system',
        locale: 'no',
        subject,
        html: htmlBody,
        sourcePath: '/api/cron/eggs-daily-summary',
        templateKey: 'eggops.daily.summary',
        entityType: 'egg_daily_report',
        entityId: report.date,
      })
    )
  )

  return {
    ok: true,
    skipped: false,
    sent: results.filter((result) => result.success).length,
    queued: results.map((result) => result.queueId).filter(Boolean),
    date: report.date,
  }
}
