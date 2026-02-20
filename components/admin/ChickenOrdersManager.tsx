'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw } from 'lucide-react'

interface ChickenOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  quantity_hens: number
  quantity_roosters: number
  pickup_year: number
  pickup_week: number
  age_weeks_at_pickup: number
  price_per_hen_nok: number
  subtotal_nok: number
  delivery_fee_nok: number
  total_amount_nok: number
  deposit_amount_nok: number
  remainder_amount_nok: number
  delivery_method: string
  status: string
  admin_notes: string
  created_at: string
  chicken_breeds?: { name: string; slug: string; accent_color: string }
  chicken_hatches?: { hatch_date: string }
  chicken_payments?: Array<{ payment_type: string; status: string; amount_nok: number }>
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'pending', label: 'Venter' },
  { value: 'deposit_paid', label: 'Forskudd betalt' },
  { value: 'fully_paid', label: 'Fullt betalt' },
  { value: 'ready_for_pickup', label: 'Klar for henting' },
  { value: 'picked_up', label: 'Hentet' },
  { value: 'cancelled', label: 'Kansellert' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-blue-100 text-blue-800',
  fully_paid: 'bg-green-100 text-green-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['deposit_paid', 'cancelled'],
  deposit_paid: ['fully_paid', 'cancelled'],
  fully_paid: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up'],
  picked_up: [],
  cancelled: [],
}

export function ChickenOrdersManager() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<ChickenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/chickens/orders')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke hente bestillinger', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Oppdatert', description: `Status endret til ${newStatus}` })
      fetchOrders()
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke oppdatere status', variant: 'destructive' })
    }
  }

  const filtered = orders.filter((order) => {
    const matchesSearch = !searchTerm ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="py-8 text-center text-gray-500">Laster bestillinger...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder="Sok bestilling, kunde..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="rounded-md border px-3 py-2 text-sm" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} bestillinger</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 pr-3">Bestilling</th>
              <th className="pb-2 pr-3">Kunde</th>
              <th className="pb-2 pr-3">Rase</th>
              <th className="pb-2 pr-3">Antall</th>
              <th className="pb-2 pr-3">Henting</th>
              <th className="pb-2 pr-3">Alder</th>
              <th className="pb-2 pr-3">Pris/hone</th>
              <th className="pb-2 pr-3">Totalt</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Handling</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const transitions = STATUS_TRANSITIONS[order.status] || []
              return (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-xs">{order.order_number}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">{order.customer_email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: order.chicken_breeds?.accent_color || '#ccc' }} />
                      {order.chicken_breeds?.name || '-'}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {order.quantity_hens}H
                    {order.quantity_roosters > 0 && <span className="text-gray-500"> +{order.quantity_roosters}R</span>}
                  </td>
                  <td className="py-2 pr-3">Uke {order.pickup_week}/{order.pickup_year}</td>
                  <td className="py-2 pr-3">{order.age_weeks_at_pickup}u</td>
                  <td className="py-2 pr-3">kr {order.price_per_hen_nok}</td>
                  <td className="py-2 pr-3 font-medium">kr {order.total_amount_nok}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {transitions.length > 0 && (
                      <select className="text-xs border rounded px-1 py-0.5"
                        defaultValue="" onChange={(e) => { if (e.target.value) handleStatusChange(order.id, e.target.value) }}>
                        <option value="" disabled>Endre...</option>
                        {transitions.map((t) => (
                          <option key={t} value={t}>{STATUS_OPTIONS.find(s => s.value === t)?.label || t}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
