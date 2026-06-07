'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type WishlistItem = {
  id: string
  breed_id: string
  qty_requested: number
  qty_allocated: number
  qty_remaining: number
  egg_breeds?: { name?: string | null } | null
}

type WishlistEvent = {
  id: string
  event_type: string
  payload?: Record<string, unknown>
  created_at: string
}

type WishlistRequest = {
  id: string
  year: number
  week_number: number
  delivery_monday: string
  status: 'open' | 'partially_allocated' | 'allocated' | 'closed' | 'cancelled' | 'expired'
  source: 'order_addon' | 'standalone'
  priority: 'order_linked' | 'standalone'
  customer_name: string | null
  customer_email: string
  order_id: string | null
  egg_orders?: { order_number?: string | null } | null
  egg_wishlist_items?: WishlistItem[]
  egg_wishlist_events?: WishlistEvent[]
}

type ProposalItem = {
  item_id: string
  breed_id: string
  suggested: number
  reason: string | null
}

type ProposalRequest = {
  request_id: string
  status_preview: 'no_inventory' | 'partially_allocated' | 'fully_allocated'
  requested_total: number
  suggested_total: number
  items: ProposalItem[]
}

type ProposalSummary = {
  year: number | null
  weekNumber: number | null
  suggestedEggs: number
  suggestedRequests: number
}

const statusBadgeClass = (status: WishlistRequest['status']) => {
  if (status === 'allocated') return 'bg-emerald-100 text-emerald-800'
  if (status === 'partially_allocated') return 'bg-amber-100 text-amber-800'
  if (status === 'open') return 'bg-blue-100 text-blue-800'
  return 'bg-neutral-100 text-neutral-700'
}

const statusLabel = (status: WishlistRequest['status'], lang: 'no' | 'en') => {
  if (lang === 'no') {
    if (status === 'open') return 'Åpen'
    if (status === 'partially_allocated') return 'Delvis tildelt'
    if (status === 'allocated') return 'Tildelt'
    if (status === 'closed') return 'Lukket'
    if (status === 'cancelled') return 'Avbrutt'
    if (status === 'expired') return 'Utløpt'
  }
  if (status === 'open') return 'Open'
  if (status === 'partially_allocated') return 'Partially allocated'
  if (status === 'allocated') return 'Allocated'
  if (status === 'closed') return 'Closed'
  if (status === 'cancelled') return 'Cancelled'
  return 'Expired'
}

const reasonLabel = (reason: string | null, lang: 'no' | 'en') => {
  if (!reason) return null
  if (lang === 'no') {
    if (reason === 'no_inventory') return 'Ingen lager'
    if (reason === 'inventory_closed') return 'Lager lukket'
    if (reason === 'nothing_remaining') return 'Ingen rest'
  }
  if (reason === 'no_inventory') return 'No inventory'
  if (reason === 'inventory_closed') return 'Inventory closed'
  if (reason === 'nothing_remaining') return 'Nothing remaining'
  return reason
}

