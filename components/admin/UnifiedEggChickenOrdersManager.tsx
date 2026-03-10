'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Bird, Egg, Loader2, RefreshCw, Search } from 'lucide-react'

type Source = 'egg' | 'chicken'

type URow = {
  id: string
  source: Source
  orderNumber: string
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
  weekLabel: string
  lines: Array<{ key: string; label: string; qty: string }>
  totalOre: number
  paidOre: number
  dueOre: number
  notes: string
  adminNotes: string
  dueDate: string | null
  payments: Array<{ id: string; type: string; status: string; amountOre: number; at: string | null }>
}

const EGG_STATUS = [
  'pending',
  'deposit_paid',
  'fully_paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'forfeited',
]

const CHICKEN_STATUS = [
  'pending',
  'deposit_paid',
  'fully_paid',
  'ready_for_pickup',
  'picked_up',
  'cancelled',
]

const ore = (nok: number) => Math.round((Number(nok || 0)) * 100)
const paid = (payments: URow['payments']) =>
  payments.reduce((sum, p) => (p.status === 'completed' ? sum + p.amountOre : sum), 0)

function toEgg(raw: any, weekWord: string): URow {
  const lines = [
    {
      key: `${raw.id}-base`,
      label: raw.egg_breeds?.name || 'Rase',
      qty: `${Number(raw.quantity || 0)} egg`,
    },
    ...((raw.egg_order_additions || []) as any[]).map((addition) => ({
      key: addition.id,
      label: addition.egg_breeds?.name || 'Tillegg',
      qty: `+${Number(addition.quantity || 0)} egg`,
    })),
  ]

  const payments = ((raw.egg_payments || []) as any[]).map((payment) => ({
    id: payment.id,
    type: payment.payment_type,
    status: payment.status,
    amountOre: ore(payment.amount_nok),
    at: payment.paid_at || payment.created_at || null,
  }))

  const totalOre = Number(raw.total_amount || 0)
  const paidOre = paid(payments)

  return {
    id: raw.id,
    source: 'egg',
    orderNumber: raw.order_number,
    customerName: raw.customer_name,
    customerEmail: raw.customer_email,
    status: raw.status,
    createdAt: raw.created_at,
    weekLabel: `${weekWord} ${raw.week_number}/${raw.year}`,
    lines,
    totalOre,
    paidOre,
    dueOre: Math.max(0, totalOre - paidOre),
    notes: raw.notes || '',
    adminNotes: raw.admin_notes || '',
    dueDate: raw.remainder_due_date || null,
    payments,
  }
}

function toChicken(raw: any, weekWord: string): URow {
  const lines = [
    {
      key: `${raw.id}-base`,
      label: raw.chicken_breeds?.name || 'Rase',
      qty: `${Number(raw.quantity_hens || 0)}H${
        Number(raw.quantity_roosters || 0) > 0 ? ` + ${Number(raw.quantity_roosters || 0)}R` : ''
      }`,
    },
    ...((raw.chicken_order_additions || []) as any[]).map((addition) => ({
      key: addition.id,
      label: addition.chicken_breeds?.name || 'Tillegg',
      qty: `+${Number(addition.quantity_hens || 0)}H${
        Number(addition.quantity_roosters || 0) > 0 ? ` + ${Number(addition.quantity_roosters || 0)}R` : ''
      }`,
    })),
  ]

  const payments = ((raw.chicken_payments || []) as any[]).map((payment) => ({
    id: payment.id,
    type: payment.payment_type,
    status: payment.status,
    amountOre: ore(payment.amount_nok),
    at: payment.paid_at || payment.created_at || null,
  }))

  const totalOre = ore(raw.total_amount_nok)
  const paidOre = paid(payments)

  return {
    id: raw.id,
    source: 'chicken',
    orderNumber: raw.order_number,
    customerName: raw.customer_name,
    customerEmail: raw.customer_email,
    status: raw.status,
    createdAt: raw.created_at,
    weekLabel: `${weekWord} ${raw.pickup_week}/${raw.pickup_year}`,
    lines,
    totalOre,
    paidOre,
    dueOre: Math.max(0, totalOre - paidOre),
    notes: raw.notes || '',
    adminNotes: raw.admin_notes || '',
    dueDate: raw.remainder_due_date || null,
    payments,
  }
}

