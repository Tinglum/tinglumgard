
import { getSession, type SessionData } from '@/lib/auth/session'
import { dispatchEmail } from '@/lib/email/dispatch'
import { renderManagedTemplate } from '@/lib/email/render'
import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'

type WishlistSource = 'order_addon' | 'standalone'
type WishlistStatus =
  | 'open'
  | 'partially_allocated'
  | 'allocated'
  | 'closed'
  | 'cancelled'
  | 'expired'
type WishlistPriority = 'order_linked' | 'standalone'

type WishlistItemInput = {
  breedId: string
  quantity: number
}

type CreateWishlistInput = {
  inventoryId?: string
  items?: WishlistItemInput[]
  quantity?: number
  orderId?: string | null
  source?: WishlistSource
  notes?: string | null
  year?: number
  weekNumber?: number
  deliveryMonday?: string | null
}

type AdminAllocationInput = {
  allocations?: Array<{ breedId: string; quantity: number }>
  notes?: string | null
}

type CloseWishlistInput = {
  status: Extract<WishlistStatus, 'closed' | 'cancelled' | 'expired'>
  reason?: string | null
}

type ConvertWishlistInput = {
  orderId?: string | null
  notes?: string | null
}

type WishlistItemRow = {
  id: string
  breed_id: string
  qty_requested: number
  qty_allocated: number
  qty_remaining: number
  egg_breeds?: {
    id?: string
    name?: string
    slug?: string
    accent_color?: string
  } | null
}

type WishlistEventRow = {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_by: string | null
  created_at: string
}

type WishlistLinkedOrderRow = {
  id: string
  order_number: string | null
  status: string | null
  customer_name: string | null
  customer_email: string | null
}

type WishlistRequestRow = {
  id: string
  customer_id: string
  customer_email: string
  customer_name: string | null
  customer_phone: string | null
  order_id: string | null
  source: WishlistSource
  year: number
  week_number: number
  delivery_monday: string
  status: WishlistStatus
  priority: WishlistPriority
  notes: string | null
  closed_reason: string | null
  created_at: string
  updated_at: string
  egg_wishlist_items?: WishlistItemRow[]
  egg_wishlist_events?: WishlistEventRow[]
  egg_orders?: WishlistLinkedOrderRow | WishlistLinkedOrderRow[] | null
}

const REQUEST_SELECT = `
  id,
  customer_id,
  customer_email,
  customer_name,
  customer_phone,
  order_id,
  source,
  year,
  week_number,
  delivery_monday,
  status,
  priority,
  notes,
  closed_reason,
  created_at,
  updated_at,
  egg_orders (
    id,
    order_number,
    status,
    customer_name,
    customer_email
  ),
  egg_wishlist_items (
    id,
    breed_id,
    qty_requested,
    qty_allocated,
    qty_remaining,
    egg_breeds (
      id,
      name,
      slug,
      accent_color
    )
  ),
  egg_wishlist_events (
    id,
    event_type,
    payload,
    created_by,
    created_at
  )
`

const OPEN_STATUSES: WishlistStatus[] = ['open', 'partially_allocated']

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value?: string | null): string {
  return String(value || '').replace(/\s+/g, '').trim()
}

