import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { buildEggDailyReport } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderPrintableHtml(report: Awaited<ReturnType<typeof buildEggDailyReport>>): string {
  const rows = report.rows
    .map(
      (row) => `<tr>
  <td>${escapeHtml(row.breed_name)}</td>
  <td>${row.total_collected}</td>
  <td>${row.sellable_standard}</td>
  <td>${row.sellable_rate_percent}%</td>
  <td>${row.too_small}</td>
  <td>${row.dirty}</td>
  <td>${row.cracked}</td>
  <td>${row.shell_defect}</td>
  <td>${row.other_unsellable}</td>
</tr>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>EggOps Daily Report ${report.date}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 12px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
      th { background: #f4f4f5; }
    </style>
  </head>
  <body>
    <h1>EggOps Daily Report</h1>
    <p>Date: ${report.date}</p>
    <p>Total collected: ${report.kpi.total_collected} | Sellable: ${report.kpi.total_sellable} | Rate: ${report.kpi.sellable_rate}%</p>
    <table>
      <thead>
        <tr>
          <th>Breed</th>
          <th>Total</th>
          <th>Sellable</th>
          <th>Rate</th>
          <th>Too small</th>
          <th>Dirty</th>
          <th>Cracked</th>
          <th>Shell defect</th>
          <th>Other</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <script>window.print()</script>
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const date = request.nextUrl.searchParams.get('date') || undefined
    const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase()
    const report = await buildEggDailyReport(date)

    if (format === 'csv') {
      return new NextResponse(report.csv, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="eggops-daily-${report.date}.csv"`,
        },
      })
    }

    if (format === 'html' || format === 'pdf') {
      return new NextResponse(renderPrintableHtml(report), {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      })
    }

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to build daily report' }, { status: 500 })
  }
}