export function UnifiedEggChickenOrdersManager() {
  const { lang } = useLanguage()
  const { toast } = useToast()
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'

  const l =
    lang === 'en'
      ? {
          title: 'Unified Egg + Chicken Orders',
          subtitle: 'One view for order lines, payments and controls.',
          search: 'Search order, customer, email...',
          all: 'All',
          egg: 'Egg',
          chicken: 'Chicken',
          allStatuses: 'All statuses',
          refresh: 'Refresh',
          noRows: 'No matching orders',
          cols: ['Type', 'Order', 'Customer', 'Items', 'Paid / Total', 'Remainder', 'Status', 'Actions'],
          details: 'Details',
          collect: 'Collect',
          panel: 'Order details',
          loading: 'Loading...',
          status: 'Status',
          apply: 'Apply status',
          notes: 'Customer notes',
          admin: 'Admin notes',
          save: 'Save notes',
          amount: 'Amount (NOK)',
          markRemainder: 'Mark remainder paid',
          markDeposit: 'Mark deposit paid',
          sync: 'Sync status',
          cancel: 'Cancel order',
          failed: 'Action failed',
          updated: 'Updated',
          saved: 'Saved',
          week: 'Week',
          due: 'Remainder',
          created: 'Created',
          noDate: 'No date',
          resend: 'Resend confirmation',
          resent: 'Confirmation resent',
        }
      : {
          title: 'Samlet ordrebehandling: Rugeegg + Kyllinger',
          subtitle: 'En visning for ordrelinjer, betaling og styring.',
          search: 'Sok ordre, kunde, e-post...',
          all: 'Alle',
          egg: 'Rugeegg',
          chicken: 'Kylling',
          allStatuses: 'Alle statuser',
          refresh: 'Oppdater',
          noRows: 'Ingen treff',
          cols: ['Type', 'Bestilling', 'Kunde', 'Varelinjer', 'Betalt / Totalt', 'Rest', 'Status', 'Handlinger'],
          details: 'Detaljer',
          collect: 'Registrer rest',
          panel: 'Ordredetaljer',
          loading: 'Laster...',
          status: 'Status',
          apply: 'Oppdater status',
          notes: 'Kundenotat',
          admin: 'Adminnotat',
          save: 'Lagre notater',
          amount: 'Belop (NOK)',
          markRemainder: 'Marker rest betalt',
          markDeposit: 'Marker forskudd betalt',
          sync: 'Synk status',
          cancel: 'Kanseller ordre',
          failed: 'Handling feilet',
          updated: 'Oppdatert',
          saved: 'Lagret',
          week: 'Uke',
          due: 'Rest',
          created: 'Opprettet',
          noDate: 'Ingen dato',
          resend: 'Send bekreftelse pa nytt',
          resent: 'Bekreftelse sendt pa nytt',
        }

  const statusLabel = useCallback(
    (status: string) =>
      (
        {
          pending: lang === 'en' ? 'Pending' : 'Venter',
          deposit_paid: lang === 'en' ? 'Deposit paid' : 'Forskudd betalt',
          fully_paid: lang === 'en' ? 'Fully paid' : 'Fullt betalt',
          preparing: lang === 'en' ? 'Preparing' : 'Klargjores',
          shipped: lang === 'en' ? 'Shipped' : 'Sendt',
          delivered: lang === 'en' ? 'Delivered' : 'Levert',
          cancelled: lang === 'en' ? 'Cancelled' : 'Kansellert',
          forfeited: lang === 'en' ? 'Forfeited' : 'Fortapt',
          ready_for_pickup: lang === 'en' ? 'Ready for pickup' : 'Klar for henting',
          picked_up: lang === 'en' ? 'Picked up' : 'Hentet',
        } as Record<string, string>
      )[status] || status,
    [lang]
  )

  const money = useCallback(
    (valueOre: number) => `${lang === 'en' ? 'NOK' : 'kr'} ${(Math.max(0, valueOre) / 100).toLocaleString(locale)}`,
    [lang, locale]
  )

  const date = useCallback(
    (value?: string | null) => {
      if (!value) return l.noDate
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? l.noDate : d.toLocaleDateString(locale)
    },
    [l.noDate, locale]
  )

  const [rows, setRows] = useState<URow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<'all' | Source>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<URow | null>(null)
  const [detailSource, setDetailSource] = useState<Source | null>(null)
  const [statusDraft, setStatusDraft] = useState('')
  const [notes, setNotes] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [amountNok, setAmountNok] = useState('')
  const [mutating, setMutating] = useState<string | null>(null)

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true)
      else setLoading(true)
      try {
        const [eggsRes, chickensRes] = await Promise.all([
          fetch('/api/admin/eggs/orders'),
          fetch('/api/admin/chickens/orders'),
        ])
        if (!eggsRes.ok || !chickensRes.ok) throw new Error(l.failed)

        const eggs = await eggsRes.json()
        const chickens = await chickensRes.json()

        const merged = [
          ...((eggs?.orders || []) as any[]).map((row) => toEgg(row, l.week)),
          ...((chickens?.orders || []) as any[]).map((row) => toChicken(row, l.week)),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setRows(merged)
      } catch (error: any) {
        toast({
          title: l.failed,
          description: error?.message || l.failed,
          variant: 'destructive',
        })
      } finally {
        if (background) setRefreshing(false)
        else setLoading(false)
      }
    },
    [l.failed, l.week, toast]
  )

  useEffect(() => {
    void load()
  }, [load])

  const statuses = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((row) => row.status))).sort()],
    [rows]
  )

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (source !== 'all' && row.source !== source) return false
        if (statusFilter !== 'all' && row.status !== statusFilter) return false
        const query = search.trim().toLowerCase()
        if (!query) return true
        return `${row.orderNumber} ${row.customerName} ${row.customerEmail} ${row.lines
          .map((line) => line.label)
          .join(' ')}`.toLowerCase().includes(query)
      }),
    [rows, source, statusFilter, search]
  )

  const open = useCallback(
    async (src: Source, id: string) => {
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailSource(src)

      try {
        const res = await fetch(
          src === 'egg' ? `/api/admin/eggs/orders/${id}` : `/api/admin/chickens/orders/${id}`
        )
        if (!res.ok) throw new Error(l.failed)

        const json = await res.json()
        const row = src === 'egg' ? toEgg(json, l.week) : toChicken(json, l.week)
        setDetail(row)
        setStatusDraft(row.status)
        setNotes(row.notes)
        setAdminNotes(row.adminNotes)
        setAmountNok(String(Math.max(0, Math.round(row.dueOre / 100))))
      } catch (error: any) {
        toast({
          title: l.failed,
          description: error?.message || l.failed,
          variant: 'destructive',
        })
        setDetailOpen(false)
      } finally {
        setDetailLoading(false)
      }
    },
    [l.failed, l.week, toast]
  )

  const after = useCallback(
    async (title: string) => {
      toast({ title, description: detail?.orderNumber || '' })
      await load(true)
      if (detail && detailSource) await open(detailSource, detail.id)
      setMutating(null)
    },
    [detail, detailSource, load, open, toast]
  )

  const patch = useCallback(async (url: string, body: any, fallback: string) => {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error((await res.json().catch(() => ({})))?.error || fallback)
    }
  }, [])

  const eggAction = useCallback(
    async (id: string, action: string, data?: any) => {
      const res = await fetch(`/api/admin/eggs/orders/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: data || {} }),
      })
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error || l.failed)
      }
    },
    [l.failed]
  )

  const resendChickenConfirmation = useCallback(
    async (order: URow) => {
      if (order.source !== 'chicken') return
      const op = `resend-${order.id}`
      setMutating(op)
      try {
        const res = await fetch(`/api/admin/chickens/orders/${order.id}/resend-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeAdmin: true }),
        })

        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error || l.failed)
        }

        toast({ title: l.resent, description: order.orderNumber })
      } catch (error: any) {
        toast({
          title: l.failed,
          description: error?.message || l.failed,
          variant: 'destructive',
        })
      } finally {
        setMutating(null)
      }
    },
    [l.failed, l.resent, toast]
  )

  const applyStatus = useCallback(async () => {
    if (!detail || !detailSource) return
    setMutating('status')
    try {
      if (detailSource === 'egg') {
        await eggAction(detail.id, 'set_status', { status: statusDraft })
      } else {
        await patch(`/api/admin/chickens/orders/${detail.id}`, { status: statusDraft }, l.failed)
      }
      await after(l.updated)
    } catch (error: any) {
      toast({ title: l.failed, description: error?.message || l.failed, variant: 'destructive' })
      setMutating(null)
    }
  }, [after, detail, detailSource, eggAction, l.failed, l.updated, patch, statusDraft, toast])

  const saveNotes = useCallback(async () => {
    if (!detail || !detailSource) return
    setMutating('notes')
    try {
      const url =
        detailSource === 'egg'
          ? `/api/admin/eggs/orders/${detail.id}`
          : `/api/admin/chickens/orders/${detail.id}`
      await patch(url, { notes, adminNotes }, l.failed)
      await after(l.saved)
    } catch (error: any) {
      toast({ title: l.failed, description: error?.message || l.failed, variant: 'destructive' })
      setMutating(null)
    }
  }, [adminNotes, after, detail, detailSource, l.failed, l.saved, notes, patch, toast])

  const run = useCallback(
    async (kind: 'deposit' | 'remainder' | 'cancel' | 'sync') => {
      if (!detail || !detailSource) return
      setMutating(kind)
      try {
        if (detailSource === 'egg') {
          const map: Record<string, string> = {
            deposit: 'mark_deposit_paid',
            remainder: 'mark_remainder_paid',
            cancel: 'cancel_order',
            sync: 'sync_status',
          }
          await eggAction(detail.id, map[kind], kind === 'cancel' ? { releaseInventory: true } : {})
        } else {
          if (kind === 'remainder') {
            const res = await fetch(`/api/admin/chickens/orders/${detail.id}/collect-remainder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amountNok: Number.parseInt(amountNok || '0', 10),
                note: '',
                sendReceipt: true,
                locale: lang,
              }),
            })
            if (!res.ok) {
              throw new Error((await res.json().catch(() => ({})))?.error || l.failed)
            }
          } else if (kind === 'cancel') {
            await patch(`/api/admin/chickens/orders/${detail.id}`, { status: 'cancelled' }, l.failed)
          }
        }
        await after(l.updated)
      } catch (error: any) {
        toast({ title: l.failed, description: error?.message || l.failed, variant: 'destructive' })
        setMutating(null)
      }
    },
    [after, amountNok, detail, detailSource, eggAction, l.failed, l.updated, lang, patch, toast]
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{l.title}</h2>
        <p className="text-sm text-neutral-600">{l.subtitle}</p>
      </div>

      <Card className="border-neutral-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={l.search}
            />
          </div>

          <select
            className="h-10 rounded-md border border-neutral-200 px-3 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value as 'all' | Source)}
          >
            <option value="all">{l.all}</option>
            <option value="egg">{l.egg}</option>
            <option value="chicken">{l.chicken}</option>
          </select>

          <select
            className="h-10 rounded-md border border-neutral-200 px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{l.allStatuses}</option>
            {statuses
              .filter((s) => s !== 'all')
              .map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => void load(true)}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">{l.refresh}</span>
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden border-neutral-200 p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">{l.loading}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  {l.cols.map((header) => (
                    <th key={header} className="px-4 py-3 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isResending = mutating === `resend-${row.id}`
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="border-t border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="align-top px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            row.source === 'egg' ? 'bg-blue-100 text-blue-800' : 'bg-violet-100 text-violet-800'
                          )}
                        >
                          {row.source === 'egg' ? (
                            <Egg className="h-3.5 w-3.5" />
                          ) : (
                            <Bird className="h-3.5 w-3.5" />
                          )}
                          {row.source === 'egg' ? l.egg : l.chicken}
                        </span>
                      </td>
                      <td className="align-top px-4 py-3">
                        <button
                          className="text-left font-mono text-xs underline-offset-2 hover:underline"
                          onClick={() => void open(row.source, row.id)}
                        >
                          {row.orderNumber}
                        </button>
                        <div className="text-xs text-neutral-500">
                          {l.created}: {date(row.createdAt)}
                        </div>
                        <div className="text-xs text-neutral-500">{row.weekLabel}</div>
                      </td>
                      <td className="align-top px-4 py-3">
                        <div className="font-medium text-neutral-900">{row.customerName}</div>
                        <div className="text-xs text-neutral-600">{row.customerEmail}</div>
                      </td>
                      <td className="align-top px-4 py-3">
                        <div className="font-medium text-neutral-900">{row.lines[0]?.label || '-'}</div>
                        <div className="text-xs text-neutral-600">{row.lines[0]?.qty || ''}</div>
                        {row.lines.length > 1 ? <div className="text-xs text-neutral-500">+{row.lines.length - 1}</div> : null}
                      </td>
                      <td className="align-top px-4 py-3 text-xs">
                        <div>{money(row.paidOre)}</div>
                        <div className="text-neutral-500">{money(row.totalOre)}</div>
                      </td>
                      <td className="align-top px-4 py-3">
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            row.dueOre > 0 ? 'text-amber-700' : 'text-emerald-700'
                          )}
                        >
                          {money(row.dueOre)}
                        </div>
                        <div className="text-xs text-neutral-500">{date(row.dueDate)}</div>
                      </td>
                      <td className="align-top px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            row.status === 'cancelled' || row.status === 'forfeited'
                              ? 'bg-red-100 text-red-800'
                              : row.status === 'fully_paid' ||
                                  row.status === 'picked_up' ||
                                  row.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="align-top px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline" onClick={() => void open(row.source, row.id)}>
                            {l.details}
                          </Button>
                          {row.dueOre > 0 ? (
                            <Button size="sm" onClick={() => void open(row.source, row.id)}>
                              {l.collect}
                            </Button>
                          ) : null}
                          {row.source === 'chicken' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void resendChickenConfirmation(row)}
                              disabled={Boolean(mutating)}
                            >
                              {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {l.resend}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500">
                      {l.noRows}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-white text-neutral-900">
          <DialogHeader>
            <DialogTitle>
              {l.panel}
              {detail ? <span className="ml-2 font-mono text-sm text-neutral-500">{detail.orderNumber}</span> : null}
            </DialogTitle>
            <DialogDescription>{l.subtitle}</DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="py-8 text-center text-sm text-neutral-500">{l.loading}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-neutral-200 p-4">
                  <div className="space-y-2 text-sm">
                    <Field label={l.week} value={detail.weekLabel} />
                    <Field label={l.status} value={statusLabel(detail.status)} />
                    <Field label={l.due} value={money(detail.dueOre)} />
                  </div>
                </Card>

                <Card className="border-neutral-200 p-4">
                  <div className="space-y-2 text-sm">
                    {detail.lines.map((line) => (
                      <div key={line.key} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                        <div className="font-medium">{line.label}</div>
                        <div className="text-neutral-600">{line.qty}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="space-y-3 border-neutral-200 p-4">
                  <Label>{l.status}</Label>
                  <div className="flex gap-2">
                    <select
                      className="h-10 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                    >
                      {(detail.source === 'egg' ? EGG_STATUS : CHICKEN_STATUS).map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => void applyStatus()} disabled={Boolean(mutating)}>
                      {mutating === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span className="ml-2">{l.apply}</span>
                    </Button>
                  </div>

                  {detail.source === 'egg' ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button variant="outline" onClick={() => void run('deposit')} disabled={Boolean(mutating)}>
                        {l.markDeposit}
                      </Button>
                      <Button variant="outline" onClick={() => void run('sync')} disabled={Boolean(mutating)}>
                        {l.sync}
                      </Button>
                    </div>
                  ) : null}

                  {detail.source === 'chicken' ? (
                    <Button
                      variant="outline"
                      onClick={() => void resendChickenConfirmation(detail)}
                      disabled={Boolean(mutating)}
                    >
                      {mutating === `resend-${detail.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {l.resend}
                    </Button>
                  ) : null}

                  {detail.dueOre > 0 ? (
                    <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                      {detail.source === 'chicken' ? (
                        <>
                          <Label>{l.amount}</Label>
                          <Input
                            inputMode="numeric"
                            value={amountNok}
                            onChange={(e) => setAmountNok(e.target.value.replace(/[^0-9]/g, ''))}
                          />
                        </>
                      ) : null}
                      <Button onClick={() => void run('remainder')} disabled={Boolean(mutating)}>
                        {l.markRemainder}
                      </Button>
                    </div>
                  ) : null}

                  <Button
                    variant="destructive"
                    onClick={() => void run('cancel')}
                    disabled={
                      Boolean(mutating) ||
                      detail.status === 'cancelled' ||
                      detail.status === 'forfeited'
                    }
                  >
                    {l.cancel}
                  </Button>
                </Card>

                <Card className="space-y-3 border-neutral-200 p-4">
                  <Label>{l.notes}</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Label>{l.admin}</Label>
                  <Textarea rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                  <Button onClick={() => void saveNotes()} disabled={Boolean(mutating)}>
                    {l.save}
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  )
}