function formatDateNo(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`)
  return date.toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getLinkedOrder(request: WishlistRequestRow): WishlistLinkedOrderRow | null {
  const relation = request.egg_orders
  if (!relation) return null
  if (Array.isArray(relation)) return relation[0] || null
  return relation
}

function normalizeWishlistRequestRow(raw: any): WishlistRequestRow {
  const linkedOrder = Array.isArray(raw?.egg_orders) ? raw.egg_orders[0] || null : raw?.egg_orders || null
  return {
    ...(raw || {}),
    egg_orders: linkedOrder,
    egg_wishlist_items: Array.isArray(raw?.egg_wishlist_items) ? raw.egg_wishlist_items : [],
    egg_wishlist_events: Array.isArray(raw?.egg_wishlist_events) ? raw.egg_wishlist_events : [],
  } as WishlistRequestRow
}

function parseItemInputs(input: CreateWishlistInput, fallbackBreedId?: string | null): WishlistItemInput[] {
  const fromItems = Array.isArray(input.items)
    ? input.items
        .map((item) => ({
          breedId: String(item?.breedId || '').trim(),
          quantity: Number(item?.quantity || 0),
        }))
        .filter((item) => item.breedId && Number.isFinite(item.quantity) && item.quantity > 0)
    : []

  if (fromItems.length > 0) return fromItems
  if (!fallbackBreedId) return []
  const fallbackQty = Number(input.quantity || 1)
  if (!Number.isFinite(fallbackQty) || fallbackQty <= 0) return []
  return [{ breedId: fallbackBreedId, quantity: Math.floor(fallbackQty) }]
}

function buildOrderLinesHtml(items: WishlistItemRow[] = []): string {
  if (items.length === 0) return '<p>Ingen linjer.</p>'
  const rows = items.map((item) => {
    const breed = escapeHtml(item.egg_breeds?.name || 'Rase')
    return `<li>${breed}: ${item.qty_requested} ønsket, ${item.qty_allocated} tildelt, ${item.qty_remaining} gjenstår</li>`
  })
  return `<ul>${rows.join('')}</ul>`
}

function buildAllocatedLinesHtml(items: WishlistItemRow[] = []): string {
  const allocated = items.filter((item) => item.qty_allocated > 0)
  if (allocated.length === 0) return '<p>Ingen tildeling i denne runden.</p>'
  const rows = allocated.map((item) => {
    const breed = escapeHtml(item.egg_breeds?.name || 'Rase')
    return `<li>${breed}: ${item.qty_allocated} egg</li>`
  })
  return `<ul>${rows.join('')}</ul>`
}

function fallbackTemplate(templateKey: string, request: WishlistRequestRow): { subject: string; html: string } {
  const weekLabel = `uke ${request.week_number}`
  const dateLabel = formatDateNo(request.delivery_monday)
  const customerName = escapeHtml(request.customer_name || 'Kunde')
  const lines = buildOrderLinesHtml(request.egg_wishlist_items || [])
  if (templateKey === 'wishlist.allocated') {
    return {
      subject: `Oppdatering på ønskelisten din for ${weekLabel}`,
      html: `<h2>Vi har behandlet ønskelisten din</h2><p>Hei ${customerName},</p><p>Her er status for ${weekLabel} (${dateLabel}).</p>${lines}<p>Du kan se oppdatert status på Min side.</p>`,
    }
  }
  if (templateKey === 'wishlist.not_allocated') {
    return {
      subject: `Status på ønskelisten din for ${weekLabel}`,
      html: `<h2>Ønskelisten er avsluttet</h2><p>Hei ${customerName},</p><p>Vi fikk dessverre ikke tildelt ekstra egg for ${weekLabel} (${dateLabel}) denne gangen.</p><p>Du kan når som helst legge inn et nytt ønske for kommende uker.</p>`,
    }
  }
  return {
    subject: `Ønskelisten din er registrert for ${weekLabel}`,
    html: `<h2>Ønskeliste mottatt</h2><p>Hei ${customerName},</p><p>Vi har registrert ønskelisten din for ${weekLabel} (${dateLabel}).</p>${lines}<p>Vi oppdaterer deg så snart vi vet mer.</p>`,
  }
}

async function sendWishlistEmail(
  request: WishlistRequestRow,
  templateKey: 'wishlist.received' | 'wishlist.allocated' | 'wishlist.not_allocated',
  sourcePath: string
) {
  const toEmail = normalizeEmail(request.customer_email)
  if (!toEmail || toEmail.endsWith('@unknown.invalid')) return

  const appBaseUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || '').replace(/\/$/, '')
  const orderPath = request.order_id ? `/min-side?eggOrderId=${encodeURIComponent(request.order_id)}` : '/min-side'
  const orderUrl = appBaseUrl ? `${appBaseUrl}${orderPath}` : orderPath

  const linkedOrder = getLinkedOrder(request)
  const rendered = await renderManagedTemplate({
    templateKey,
    locale: 'no',
    variables: {
      customer_name: request.customer_name || 'Kunde',
      week_number: request.week_number,
      delivery_date: formatDateNo(request.delivery_monday),
      wishlist_lines_html: buildOrderLinesHtml(request.egg_wishlist_items || []),
      allocated_lines_html: buildAllocatedLinesHtml(request.egg_wishlist_items || []),
      order_number: linkedOrder?.order_number || '',
      request_id: request.id,
      order_url: orderUrl,
    },
  })

  const fallback = fallbackTemplate(templateKey, request)
  const subject = rendered?.subject || fallback.subject
  const html = rendered?.html || fallback.html

  const emailResult = await dispatchEmail({
    to: toEmail,
    subject,
    html,
    classification: 'transactional',
    templateKey,
    sourcePath,
    eggOrderId: request.order_id || undefined,
    productScope: 'eggs',
    entityType: 'wishlist_request',
    entityId: request.id,
    metadata: {
      wishlist_request_id: request.id,
      wishlist_source: request.source,
      week_number: request.week_number,
      year: request.year,
    },
    idempotency: {
      source: sourcePath,
      entity: 'wishlist_request',
      id: request.id,
      template: templateKey,
    },
  })

  if (!emailResult.success) {
    logError('egg-wishlist-email-send', emailResult.error || 'dispatch_failed', {
      requestId: request.id,
      templateKey,
    })
  }
}

async function appendWishlistEvent(params: {
  requestId: string
  eventType: string
  payload?: Record<string, unknown>
  createdBy?: string | null
}) {
  const { error } = await supabaseAdmin.from('egg_wishlist_events').insert({
    request_id: params.requestId,
    event_type: params.eventType,
    payload: params.payload || {},
    created_by: params.createdBy || null,
  })
  if (error) {
    logError('egg-wishlist-event-insert', error, {
      requestId: params.requestId,
      eventType: params.eventType,
    })
  }
}

async function getRequestById(requestId: string): Promise<WishlistRequestRow | null> {
  const { data, error } = await supabaseAdmin
    .from('egg_wishlist_requests')
    .select(REQUEST_SELECT)
    .eq('id', requestId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return normalizeWishlistRequestRow(data)
}

async function syncRequestStatus(requestId: string): Promise<WishlistStatus> {
  const { data: items, error } = await supabaseAdmin
    .from('egg_wishlist_items')
    .select('qty_allocated, qty_remaining')
    .eq('request_id', requestId)

  if (error) throw error

  const allDone = (items || []).every((item) => Number(item.qty_remaining || 0) <= 0)
  const anyAllocated = (items || []).some((item) => Number(item.qty_allocated || 0) > 0)
  let nextStatus: WishlistStatus = 'open'
  if (allDone) nextStatus = 'allocated'
  else if (anyAllocated) nextStatus = 'partially_allocated'

  const { error: updateError } = await supabaseAdmin
    .from('egg_wishlist_requests')
    .update({ status: nextStatus })
    .eq('id', requestId)

  if (updateError) throw updateError
  return nextStatus
}

async function findOwnedEggOrder(session: SessionData, orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, user_id, customer_name, customer_email, customer_phone, year, week_number, delivery_monday, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  if (!order) return null

  const matchesUserId = isUuid(session.userId) && order.user_id && String(order.user_id) === String(session.userId)
  const matchesEmail = normalizeEmail(session.email) && normalizeEmail(session.email) === normalizeEmail(order.customer_email)
  const matchesPhone = normalizePhone(session.phoneNumber) && normalizePhone(session.phoneNumber) === normalizePhone(order.customer_phone)

  if (!matchesUserId && !matchesEmail && !matchesPhone) return null
  return order
}

function getCustomerIdentity(
  session: SessionData,
  order?: { customer_email?: string | null; customer_name?: string | null; customer_phone?: string | null }
) {
  const email = normalizeEmail(order?.customer_email || session.email)
  const phone = normalizePhone(order?.customer_phone || session.phoneNumber)
  const customerId =
    String(session.userId || '').trim() ||
    String(session.vippsSub || '').trim() ||
    (email ? `email:${email}` : '')

  return {
    customerId: customerId || `anonymous:${Date.now()}`,
    email: email || 'wishlist@unknown.invalid',
    name: String(order?.customer_name || session.name || '').trim() || null,
    phone: phone || null,
  }
}

async function ensureRequestWithItems(params: {
  session: SessionData
  inventory: {
    id: string | null
    breed_id: string
    year: number
    week_number: number
    delivery_monday: string
    status: string
  }
  source: WishlistSource
  orderId?: string | null
  notes?: string | null
  items: WishlistItemInput[]
  createdBy?: string | null
}) {
  const order = params.orderId ? await findOwnedEggOrder(params.session, params.orderId) : null
  if (params.orderId && !order) throw new Error('ORDER_NOT_FOUND_OR_FORBIDDEN')
  if (params.source === 'order_addon' && !order) throw new Error('ORDER_REQUIRED')
  if (order) {
    if (order.year !== params.inventory.year || order.week_number !== params.inventory.week_number) {
      throw new Error('ORDER_WEEK_MISMATCH')
    }
    const nonEligibleStatuses = new Set(['cancelled', 'forfeited'])
    if (nonEligibleStatuses.has(String(order.status || '').toLowerCase())) {
      throw new Error('ORDER_NOT_ELIGIBLE')
    }
  }

  const identity = getCustomerIdentity(params.session, order || undefined)
  const priority: WishlistPriority = params.source === 'order_addon' ? 'order_linked' : 'standalone'

  let existingQuery = supabaseAdmin
    .from('egg_wishlist_requests')
    .select('id, created_at')
    .eq('year', params.inventory.year)
    .eq('week_number', params.inventory.week_number)
    .in('status', OPEN_STATUSES)

  if (params.source === 'order_addon' && order) {
    existingQuery = existingQuery.eq('order_id', order.id)
  } else {
    existingQuery = existingQuery
      .eq('source', 'standalone')
      .is('order_id', null)
      .eq('customer_id', identity.customerId)
  }

  const { data: existingRows, error: existingError } = await existingQuery
    .order('created_at', { ascending: false })
    .limit(1)
  if (existingError) throw existingError
  const existingRow = Array.isArray(existingRows) ? existingRows[0] : (existingRows as any)

  let requestId = existingRow?.id || null
  if (!requestId) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('egg_wishlist_requests')
      .insert({
        customer_id: identity.customerId,
        customer_email: identity.email,
        customer_name: identity.name,
        customer_phone: identity.phone,
        order_id: order?.id || null,
        source: params.source,
        year: params.inventory.year,
        week_number: params.inventory.week_number,
        delivery_monday: params.inventory.delivery_monday,
        status: 'open',
        priority,
        notes: params.notes || null,
      })
      .select('id')
      .single()

    if (insertError || !inserted) throw insertError || new Error('REQUEST_INSERT_FAILED')
    requestId = inserted.id
    await appendWishlistEvent({
      requestId,
      eventType: 'request_created',
      payload: {
        source: params.source,
        order_id: order?.id || null,
        inventory_id: params.inventory.id,
      },
      createdBy: params.createdBy,
    })
  } else if (params.notes) {
    await supabaseAdmin.from('egg_wishlist_requests').update({ notes: params.notes }).eq('id', requestId)
  }

  for (const item of params.items) {
    const { data: existingItem, error: existingItemError } = await supabaseAdmin
      .from('egg_wishlist_items')
      .select('id, qty_requested, qty_allocated, qty_remaining')
      .eq('request_id', requestId)
      .eq('breed_id', item.breedId)
      .maybeSingle()

    if (existingItemError) throw existingItemError

    if (existingItem) {
      const nextRequested = Number(existingItem.qty_requested || 0) + item.quantity
      const nextRemaining = Number(existingItem.qty_remaining || 0) + item.quantity
      const { error: updateError } = await supabaseAdmin
        .from('egg_wishlist_items')
        .update({ qty_requested: nextRequested, qty_remaining: nextRemaining })
        .eq('id', existingItem.id)
      if (updateError) throw updateError
    } else {
      const { error: itemInsertError } = await supabaseAdmin.from('egg_wishlist_items').insert({
        request_id: requestId,
        breed_id: item.breedId,
        qty_requested: item.quantity,
        qty_allocated: 0,
        qty_remaining: item.quantity,
      })
      if (itemInsertError) throw itemInsertError
    }
  }

  await appendWishlistEvent({
    requestId,
    eventType: 'items_upserted',
    payload: {
      items: params.items,
      source: params.source,
    },
    createdBy: params.createdBy,
  })

  const request = await getRequestById(requestId)
  if (!request) throw new Error('REQUEST_NOT_FOUND')
  return request
}

export async function createEggWishlistRequest(input: CreateWishlistInput) {
  const session = await getSession()
  if (!session) {
    return { ok: false as const, status: 401, error: 'Login required' }
  }

  const inventoryId = String(input.inventoryId || '').trim()
  const source: WishlistSource = input.orderId ? 'order_addon' : input.source || 'standalone'
  if (!['order_addon', 'standalone'].includes(source)) {
    return { ok: false as const, status: 400, error: 'Invalid source' }
  }
  if (source === 'order_addon' && !input.orderId) {
    return { ok: false as const, status: 400, error: 'Order is required for order-linked wishlist' }
  }

  let linkedOrder: Awaited<ReturnType<typeof findOwnedEggOrder>> | null = null
  if (input.orderId) {
    try {
      linkedOrder = await findOwnedEggOrder(session, input.orderId)
    } catch (error) {
      logError('egg-wishlist-create-order-lookup', error, { orderId: input.orderId })
      return { ok: false as const, status: 500, error: 'Failed to read linked order' }
    }

    if (!linkedOrder) {
      return { ok: false as const, status: 403, error: 'Order not found for current customer' }
    }
  }

  let inventoryContext:
    | {
        id: string | null
        breed_id: string
        year: number
        week_number: number
        delivery_monday: string
        status: string
      }
    | null = null

  if (inventoryId) {
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, delivery_monday, status')
      .eq('id', inventoryId)
      .maybeSingle()

    if (inventoryError) {
      logError('egg-wishlist-create-inventory', inventoryError, { inventoryId })
      return { ok: false as const, status: 500, error: 'Failed to read inventory' }
    }
    if (!inventory) {
      return { ok: false as const, status: 404, error: 'Inventory not found' }
    }

    inventoryContext = {
      id: inventory.id,
      breed_id: inventory.breed_id,
      year: inventory.year,
      week_number: inventory.week_number,
      delivery_monday: inventory.delivery_monday,
      status: inventory.status,
    }
  } else if (linkedOrder) {
    inventoryContext = {
      id: null,
      breed_id: '',
      year: linkedOrder.year,
      week_number: linkedOrder.week_number,
      delivery_monday: linkedOrder.delivery_monday,
      status: 'open',
    }
  } else {
    const year = Number(input.year)
    const weekNumber = Number(input.weekNumber)
    const deliveryMonday = String(input.deliveryMonday || '').trim()

    if (!Number.isFinite(year) || !Number.isFinite(weekNumber) || !deliveryMonday) {
      return {
        ok: false as const,
        status: 400,
        error: 'Week reference is required when inventory is missing',
      }
    }

    inventoryContext = {
      id: null,
      breed_id: '',
      year,
      week_number: weekNumber,
      delivery_monday: deliveryMonday,
      status: 'open',
    }
  }

  const items = parseItemInputs(input, inventoryContext.breed_id || null)
  if (items.length === 0) {
    return { ok: false as const, status: 400, error: 'At least one wishlist item is required' }
  }

  const uniqueItems = new Map<string, number>()
  for (const item of items) {
    if (!item.breedId || item.quantity <= 0) continue
    uniqueItems.set(item.breedId, (uniqueItems.get(item.breedId) || 0) + Math.floor(item.quantity))
  }
  const normalizedItems = Array.from(uniqueItems.entries()).map(([breedId, quantity]) => ({
    breedId,
    quantity,
  }))

  const requestedBreedIds = normalizedItems.map((item) => item.breedId)
  const { data: knownBreeds, error: knownBreedsError } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, active')
    .in('id', requestedBreedIds)

  if (knownBreedsError) {
    logError('egg-wishlist-create-breeds', knownBreedsError, {
      year: inventoryContext.year,
      week: inventoryContext.week_number,
    })
    return { ok: false as const, status: 500, error: 'Failed to validate requested breeds' }
  }

  const validBreedIds = new Set(
    (knownBreeds || [])
      .filter((breed: any) => Boolean(breed?.active))
      .map((breed: any) => String(breed.id))
  )
  const missingOrInactiveBreed = requestedBreedIds.find((breedId) => !validBreedIds.has(breedId))
  if (missingOrInactiveBreed) {
    return { ok: false as const, status: 400, error: 'One or more requested breeds are invalid' }
  }

  const { data: weekInventories, error: weekInventoriesError } = await supabaseAdmin
    .from('egg_inventory')
    .select('breed_id, status')
    .eq('year', inventoryContext.year)
    .eq('week_number', inventoryContext.week_number)
    .in('breed_id', requestedBreedIds)

  if (weekInventoriesError) {
    logError('egg-wishlist-create-week-inventories', weekInventoriesError, {
      inventoryId: inventoryContext.id,
      year: inventoryContext.year,
      week: inventoryContext.week_number,
    })
    return { ok: false as const, status: 500, error: 'Failed to validate requested breeds' }
  }

  const weekInventoryByBreed = new Map(
    (weekInventories || []).map((row) => [String(row.breed_id), String(row.status || '')])
  )
  const invalidStatus = requestedBreedIds.find((breedId) => {
    const status = weekInventoryByBreed.get(breedId)
    if (!status) return false
    return status !== 'open' && status !== 'sold_out'
  })
  if (invalidStatus) {
    return { ok: false as const, status: 400, error: 'Wishlist is not open for one or more requested breeds' }
  }

  try {
    const request = await ensureRequestWithItems({
      session,
      inventory: inventoryContext,
      source,
      orderId: input.orderId || null,
      notes: input.notes || null,
      items: normalizedItems,
      createdBy: session.name || session.email || session.userId || 'customer',
    })

    try {
      await sendWishlistEmail(request, 'wishlist.received', 'api/eggs/wishlist')
    } catch (emailError) {
      logError('egg-wishlist-create-email', emailError, { requestId: request.id })
    }

    const { count } = await supabaseAdmin
      .from('egg_wishlist_requests')
      .select('*', { count: 'exact', head: true })
      .eq('year', request.year)
      .eq('week_number', request.week_number)
      .in('status', OPEN_STATUSES)
      .lte('created_at', request.created_at)

    return {
      ok: true as const,
      status: 200,
      request,
      queuePosition: count || 1,
    }
  } catch (error) {
    if (String((error as Error)?.message || '').includes('ORDER_NOT_FOUND_OR_FORBIDDEN')) {
      return { ok: false as const, status: 403, error: 'Order not found for current customer' }
    }
    if (String((error as Error)?.message || '').includes('ORDER_REQUIRED')) {
      return { ok: false as const, status: 400, error: 'Order is required for order-linked wishlist' }
    }
    if (String((error as Error)?.message || '').includes('ORDER_WEEK_MISMATCH')) {
      return { ok: false as const, status: 400, error: 'Order week does not match wishlist week' }
    }
    if (String((error as Error)?.message || '').includes('ORDER_NOT_ELIGIBLE')) {
      return { ok: false as const, status: 400, error: 'Order is not eligible for wishlist additions' }
    }

    logError('egg-wishlist-create', error)
    return { ok: false as const, status: 500, error: 'Failed to create wishlist request' }
  }
}

export async function listMyEggWishlistRequests() {
  const session = await getSession()
  if (!session) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  const idQueries: Array<Promise<{ data: WishlistRequestRow[] | null; error: unknown }>> = []
  const userId = String(session.userId || '').trim()
  const email = normalizeEmail(session.email)
  const phone = normalizePhone(session.phoneNumber)

  if (userId) {
    idQueries.push(
      supabaseAdmin
        .from('egg_wishlist_requests')
        .select(REQUEST_SELECT)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false }) as any
    )
  }
  if (email) {
    idQueries.push(
      supabaseAdmin
        .from('egg_wishlist_requests')
        .select(REQUEST_SELECT)
        .ilike('customer_email', email)
        .order('created_at', { ascending: false }) as any
    )
  }
  if (phone) {
    idQueries.push(
      supabaseAdmin
        .from('egg_wishlist_requests')
        .select(REQUEST_SELECT)
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false }) as any
    )
  }

  if (idQueries.length === 0) {
    return { ok: true as const, status: 200, requests: [] as WishlistRequestRow[] }
  }

  const results = await Promise.all(idQueries)
  for (const result of results) {
    if (result.error) {
      logError('egg-wishlist-my-list', result.error)
      return { ok: false as const, status: 500, error: 'Failed to load wishlist' }
    }
  }

  const map = new Map<string, WishlistRequestRow>()
  for (const result of results) {
    for (const request of result.data || []) {
      const normalized = normalizeWishlistRequestRow(request)
      map.set(normalized.id, normalized)
    }
  }

  const requests = Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { ok: true as const, status: 200, requests }
}

export async function listAdminEggWishlistRequests(filters: { year?: number; weekNumber?: number }) {
  let query = supabaseAdmin
    .from('egg_wishlist_requests')
    .select(REQUEST_SELECT)
    .order('year', { ascending: true })
    .order('week_number', { ascending: true })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  if (Number.isFinite(filters.year)) query = query.eq('year', filters.year as number)
  if (Number.isFinite(filters.weekNumber)) query = query.eq('week_number', filters.weekNumber as number)

  const { data, error } = await query
  if (error) {
    logError('egg-wishlist-admin-list', error, filters)
    return { ok: false as const, status: 500, error: 'Failed to fetch wishlist requests' }
  }

  const requests = (data || []).map((row) => normalizeWishlistRequestRow(row))
  const summary = {
    total: requests.length,
    open: requests.filter((request) => request.status === 'open').length,
    partially_allocated: requests.filter((request) => request.status === 'partially_allocated').length,
    allocated: requests.filter((request) => request.status === 'allocated').length,
    closed: requests.filter((request) => ['closed', 'cancelled', 'expired'].includes(request.status)).length,
  }

  return { ok: true as const, status: 200, requests, summary }
}

function compareRequestPriority(a: WishlistRequestRow, b: WishlistRequestRow): number {
  const priorityRank = (value: WishlistPriority) => (value === 'order_linked' ? 0 : 1)
  const diff = priorityRank(a.priority) - priorityRank(b.priority)
  if (diff !== 0) return diff
  return a.created_at.localeCompare(b.created_at)
}

function sortWishlistRequestsByPriority(requests: WishlistRequestRow[]): WishlistRequestRow[] {
  return [...requests].sort(compareRequestPriority)
}

export async function generateEggWishlistProposal(params?: {
  year?: number
  weekNumber?: number
  persistEvents?: boolean
  createdBy?: string | null
}) {
  const persistEvents = params?.persistEvents !== false
  const createdBy = String(params?.createdBy || 'system').slice(0, 200)

  let targetYear = Number(params?.year)
  let targetWeek = Number(params?.weekNumber)

  if (!Number.isFinite(targetYear) || !Number.isFinite(targetWeek)) {
    const { data: earliestRequest, error: earliestError } = await supabaseAdmin
      .from('egg_wishlist_requests')
      .select('year, week_number')
      .in('status', OPEN_STATUSES)
      .order('year', { ascending: true })
      .order('week_number', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (earliestError) {
      logError('egg-wishlist-proposal-target', earliestError)
      return { ok: false as const, status: 500, error: 'Failed to resolve proposal target week' }
    }

    if (!earliestRequest) {
      return {
        ok: true as const,
        status: 200,
        summary: {
          year: null,
          weekNumber: null,
          totalRequests: 0,
          openRequests: 0,
          suggestedEggs: 0,
          suggestedRequests: 0,
        },
        requests: [],
      }
    }

    targetYear = Number(earliestRequest.year)
    targetWeek = Number(earliestRequest.week_number)
  }

  const { data: openRequestsRaw, error: openRequestsError } = await supabaseAdmin
    .from('egg_wishlist_requests')
    .select(REQUEST_SELECT)
    .eq('year', targetYear)
    .eq('week_number', targetWeek)
    .in('status', OPEN_STATUSES)

  if (openRequestsError) {
    logError('egg-wishlist-proposal-requests', openRequestsError, {
      year: targetYear,
      week: targetWeek,
    })
    return { ok: false as const, status: 500, error: 'Failed to load wishlist requests for proposal' }
  }

  const openRequests = sortWishlistRequestsByPriority(
    (openRequestsRaw || []).map((row) => normalizeWishlistRequestRow(row))
  )
  if (openRequests.length === 0) {
    return {
      ok: true as const,
      status: 200,
      summary: {
        year: targetYear,
        weekNumber: targetWeek,
        totalRequests: 0,
        openRequests: 0,
        suggestedEggs: 0,
        suggestedRequests: 0,
      },
      requests: [],
    }
  }

  const breedIds = Array.from(
    new Set(
      openRequests.flatMap((request) => (request.egg_wishlist_items || []).map((item) => String(item.breed_id || '')))
    )
  ).filter(Boolean)

  const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, breed_id, eggs_available, eggs_allocated, status')
    .eq('year', targetYear)
    .eq('week_number', targetWeek)
    .in('breed_id', breedIds)

  if (inventoryError) {
    logError('egg-wishlist-proposal-inventory', inventoryError, {
      year: targetYear,
      week: targetWeek,
    })
    return { ok: false as const, status: 500, error: 'Failed to load inventory for proposal' }
  }

  const inventoryByBreed = new Map<string, { id: string; available: number; status: string }>()
  for (const row of inventoryRows || []) {
    const available = Math.max(0, Number(row.eggs_available || 0) - Number(row.eggs_allocated || 0))
    inventoryByBreed.set(String(row.breed_id), {
      id: String(row.id),
      available,
      status: String(row.status || ''),
    })
  }

  const poolByBreed = new Map<string, number>()
  for (const breedId of breedIds) {
    poolByBreed.set(breedId, inventoryByBreed.get(breedId)?.available || 0)
  }

  const proposals = openRequests.map((request) => {
    const items = (request.egg_wishlist_items || []).map((item) => {
      const requested = Math.max(0, Number(item.qty_remaining || 0))
      const inventory = inventoryByBreed.get(String(item.breed_id))
      const poolBefore = poolByBreed.get(String(item.breed_id)) || 0
      const eligibleInventory = inventory && ['open', 'sold_out'].includes(String(inventory.status))

      let allocatedSuggestion = 0
      let reason: string | null = null

      if (!inventory) {
        reason = 'no_inventory'
      } else if (!eligibleInventory) {
        reason = 'inventory_closed'
      } else if (requested <= 0) {
        reason = 'nothing_remaining'
      } else if (poolBefore <= 0) {
        reason = 'no_inventory'
      } else {
        allocatedSuggestion = Math.min(requested, poolBefore)
      }

      if (allocatedSuggestion > 0) {
        poolByBreed.set(String(item.breed_id), Math.max(0, poolBefore - allocatedSuggestion))
      }

      return {
        item_id: item.id,
        breed_id: item.breed_id,
        requested: requested,
        suggested: allocatedSuggestion,
        remaining_after_suggestion: Math.max(0, requested - allocatedSuggestion),
        reason: reason,
      }
    })

    const suggestedTotal = items.reduce((sum, item) => sum + Number(item.suggested || 0), 0)
    const requestedTotal = items.reduce((sum, item) => sum + Number(item.requested || 0), 0)
    const statusPreview =
      suggestedTotal <= 0
        ? 'no_inventory'
        : suggestedTotal < requestedTotal
          ? 'partially_allocated'
          : 'fully_allocated'

    return {
      request_id: request.id,
      order_id: request.order_id,
      source: request.source,
      priority: request.priority,
      customer_email: request.customer_email,
      customer_name: request.customer_name,
      status_preview: statusPreview,
      requested_total: requestedTotal,
      suggested_total: suggestedTotal,
      items,
    }
  })

  if (persistEvents) {
    for (const proposal of proposals) {
      await appendWishlistEvent({
        requestId: proposal.request_id,
        eventType: 'proposal_generated',
        payload: {
          year: targetYear,
          week_number: targetWeek,
          source: proposal.source,
          priority: proposal.priority,
          status_preview: proposal.status_preview,
          requested_total: proposal.requested_total,
          suggested_total: proposal.suggested_total,
          items: proposal.items,
        },
        createdBy,
      })
    }
  }

  const suggestedEggs = proposals.reduce((sum, proposal) => sum + Number(proposal.suggested_total || 0), 0)
  const suggestedRequests = proposals.filter((proposal) => Number(proposal.suggested_total || 0) > 0).length

  return {
    ok: true as const,
    status: 200,
    summary: {
      year: targetYear,
      weekNumber: targetWeek,
      totalRequests: openRequests.length,
      openRequests: openRequests.length,
      suggestedEggs,
      suggestedRequests,
    },
    requests: proposals,
    inventoryPool: Object.fromEntries(poolByBreed.entries()),
  }
}

export async function allocateEggWishlistRequest(requestId: string, input: AdminAllocationInput, actor: SessionData) {
  const request = await getRequestById(requestId)
  if (!request) return { ok: false as const, status: 404, error: 'Request not found' }
  if (!OPEN_STATUSES.includes(request.status)) {
    return { ok: false as const, status: 400, error: 'Request is not open for allocation' }
  }

  const requestedByBreed = new Map<string, number>()
  for (const item of request.egg_wishlist_items || []) {
    requestedByBreed.set(item.breed_id, Number(item.qty_remaining || 0))
  }

  const manualAllocations = new Map<string, number>()
  for (const allocation of input.allocations || []) {
    const breedId = String(allocation?.breedId || '').trim()
    const quantity = Math.max(0, Math.floor(Number(allocation?.quantity || 0)))
    if (!breedId || quantity <= 0) continue
    manualAllocations.set(breedId, quantity)
  }

  const breedIds = Array.from(requestedByBreed.keys())
  const { data: inventories, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, breed_id, eggs_available, eggs_allocated, status')
    .eq('year', request.year)
    .eq('week_number', request.week_number)
    .in('breed_id', breedIds)

  if (inventoryError) {
    logError('egg-wishlist-allocate-inventory', inventoryError, { requestId })
    return { ok: false as const, status: 500, error: 'Failed to read inventory' }
  }

  const inventoryByBreed = new Map<string, any>()
  for (const row of inventories || []) inventoryByBreed.set(String(row.breed_id), row)

  const allocationSummary: Array<{
    breed_id: string
    requested: number
    allocated: number
    skipped_reason?: string
  }> = []

  for (const [breedId, qtyRemaining] of Array.from(requestedByBreed.entries())) {
    if (qtyRemaining <= 0) continue
    const inventory = inventoryByBreed.get(breedId)
    if (!inventory) {
      allocationSummary.push({ breed_id: breedId, requested: qtyRemaining, allocated: 0, skipped_reason: 'no_inventory' })
      continue
    }

    if (!['open', 'sold_out'].includes(String(inventory.status))) {
      allocationSummary.push({ breed_id: breedId, requested: qtyRemaining, allocated: 0, skipped_reason: 'inventory_closed' })
      continue
    }

    const desired = manualAllocations.has(breedId)
      ? Math.min(qtyRemaining, manualAllocations.get(breedId) || 0)
      : qtyRemaining
    if (desired <= 0) continue

    const available = Math.max(0, Number(inventory.eggs_available || 0) - Number(inventory.eggs_allocated || 0))
    const granted = Math.min(desired, available)
    if (granted <= 0) {
      allocationSummary.push({ breed_id: breedId, requested: desired, allocated: 0, skipped_reason: 'no_inventory' })
      continue
    }

    const nextAllocated = Number(inventory.eggs_allocated || 0) + granted
    const remainingAfter = Number(inventory.eggs_available || 0) - nextAllocated
    const nextStatus = remainingAfter <= 0 ? 'sold_out' : inventory.status === 'sold_out' ? 'open' : inventory.status

    const { error: inventoryUpdateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({ eggs_allocated: nextAllocated, status: nextStatus })
      .eq('id', inventory.id)

    if (inventoryUpdateError) {
      logError('egg-wishlist-allocate-inventory-update', inventoryUpdateError, { requestId, breedId })
      return { ok: false as const, status: 500, error: 'Failed to allocate inventory' }
    }

    const currentItem = (request.egg_wishlist_items || []).find((item) => item.breed_id === breedId)
    if (!currentItem) continue
    const nextItemAllocated = Number(currentItem.qty_allocated || 0) + granted
    const nextItemRemaining = Math.max(0, Number(currentItem.qty_remaining || 0) - granted)
    const { error: itemUpdateError } = await supabaseAdmin
      .from('egg_wishlist_items')
      .update({ qty_allocated: nextItemAllocated, qty_remaining: nextItemRemaining })
      .eq('id', currentItem.id)
    if (itemUpdateError) {
      logError('egg-wishlist-allocate-item-update', itemUpdateError, { requestId, breedId })
      return { ok: false as const, status: 500, error: 'Failed to update wishlist item' }
    }

    allocationSummary.push({ breed_id: breedId, requested: desired, allocated: granted })
  }

  const nextStatus = await syncRequestStatus(requestId)
  await appendWishlistEvent({
    requestId,
    eventType: 'allocated',
    payload: {
      allocations: allocationSummary,
      notes: input.notes || null,
      next_status: nextStatus,
    },
    createdBy: actor.name || actor.email || actor.userId || 'admin',
  })

  const updated = await getRequestById(requestId)
  if (!updated) {
    return { ok: false as const, status: 500, error: 'Failed to reload request' }
  }

  const allocatedAny = allocationSummary.some((row) => row.allocated > 0)
  if (allocatedAny) {
    await sendWishlistEmail(updated, 'wishlist.allocated', 'api/admin/eggs/wishlist/allocate')
  }

  return {
    ok: true as const,
    status: 200,
    request: updated,
    summary: allocationSummary,
  }
}

export async function closeEggWishlistRequest(requestId: string, input: CloseWishlistInput, actor: SessionData) {
  const request = await getRequestById(requestId)
  if (!request) {
    return { ok: false as const, status: 404, error: 'Request not found' }
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_wishlist_requests')
    .update({
      status: input.status,
      closed_reason: input.reason || null,
    })
    .eq('id', requestId)

  if (updateError) {
    logError('egg-wishlist-close', updateError, { requestId })
    return { ok: false as const, status: 500, error: 'Failed to close request' }
  }

  await appendWishlistEvent({
    requestId,
    eventType: 'closed',
    payload: {
      status: input.status,
      reason: input.reason || null,
    },
    createdBy: actor.name || actor.email || actor.userId || 'admin',
  })

  const updated = await getRequestById(requestId)
  if (!updated) {
    return { ok: false as const, status: 500, error: 'Failed to reload request' }
  }

  const hasRemaining = (updated.egg_wishlist_items || []).some((item) => Number(item.qty_remaining || 0) > 0)
  if (hasRemaining && (input.status === 'closed' || input.status === 'expired')) {
    await sendWishlistEmail(updated, 'wishlist.not_allocated', 'api/admin/eggs/wishlist/close')
  }

  return { ok: true as const, status: 200, request: updated }
}

export async function convertEggWishlistToOrderLines(
  requestId: string,
  input: ConvertWishlistInput,
  actor: SessionData
) {
  const request = await getRequestById(requestId)
  if (!request) {
    return { ok: false as const, status: 404, error: 'Request not found' }
  }

  const { data: alreadyConverted, error: conversionCheckError } = await supabaseAdmin
    .from('egg_wishlist_events')
    .select('id')
    .eq('request_id', requestId)
    .eq('event_type', 'converted_to_order_lines')
    .limit(1)

  if (conversionCheckError) {
    logError('egg-wishlist-convert-check', conversionCheckError, { requestId })
    return { ok: false as const, status: 500, error: 'Failed to validate conversion state' }
  }
  if ((alreadyConverted || []).length > 0) {
    return { ok: false as const, status: 409, error: 'Request already converted to order lines' }
  }

  const orderId = String(input.orderId || request.order_id || '').trim()
  if (!orderId) {
    return { ok: false as const, status: 400, error: 'Order is required for conversion' }
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, status, year, week_number, subtotal, delivery_fee, total_amount, deposit_amount, remainder_amount')
    .eq('id', orderId)
    .maybeSingle()
  if (orderError || !order) {
    return { ok: false as const, status: 404, error: 'Order not found' }
  }
  if (order.year !== request.year || order.week_number !== request.week_number) {
    return { ok: false as const, status: 400, error: 'Order week does not match wishlist week' }
  }

  const allocatedItems = (request.egg_wishlist_items || []).filter((item) => Number(item.qty_allocated || 0) > 0)
  if (allocatedItems.length === 0) {
    return { ok: false as const, status: 400, error: 'No allocated eggs to convert' }
  }

  const convertedRows: Array<{ breed_id: string; inventory_id: string; quantity: number; subtotal: number }> = []
  for (const item of allocatedItems) {
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, egg_breeds(price_per_egg)')
      .eq('year', request.year)
      .eq('week_number', request.week_number)
      .eq('breed_id', item.breed_id)
      .maybeSingle()

    if (inventoryError || !inventory) {
      return { ok: false as const, status: 400, error: 'Missing inventory for one or more allocated breeds' }
    }

    const quantity = Number(item.qty_allocated || 0)
    if (quantity <= 0) continue
    const pricePerEgg = Number((inventory as any).egg_breeds?.price_per_egg || 0)
    const subtotal = quantity * pricePerEgg

    const { data: existingAddition, error: additionLookupError } = await supabaseAdmin
      .from('egg_order_additions')
      .select('id, quantity, subtotal')
      .eq('egg_order_id', orderId)
      .eq('inventory_id', inventory.id)
      .maybeSingle()

    if (additionLookupError) {
      return { ok: false as const, status: 500, error: 'Failed to inspect existing order additions' }
    }

    if (existingAddition) {
      const { error: additionUpdateError } = await supabaseAdmin
        .from('egg_order_additions')
        .update({
          quantity: Number(existingAddition.quantity || 0) + quantity,
          subtotal: Number(existingAddition.subtotal || 0) + subtotal,
        })
        .eq('id', existingAddition.id)

      if (additionUpdateError) {
        return { ok: false as const, status: 500, error: 'Failed to update addition line' }
      }
    } else {
      const { error: additionInsertError } = await supabaseAdmin.from('egg_order_additions').insert({
        egg_order_id: orderId,
        breed_id: item.breed_id,
        inventory_id: inventory.id,
        quantity,
        price_per_egg: pricePerEgg,
        subtotal,
      })

      if (additionInsertError) {
        return { ok: false as const, status: 500, error: 'Failed to insert addition line' }
      }
    }

    convertedRows.push({
      breed_id: item.breed_id,
      inventory_id: inventory.id,
      quantity,
      subtotal,
    })
  }

  const { data: additions, error: additionsError } = await supabaseAdmin
    .from('egg_order_additions')
    .select('subtotal')
    .eq('egg_order_id', orderId)

  if (additionsError) {
    return { ok: false as const, status: 500, error: 'Failed to recalculate order totals' }
  }

  const additionsTotal = (additions || []).reduce((sum, row: any) => sum + Number(row.subtotal || 0), 0)
  const baseTotal = Number(order.subtotal || 0) + Number(order.delivery_fee || 0)
  const nextTotal = baseTotal + additionsTotal
  const nextRemainder = Math.max(0, nextTotal - Number(order.deposit_amount || 0))

  const { data: remainderPayments } = await supabaseAdmin
    .from('egg_payments')
    .select('amount_nok, status')
    .eq('egg_order_id', orderId)
    .eq('payment_type', 'remainder')
    .eq('status', 'completed')

  const paidRemainderOre =
    (remainderPayments || []).reduce((sum, payment: any) => sum + Number(payment.amount_nok || 0) * 100, 0) || 0
  const nextStatus = paidRemainderOre >= nextRemainder ? 'fully_paid' : 'deposit_paid'

  const { error: orderUpdateError } = await supabaseAdmin
    .from('egg_orders')
    .update({
      total_amount: nextTotal,
      remainder_amount: nextRemainder,
      status: nextStatus,
    })
    .eq('id', orderId)

  if (orderUpdateError) {
    return { ok: false as const, status: 500, error: 'Failed to update order totals' }
  }

  await appendWishlistEvent({
    requestId,
    eventType: 'converted_to_order_lines',
    payload: {
      order_id: orderId,
      rows: convertedRows,
      notes: input.notes || null,
    },
    createdBy: actor.name || actor.email || actor.userId || 'admin',
  })

  if (request.status === 'allocated' || request.status === 'partially_allocated' || request.status === 'open') {
    await supabaseAdmin.from('egg_wishlist_requests').update({ status: 'closed' }).eq('id', requestId)
  }

  const updated = await getRequestById(requestId)
  return {
    ok: true as const,
    status: 200,
    request: updated,
    converted_rows: convertedRows,
  }
}