export function EggWishlistManager() {
  const { lang } = useLanguage()
  const { toast } = useToast()
  const [year, setYear] = useState('')
  const [week, setWeek] = useState('')
  const [requests, setRequests] = useState<WishlistRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [proposalRunning, setProposalRunning] = useState(false)
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null)
  const [convertOrderIds, setConvertOrderIds] = useState<Record<string, string>>({})
  const [proposalSummary, setProposalSummary] = useState<ProposalSummary | null>(null)
  const [proposalByRequest, setProposalByRequest] = useState<Record<string, ProposalRequest>>({})

  const summary = useMemo(
    () => ({
      total: requests.length,
      open: requests.filter((request) => request.status === 'open').length,
      partial: requests.filter((request) => request.status === 'partially_allocated').length,
      allocated: requests.filter((request) => request.status === 'allocated').length,
    }),
    [requests]
  )

  const fetchData = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true)
      else setLoading(true)
      try {
        const search = new URLSearchParams()
        if (year.trim()) search.set('year', year.trim())
        if (week.trim()) search.set('week', week.trim())
        const response = await fetch(`/api/admin/eggs/wishlist${search.toString() ? `?${search}` : ''}`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Failed to load wishlist requests')
        const nextRequests: WishlistRequest[] = Array.isArray(payload?.requests) ? payload.requests : []
        setRequests(nextRequests)

        const proposalMap: Record<string, ProposalRequest> = {}
        for (const request of nextRequests) {
          const latestProposal = [...(request.egg_wishlist_events || [])]
            .filter((event) => event.event_type === 'proposal_generated')
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
          const raw = latestProposal?.payload
          if (!raw) continue
          proposalMap[request.id] = {
            request_id: request.id,
            status_preview: String(raw.status_preview || 'no_inventory') as ProposalRequest['status_preview'],
            requested_total: Number(raw.requested_total || 0),
            suggested_total: Number(raw.suggested_total || 0),
            items: Array.isArray(raw.items) ? (raw.items as ProposalItem[]) : [],
          }
        }
        setProposalByRequest((current) => ({ ...current, ...proposalMap }))
      } catch (error: any) {
        toast({
          title: lang === 'no' ? 'Kunne ikke laste ønskeliste' : 'Could not load wishlist',
          description: error?.message || '',
          variant: 'destructive',
        })
      } finally {
        if (background) setRefreshing(false)
        else setLoading(false)
      }
    },
    [lang, toast, week, year]
  )

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const runProposal = useCallback(async () => {
    setProposalRunning(true)
    try {
      const response = await fetch('/api/admin/eggs/wishlist/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: year.trim() ? Number(year.trim()) : undefined,
          week: week.trim() ? Number(week.trim()) : undefined,
          persistEvents: true,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to generate proposal')
      const proposals = Array.isArray(payload?.requests) ? (payload.requests as ProposalRequest[]) : []
      setProposalByRequest((current) => {
        const next = { ...current }
        for (const proposal of proposals) next[proposal.request_id] = proposal
        return next
      })
      setProposalSummary((payload?.summary as ProposalSummary) || null)
      toast({
        title: lang === 'no' ? 'Mandagsforslag generert' : 'Monday proposal generated',
        description:
          lang === 'no'
            ? `${payload?.summary?.suggestedEggs || 0} egg foreslått fordelt.`
            : `${payload?.summary?.suggestedEggs || 0} eggs suggested for allocation.`,
      })
      await fetchData(true)
    } catch (error: any) {
      toast({
        title: lang === 'no' ? 'Kunne ikke generere forslag' : 'Could not generate proposal',
        description: error?.message || '',
        variant: 'destructive',
      })
    } finally {
      setProposalRunning(false)
    }
  }, [fetchData, lang, toast, week, year])

  const doRequestAction = useCallback(
    async (requestId: string, endpoint: 'allocate' | 'convert-to-order-lines' | 'close', payload: Record<string, unknown>) => {
      setBusyRequestId(requestId)
      try {
        const response = await fetch(`/api/admin/eggs/wishlist/${requestId}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Request failed')
        await fetchData(true)
      } finally {
        setBusyRequestId(null)
      }
    },
    [fetchData]
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{lang === 'no' ? 'Egg ønskeliste' : 'Egg wishlist'}</h2>
        <p className="text-sm text-neutral-600">
          {lang === 'no'
            ? 'Her vises bare frittstående ønskelister uten tilknyttet ordre. Ordreknyttede ønsker håndteres fra ordremodalene.'
            : 'Only standalone wishlist requests without a linked order are shown here. Order-linked requests are handled from the order modals.'}
        </p>
      </div>

      <Card className="border-neutral-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 w-24"><Label>{lang === 'no' ? 'År' : 'Year'}</Label><Input value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))} /></div>
          <div className="min-w-0 w-20"><Label>{lang === 'no' ? 'Uke' : 'Week'}</Label><Input value={week} onChange={(e) => setWeek(e.target.value.replace(/[^0-9]/g, ''))} /></div>
          <Button variant="outline" onClick={() => void fetchData(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">{lang === 'no' ? 'Oppdater' : 'Refresh'}</span>
          </Button>
          <Button onClick={() => void runProposal()} disabled={proposalRunning}>
            {proposalRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}<span className="ml-2">{lang === 'no' ? 'Generer mandagsforslag' : 'Generate Monday proposal'}</span>
          </Button>
          <div className="ml-auto text-xs text-neutral-500">{summary.total} total • {summary.open} open • {summary.partial} partial • {summary.allocated} allocated</div>
        </div>
      </Card>

      {proposalSummary ? (
        <Card className="border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900">
          {lang === 'no'
            ? `Uke ${proposalSummary.weekNumber}/${proposalSummary.year}: ${proposalSummary.suggestedEggs} egg foreslått fordelt på ${proposalSummary.suggestedRequests} forespørsler`
            : `Week ${proposalSummary.weekNumber}/${proposalSummary.year}: ${proposalSummary.suggestedEggs} eggs suggested across ${proposalSummary.suggestedRequests} requests`}
        </Card>
      ) : null}

      <Card className="overflow-hidden border-neutral-200 p-0">
        {loading ? <div className="p-8 text-center text-sm text-neutral-500">{lang === 'no' ? 'Laster ønskelister...' : 'Loading wishlists...'}</div> : null}
        {!loading && requests.length === 0 ? <div className="p-8 text-center text-sm text-neutral-500">{lang === 'no' ? 'Ingen ønskelister funnet.' : 'No wishlist requests found.'}</div> : null}
        {!loading && requests.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {requests.map((request) => {
              const proposal = proposalByRequest[request.id]
              const isBusy = busyRequestId === request.id
              const allocations = (proposal?.items || [])
                .filter((item) => Number(item.suggested || 0) > 0)
                .map((item) => ({ breedId: item.breed_id, quantity: Number(item.suggested || 0) }))
              const fallbackAllocations = (request.egg_wishlist_items || [])
                .filter((item) => Number(item.qty_remaining || 0) > 0)
                .map((item) => ({ breedId: item.breed_id, quantity: Number(item.qty_remaining || 0) }))
              return (
                <div key={request.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <div className="font-medium text-neutral-900">{request.customer_name || request.customer_email}</div>
                      <div className="text-xs text-neutral-500">{request.customer_email} • {lang === 'no' ? 'Uke' : 'Week'} {request.week_number}/{request.year}{request.egg_orders?.order_number ? ` • ${request.egg_orders.order_number}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(request.status)}`}>{statusLabel(request.status, lang)}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{request.priority}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(request.egg_wishlist_items || []).map((item) => {
                      const proposalItem = proposal?.items?.find((candidate) => candidate.breed_id === item.breed_id)
                      return (
                        <div key={item.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                          <div className="font-medium text-neutral-900">{item.egg_breeds?.name || item.breed_id}</div>
                          <div className="text-neutral-600">{lang === 'no' ? `Ønsket ${item.qty_requested} • Tildelt ${item.qty_allocated} • Gjenstår ${item.qty_remaining}` : `Wanted ${item.qty_requested} • Allocated ${item.qty_allocated} • Remaining ${item.qty_remaining}`}</div>
                          {proposalItem ? <div className="mt-1 text-xs text-blue-800">{lang === 'no' ? 'Forslag' : 'Suggested'}: {proposalItem.suggested}{reasonLabel(proposalItem.reason, lang) ? ` • ${reasonLabel(proposalItem.reason, lang)}` : ''}</div> : null}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input className="max-w-md" placeholder={lang === 'no' ? 'Ordre-ID for konvertering (UUID)' : 'Order ID for conversion (UUID)'} value={convertOrderIds[request.id] || ''} onChange={(e) => setConvertOrderIds((prev) => ({ ...prev, [request.id]: e.target.value }))} />
                    <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void doRequestAction(request.id, 'allocate', { allocations: allocations.length > 0 ? allocations : fallbackAllocations })}>{isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{lang === 'no' ? 'Tildel' : 'Allocate'}</Button>
                    <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void doRequestAction(request.id, 'convert-to-order-lines', { orderId: (convertOrderIds[request.id] || '').trim() || request.order_id })}>{lang === 'no' ? 'Konverter til ordrelinjer' : 'Convert to order lines'}</Button>
                    <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void doRequestAction(request.id, 'close', { status: 'closed', reason: 'manual_close_admin' })}>{lang === 'no' ? 'Lukk' : 'Close'}</Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
