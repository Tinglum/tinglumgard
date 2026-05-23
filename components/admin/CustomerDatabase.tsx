'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bird,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Truck,
  Unlock,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type OrderSource = 'pig' | 'egg' | 'chicken';

type EggInventoryOption = {
  id: string;
  year: number;
  week_number: number;
  delivery_monday: string;
  eggs_available: number;
  eggs_allocated: number;
  egg_breeds: { id: string; name: string; price_per_egg: number } | null;
};

type Customer = {
  customer_id: string;
  email: string;
  name: string;
  phone: string | null;
  first_order_date: string;
  last_order_date: string;
  total_orders: number;
  completed_orders: number;
  total_spent: number;
  lifetime_value: number;
  at_risk: boolean;
};

type CustomerOrderSummary = {
  order_id: string;
  order_number: string;
  source: OrderSource;
  status: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  details?: Record<string, unknown>;
};

type CommunicationHistoryItem = {
  id: string;
  source: 'email_dispatch_queue' | 'legacy_email_log';
  classification: string;
  status: string;
  subject: string;
  templateKey: string | null;
  toEmail?: string | null;
  sourcePath?: string | null;
  lastError?: string | null;
  orderRefs?: {
    orderId?: string | null;
    eggOrderId?: string | null;
    chickenOrderId?: string | null;
    campaignId?: string | null;
  };
  sentAt: string | null;
  createdAt: string | null;
};

type CommunicationPreviewItem = {
  id: string;
  source: 'email_dispatch_queue' | 'legacy_email_log' | 'email_flow_instance';
  classification: string;
  status: string;
  subject: string;
  templateKey: string | null;
  toEmail: string | null;
  sourcePath: string | null;
  lastError: string | null;
  sentAt: string | null;
  scheduledFor?: string | null;
  createdAt: string | null;
  html: string;
  text?: string | null;
  orderRefs?: {
    orderId?: string | null;
    eggOrderId?: string | null;
    chickenOrderId?: string | null;
    campaignId?: string | null;
  };
  scheduleReason?: {
    flowKey?: string | null;
    eventType?: string | null;
    templateKey?: string | null;
    productScope?: string | null;
    triggerDateKey?: string | null;
    triggerOffsetDays?: number | null;
    condition?: string | null;
  } | null;
};

type ScheduledCommunicationItem = {
  id: string;
  flow_key: string;
  template_key?: string | null;
  event_type?: string | null;
  product_scope?: string | null;
  entity_type: string;
  entity_id: string;
  order_number?: string | null;
  order_source?: OrderSource | null;
  trigger_date_key: string;
  status: string;
  to_email?: string | null;
  scheduled_for?: string | null;
  created_at?: string | null;
  last_error?: string | null;
  queue_id?: string | null;
};

type WishlistRequestItem = {
  id: string;
  breed_id: string | null;
  breed_name: string | null;
  qty_requested: number | null;
  qty_allocated: number | null;
  qty_remaining: number | null;
};

type WishlistRequestEvent = {
  id: string;
  event_type: string | null;
  payload?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
};

type WishlistRequestSummary = {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  order_number: string | null;
  source: string | null;
  priority: string | null;
  status: string | null;
  year: number | null;
  week_number: number | null;
  delivery_monday: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: WishlistRequestItem[];
  events?: WishlistRequestEvent[];
};

type SupportThreadReply = {
  id: string;
  admin_name?: string | null;
  reply_text: string;
  is_internal: boolean;
  is_from_customer: boolean;
  source?: string | null;
  created_at: string;
};

type SupportThreadSummary = {
  id: string;
  order_id: string | null;
  order_source: OrderSource | null;
  order_number: string | null;
  customer_phone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  subject: string;
  message: string;
  message_type: 'support' | 'inquiry' | 'complaint' | 'feedback' | 'referral_question';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  initiated_by: 'customer' | 'admin';
  initiated_by_admin_name?: string | null;
  email_thread_id?: string | null;
  last_viewed_at?: string | null;
  created_at: string;
  updated_at: string;
  message_replies?: SupportThreadReply[];
};

type CustomerProfile = {
  customer_id: string;
  email: string;
  name: string;
  phone: string | null;
  first_order_date: string;
  total_orders: number;
  completed_orders: number;
  total_spent: number;
  avg_order_value: number;
  lifetime_value: number;
  orders: CustomerOrderSummary[];
  support_threads?: SupportThreadSummary[];
  communications?: CommunicationHistoryItem[];
  scheduled_communications?: ScheduledCommunicationItem[];
  wishlist_requests?: WishlistRequestSummary[];
  lifecycle_materialization?: {
    ok: boolean;
    inserted: number;
    error?: string | null;
    missing_tables?: string[];
  };
  email_consistency?: {
    ok: boolean;
    planned: number;
    sent: number;
    failed: number;
    cancelled: number;
    overdueScheduled: number;
    issues: string[];
    missingConfirmations?: Array<{
      orderId: string;
      orderNumber: string;
      source: OrderSource;
      expectedTemplate: string;
    }>;
  };
  email_controls?: {
    email: string | null;
    suppressed: boolean;
    suppression_reason: string | null;
    suppression_source: string | null;
    suppression_created_at: string | null;
    totals: {
      total: number;
      sent: number;
      failed: number;
      cancelled: number;
      byClassification: Record<string, number>;
    };
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getChickenAdditionSubtotal = (addition: Record<string, unknown>) => {
  const hens = toNumber(addition.quantity_hens);
  const roosters = toNumber(addition.quantity_roosters);
  const pricePerHen = toNumber(addition.price_per_hen_nok);
  const roosterFromAddition = toNumber(addition.price_per_rooster_nok);
  const roosterFromBreed = toNumber(
    (addition.chicken_breeds as Record<string, unknown> | undefined)?.rooster_price_nok
  );
  const computed = hens * pricePerHen + roosters * (roosterFromAddition || roosterFromBreed);
  if (computed > 0) return computed;
  return toNumber(addition.subtotal_nok);
};

const getChickenBaseSubtotal = (args: {
  baseHens: number;
  baseRoosters: number;
  pricePerHen: number;
  pricePerRooster: number;
  totalAmount: number;
  deliveryFee: number;
  additionsSubtotal: number;
}) => {
  const baseByPricing = args.baseHens * args.pricePerHen + args.baseRoosters * args.pricePerRooster;
  const baseByTotal = Math.max(0, args.totalAmount - args.deliveryFee - args.additionsSubtotal);
  const shouldReconcile =
    args.totalAmount > 0 &&
    Math.abs(baseByPricing + args.additionsSubtotal + args.deliveryFee - args.totalAmount) > 1;
  return shouldReconcile ? baseByTotal : baseByPricing;
};

const orderKey = (order: Pick<CustomerOrderSummary, 'source' | 'order_id'>) =>
  `${order.source}:${order.order_id}`;

const parseNumberOrUndefined = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

type SupportMessageDraft = {
  subject: string;
  message: string;
  messageType: SupportThreadSummary['message_type'];
  priority: SupportThreadSummary['priority'];
  relatedOrderKey: string;
};

const createSupportMessageDraft = (relatedOrderKey = ''): SupportMessageDraft => ({
  subject: '',
  message: '',
  messageType: 'support',
  priority: 'normal',
  relatedOrderKey,
});

const parseRelatedOrderKey = (value: string): { source: OrderSource | null; id: string | null } => {
  const [source, id] = String(value || '').split(':', 2);
  if ((source === 'pig' || source === 'egg' || source === 'chicken') && id) {
    return { source, id };
  }

  return { source: null, id: null };
};

const buildDraft = (source: OrderSource, order: Record<string, unknown>) => {
  if (source === 'egg') {
    return {
      customerName: order.customer_name || '',
      customerEmail: order.customer_email || '',
      customerPhone: order.customer_phone || '',
      status: order.status || 'pending',
      quantity: order.quantity || 0,
      pricePerEgg: order.price_per_egg || 0,
      deliveryMethod: order.delivery_method || 'posten',
      deliveryFee: order.delivery_fee || 0,
      remainderDueDate: order.remainder_due_date || '',
      notes: order.notes || '',
      adminNotes: order.admin_notes || '',
    };
  }

  if (source === 'chicken') {
    return {
      customerName: order.customer_name || '',
      customerEmail: order.customer_email || '',
      customerPhone: order.customer_phone || '',
      status: order.status || 'pending',
      quantityHens: order.quantity_hens || 0,
      quantityRoosters: order.quantity_roosters || 0,
      pickupYear: order.pickup_year || 0,
      pickupWeek: order.pickup_week || 0,
      pricePerHenNok: order.price_per_hen_nok || 0,
      pricePerRoosterNok: order.price_per_rooster_nok || 0,
      deliveryMethod: order.delivery_method || 'farm_pickup',
      deliveryFeeNok: order.delivery_fee_nok || 0,
      remainderDueDate: order.remainder_due_date || '',
      notes: order.notes || '',
      adminNotes: order.admin_notes || '',
    };
  }

  return {
    status: order.status || 'pending',
    adminNotes: order.admin_notes || '',
  };
};

type CustomerDatabaseProps = {
  initialCustomerId?: string | null;
  onInitialCustomerHandled?: () => void;
};

export function CustomerDatabase({
  initialCustomerId = null,
  onInitialCustomerHandled,
}: CustomerDatabaseProps = {}) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const copy = t.customerDatabase;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;
  const orderCreatedLabel = (copy as any).createdAtLabel || (lang === 'en' ? 'Created' : 'Opprettet');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, Record<string, unknown>>>({});
  const [orderDrafts, setOrderDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [emailActionLoading, setEmailActionLoading] = useState<string | null>(null);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentModalOrder, setContentModalOrder] = useState<CustomerOrderSummary | null>(null);
  const [contentModalLoadingKey, setContentModalLoadingKey] = useState<string | null>(null);
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);
  const [communicationPreview, setCommunicationPreview] = useState<CommunicationPreviewItem | null>(null);
  const [communicationPreviewLoading, setCommunicationPreviewLoading] = useState<string | null>(null);
  const [communicationPreviewMode, setCommunicationPreviewMode] = useState<'html' | 'text'>('html');
  const [supportMessageComposerOpen, setSupportMessageComposerOpen] = useState(false);
  const [supportMessageDraft, setSupportMessageDraft] = useState<SupportMessageDraft>(createSupportMessageDraft());
  const [supportMessageSending, setSupportMessageSending] = useState(false);
  const [initialCustomerHandled, setInitialCustomerHandled] = useState(false);

  // Order action state
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  const [collectRemainderModal, setCollectRemainderModal] = useState<{ order: CustomerOrderSummary; defaultAmount: number } | null>(null);
  const [collectAmountInput, setCollectAmountInput] = useState('');
  const [collectNoteInput, setCollectNoteInput] = useState('');
  const [shipModal, setShipModal] = useState<CustomerOrderSummary | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Egg order action overrides
  const [eggActionLoading, setEggActionLoading] = useState<string | null>(null);
  const [eggActionConfirm, setEggActionConfirm] = useState<{
    order: CustomerOrderSummary;
    action: string;
    title: string;
    description: string;
  } | null>(null);
  const [eggActionReason, setEggActionReason] = useState('');
  const [moveWeekModal, setMoveWeekModal] = useState<{ order: CustomerOrderSummary; currentWeek: number } | null>(null);
  const [moveWeekInput, setMoveWeekInput] = useState('');

  // Chicken order actions
  const [markPickedUpLoading, setMarkPickedUpLoading] = useState<string | null>(null);
  const [sendPickupEmailLoading, setSendPickupEmailLoading] = useState<string | null>(null);
  const [adjustBirdsModal, setAdjustBirdsModal] = useState<{ order: CustomerOrderSummary } | null>(null);
  const [adjustDeltas, setAdjustDeltas] = useState<Record<string, { hensDelta: number; roostersDelta: number }>>({});
  const [adjustPoolReturns, setAdjustPoolReturns] = useState<Record<string, { poolHensReturn: number; poolRoostersReturn: number }>>({});
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustBirdsStep, setAdjustBirdsStep] = useState<'edit' | 'pool' | 'confirm'>('edit');
  const [adjustBirdsLoading, setAdjustBirdsLoading] = useState(false);

  // Pig pickup date
  const [pickupDateModal, setPickupDateModal] = useState<{ order: CustomerOrderSummary; currentDate: string; currentTime: string } | null>(null);
  const [pickupDateInput, setPickupDateInput] = useState('');
  const [pickupTimeInput, setPickupTimeInput] = useState('11:00');
  const [pickupDateLoading, setPickupDateLoading] = useState<string | null>(null);

  // Pig order actions
  const [syncAmountsLoading, setSyncAmountsLoading] = useState<string | null>(null);

  // Add chicken addition
  type ChickenHatchOption = { hatch_id: string; breed_id: string; breed_name: string; hatch_date: string; available_hens: number; available_roosters: number };
  const [addAdditionModal, setAddAdditionModal] = useState<{ order: CustomerOrderSummary } | null>(null);
  const [addAdditionHatches, setAddAdditionHatches] = useState<ChickenHatchOption[]>([]);
  const [addAdditionHatchId, setAddAdditionHatchId] = useState('');
  const [addAdditionHens, setAddAdditionHens] = useState('0');
  const [addAdditionRoosters, setAddAdditionRoosters] = useState('0');
  const [addAdditionAge, setAddAdditionAge] = useState('0');
  const [addAdditionLoading, setAddAdditionLoading] = useState(false);

  // Manual egg order creation
  const [createEggOrderModal, setCreateEggOrderModal] = useState(false);
  const [eggInventoryOptions, setEggInventoryOptions] = useState<EggInventoryOption[]>([]);
  const [eggInventoryLoading, setEggInventoryLoading] = useState(false);
  const [newEggInventoryId, setNewEggInventoryId] = useState('');
  const [newEggQuantity, setNewEggQuantity] = useState('6');
  const [newEggDeliveryMethod, setNewEggDeliveryMethod] = useState('farm_pickup');
  const [newEggAdminNote, setNewEggAdminNote] = useState('');
  const [newEggPriceOverride, setNewEggPriceOverride] = useState('');
  const [createEggOrderLoading, setCreateEggOrderLoading] = useState(false);

  const supportThreadStatusLabels = {
    open: t.customerMessagingPanel.statusOpen,
    in_progress: t.customerMessagingPanel.statusInProgress,
    resolved: t.customerMessagingPanel.statusResolved,
    closed: t.customerMessagingPanel.statusClosed,
  };

  const supportThreadPriorityLabels = {
    low: t.messaging.low,
    normal: t.messaging.normal,
    high: t.messaging.high,
    urgent: t.messaging.urgent,
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/customers?action=list', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to load customers');
      }
      setCustomers(Array.isArray(body.customers) ? body.customers : []);
    } catch (error) {
      setCustomers([]);
      toast({
        title: copy.impersonateErrorTitle,
        description: error instanceof Error ? error.message : copy.impersonateErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [copy.impersonateErrorDescription, copy.impersonateErrorTitle, toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function viewCustomerProfile(customerId: string) {
    setProfileLoading(true);
    try {
      const response = await fetch(
        `/api/admin/customers?action=profile&customerId=${encodeURIComponent(customerId)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || `Failed to load customer profile (${response.status})`);
      }
      if (!body) {
        throw new Error('Failed to load customer profile (invalid response)');
      }
      setSelectedCustomer(body.profile || null);
      setShowProfile(true);
      setExpandedOrder(null);
      setOrderDetails({});
      setOrderDrafts({});
      setContentModalOpen(false);
      setContentModalOrder(null);
      setContentModalLoadingKey(null);
      setCommunicationModalOpen(false);
      setCommunicationPreview(null);
      setCommunicationPreviewLoading(null);
      setSupportMessageComposerOpen(false);
      setSupportMessageDraft(createSupportMessageDraft());
    } catch (error) {
      toast({
        title: copy.profileLoadErrorTitle,
        description: error instanceof Error ? error.message : copy.profileLoadErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    setInitialCustomerHandled(false);
  }, [initialCustomerId]);

  useEffect(() => {
    if (!initialCustomerId || initialCustomerHandled) return;
    setInitialCustomerHandled(true);
    void viewCustomerProfile(initialCustomerId).finally(() => {
      onInitialCustomerHandled?.();
    });
  }, [initialCustomerHandled, initialCustomerId, onInitialCustomerHandled]);

  function openSupportMessageComposer() {
    if (!selectedCustomer) return;
    const defaultOrderKey =
      selectedCustomer.orders.length === 1 ? orderKey(selectedCustomer.orders[0]) : '';
    setSupportMessageDraft(createSupportMessageDraft(defaultOrderKey));
    setSupportMessageComposerOpen(true);
  }

  function openSupportThreadInMessages(messageId: string) {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'customers');
    params.set('subTab', 'messages');
    params.set('messageId', messageId);
    window.location.href = `/admin?${params.toString()}`;
  }

  async function sendSupportMessageToCustomer() {
    if (!selectedCustomer) return;

    if (!supportMessageDraft.subject.trim() || !supportMessageDraft.message.trim()) {
      toast({
        title: copy.messageSendMissingTitle,
        description: copy.messageSendMissingDescription,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedCustomer.email && !selectedCustomer.phone) {
      toast({
        title: copy.messageSendNoContactTitle,
        description: copy.messageSendNoContactDescription,
        variant: 'destructive',
      });
      return;
    }

    const relatedOrder = parseRelatedOrderKey(supportMessageDraft.relatedOrderKey);

    try {
      setSupportMessageSending(true);
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id,
          customer_name: selectedCustomer.name,
          customer_email: selectedCustomer.email,
          customer_phone: selectedCustomer.phone,
          subject: supportMessageDraft.subject.trim(),
          message: supportMessageDraft.message.trim(),
          message_type: supportMessageDraft.messageType,
          priority: supportMessageDraft.priority,
          related_order_source: relatedOrder.source,
          related_order_id: relatedOrder.id,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to send message');
      }

      const deliveryDescription = body?.emailDispatched
        ? copy.messageSendSuccessDescription
        : copy.messageSendPortalOnlyDescription;

      toast({
        title: copy.messageSendSuccessTitle,
        description: deliveryDescription,
      });

      setSupportMessageComposerOpen(false);
      setSupportMessageDraft(createSupportMessageDraft());
      await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({
        title: copy.messageSendErrorTitle,
        description: error instanceof Error ? error.message : copy.messageSendErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSupportMessageSending(false);
    }
  }

  async function impersonateCustomer(customer: Pick<Customer, 'customer_id' | 'email' | 'phone' | 'name'>) {
    try {
      const response = await fetch('/api/admin/customers/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.customer_id,
          customerEmail: customer.email,
          customerPhone: customer.phone || undefined,
          returnTo: '/min-side',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || copy.impersonateErrorDescription);
      }
      toast({
        title: copy.impersonateStartingTitle,
        description: copy.impersonateStartingDescription.replace('{name}', customer.name),
      });
      window.location.href = body?.redirectTo || '/min-side';
    } catch (error) {
      toast({
        title: copy.impersonateErrorTitle,
        description: error instanceof Error ? error.message : copy.impersonateErrorDescription,
        variant: 'destructive',
      });
    }
  }

  async function loadOrderDetail(order: CustomerOrderSummary, force = false) {
    const key = orderKey(order);
    if (!force && orderDetails[key]) return;

    try {
      setLoadingOrder(key);
      const response = await fetch(
        `/api/admin/customers?action=order-detail&source=${encodeURIComponent(order.source)}&orderId=${encodeURIComponent(order.order_id)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to load order detail');
      }
      const detail = (body.order || {}) as Record<string, unknown>;
      setOrderDetails((previous) => ({ ...previous, [key]: detail }));
      setOrderDrafts((previous) => ({ ...previous, [key]: buildDraft(order.source, detail) }));
    } catch (error) {
      toast({
        title: copy.impersonateErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoadingOrder((current) => (current === key ? null : current));
    }
  }

  async function toggleOrder(order: CustomerOrderSummary) {
    const key = orderKey(order);
    if (expandedOrder === key) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(key);
    await loadOrderDetail(order);
  }

  function updateDraft(order: CustomerOrderSummary, field: string, value: unknown) {
    const key = orderKey(order);
    setOrderDrafts((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] || {}),
        [field]: value,
      },
    }));
  }

  async function saveOrder(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const draft = orderDrafts[key];
    if (!draft) return;

    let endpoint = '';
    let payload: Record<string, unknown> = {};

    if (order.source === 'egg') {
      endpoint = `/api/admin/eggs/orders/${order.order_id}`;
      payload = {
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        customerPhone: draft.customerPhone,
        status: draft.status,
        quantity: parseNumberOrUndefined(draft.quantity),
        pricePerEgg: parseNumberOrUndefined(draft.pricePerEgg),
        deliveryMethod: draft.deliveryMethod,
        deliveryFee: parseNumberOrUndefined(draft.deliveryFee),
        remainderDueDate: draft.remainderDueDate,
        notes: draft.notes,
        adminNotes: draft.adminNotes,
      };
    } else if (order.source === 'chicken') {
      endpoint = `/api/admin/chickens/orders/${order.order_id}`;
      payload = {
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        customerPhone: draft.customerPhone,
        status: draft.status,
        quantityHens: parseNumberOrUndefined(draft.quantityHens),
        quantityRoosters: parseNumberOrUndefined(draft.quantityRoosters),
        pickupYear: parseNumberOrUndefined(draft.pickupYear),
        pickupWeek: parseNumberOrUndefined(draft.pickupWeek),
        pricePerHenNok: parseNumberOrUndefined(draft.pricePerHenNok),
        pricePerRoosterNok: parseNumberOrUndefined(draft.pricePerRoosterNok),
        deliveryMethod: draft.deliveryMethod,
        deliveryFeeNok: parseNumberOrUndefined(draft.deliveryFeeNok),
        remainderDueDate: draft.remainderDueDate,
        notes: draft.notes,
        adminNotes: draft.adminNotes,
      };
    } else {
      endpoint = `/api/admin/orders/${order.order_id}`;
      payload = {
        status: draft.status,
        adminNotes: draft.adminNotes,
      };
    }

    Object.keys(payload).forEach((entry) => {
      if (payload[entry] === undefined) delete payload[entry];
    });

    try {
      setSavingOrder(key);
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to update order');
      }

      toast({
        title: copy.orderSaveSuccessTitle,
        description: copy.orderSaveSuccessDescription,
      });
      await loadOrderDetail(order, true);
    } catch (error) {
      toast({
        title: copy.orderSaveErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSavingOrder((current) => (current === key ? null : current));
    }
  }

  async function toggleSuppression(shouldSuppress: boolean) {
    if (!selectedCustomer?.email) {
      toast({
        title: copy.orderSaveErrorTitle,
        description: copy.notProvided,
        variant: 'destructive',
      });
      return;
    }

    const actionKey = shouldSuppress ? 'suppress' : 'unsuppress';

    try {
      setEmailActionLoading(actionKey);
      const response = await fetch('/api/admin/customers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionKey,
          email: selectedCustomer.email,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || copy.orderSaveErrorDescription);
      }

      toast({
        title: shouldSuppress
          ? ((copy as any).emailSuppressedTitle || (lang === 'en' ? 'Email suppressed' : 'E-post blokkert'))
          : ((copy as any).emailUnsuppressedTitle || (lang === 'en' ? 'Email enabled' : 'E-post aktivert')),
        description: shouldSuppress
          ? ((copy as any).emailSuppressedDescription ||
            (lang === 'en'
              ? 'Automatic emails are now blocked for this recipient.'
              : 'Automatiske e-poster er nå blokkert for denne mottakeren.'))
          : ((copy as any).emailUnsuppressedDescription ||
            (lang === 'en'
              ? 'Automatic emails are now allowed for this recipient.'
              : 'Automatiske e-poster er nå tillatt for denne mottakeren.')),
      });

      await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({
        title: copy.orderSaveErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setEmailActionLoading((current) => (current === actionKey ? null : current));
    }
  }

  async function resendCommunication(entry: CommunicationHistoryItem) {
    if (entry.source !== 'email_dispatch_queue') return;

    const actionKey = `resend:${entry.id}`;
    try {
      setEmailActionLoading(actionKey);
      const response = await fetch('/api/admin/customers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          queueId: entry.id,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || copy.orderSaveErrorDescription);
      }

      toast({
        title:
          (copy as any).communicationResentTitle || (lang === 'en' ? 'Email resent' : 'E-post sendt på nytt'),
        description:
          (copy as any).communicationResentDescription ||
          (lang === 'en'
            ? 'The email was re-enqueued successfully.'
            : 'E-posten ble lagt i kø på nytt.'),
      });

      if (selectedCustomer) {
        await viewCustomerProfile(selectedCustomer.customer_id);
      }
    } catch (error) {
      toast({
        title: copy.orderSaveErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setEmailActionLoading((current) => (current === actionKey ? null : current));
    }
  }

  async function openCommunicationPreview(entry: CommunicationHistoryItem) {
    const previewKey = `${entry.source}:${entry.id}`;
    try {
      setCommunicationPreviewLoading(previewKey);
      setCommunicationModalOpen(true);

      const response = await fetch(
        `/api/admin/customers/email?action=preview&source=${encodeURIComponent(entry.source)}&id=${encodeURIComponent(entry.id)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || copy.orderSaveErrorDescription);
      }

      const preview = body?.preview as CommunicationPreviewItem | undefined;
      if (!preview) {
        throw new Error(copy.orderSaveErrorDescription);
      }
      setCommunicationPreview(preview);
    } catch (error) {
      setCommunicationModalOpen(false);
      setCommunicationPreview(null);
      toast({
        title: copy.orderSaveErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setCommunicationPreviewLoading((current) => (current === previewKey ? null : current));
    }
  }

  async function openScheduledCommunicationPreview(entry: ScheduledCommunicationItem) {
    const previewKey = `scheduled:${entry.id}`;
    try {
      setCommunicationPreviewLoading(previewKey);
      setCommunicationModalOpen(true);

      const response = await fetch(
        `/api/admin/customers/email?action=preview-scheduled&id=${encodeURIComponent(entry.id)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || copy.orderSaveErrorDescription);
      }

      const preview = body?.preview as CommunicationPreviewItem | undefined;
      if (!preview) {
        throw new Error(copy.orderSaveErrorDescription);
      }
      setCommunicationPreview(preview);
      setCommunicationPreviewMode('html');
      setCommunicationPreviewMode('html');
    } catch (error) {
      setCommunicationModalOpen(false);
      setCommunicationPreview(null);
      toast({
        title: copy.orderSaveErrorTitle,
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setCommunicationPreviewLoading((current) => (current === previewKey ? null : current));
    }
  }

  function findQueueCommunicationForOrder(order: CustomerOrderSummary) {
    if (!selectedCustomer?.communications?.length) return null;

    return (
      selectedCustomer.communications.find((entry) => {
        if (entry.source !== 'email_dispatch_queue') return false;
        if (!entry.orderRefs) return false;

        if (order.source === 'pig') return entry.orderRefs.orderId === order.order_id;
        if (order.source === 'egg') return entry.orderRefs.eggOrderId === order.order_id;
        return entry.orderRefs.chickenOrderId === order.order_id;
      }) || null
    );
  }

  async function resendOrderConfirmation(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const actionKey = `order-resend:${key}`;

    try {
      setEmailActionLoading(actionKey);

      if (order.source === 'chicken') {
        const response = await fetch(`/api/admin/chickens/orders/${order.order_id}/resend-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeAdmin: true }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const details = typeof body?.details === 'string' && body.details.trim() ? `: ${body.details}` : '';
          throw new Error(`${body?.error || copy.orderSaveErrorDescription}${details}`);
        }
      } else if (order.source === 'egg') {
        const response = await fetch(`/api/admin/eggs/orders/${order.order_id}/resend-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeAdmin: true }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      } else if (order.source === 'pig') {
        const response = await fetch(`/api/admin/orders/${order.order_id}/resend-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeAdmin: true }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      }

      toast({
        title:
          (copy as any).resendConfirmationSuccessTitle ||
          (lang === 'en' ? 'Confirmation resent' : 'Bekreftelse sendt på nytt'),
        description:
          (copy as any).resendConfirmationSuccessDescription ||
          (lang === 'en'
            ? 'The confirmation email was queued successfully.'
            : 'Bekreftelseseposten ble lagt i kø.'),
      });

      if (selectedCustomer) {
        await viewCustomerProfile(selectedCustomer.customer_id);
      }
    } catch (error) {
      toast({
        title:
          (copy as any).resendConfirmationErrorTitle ||
          (lang === 'en' ? 'Could not resend confirmation' : 'Kunne ikke sende bekreftelse på nytt'),
        description: error instanceof Error ? error.message : copy.orderSaveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setEmailActionLoading((current) => (current === actionKey ? null : current));
    }
  }

  async function collectRemainder(order: CustomerOrderSummary, amountInput: string, note: string) {
    const key = orderKey(order);
    const actionKey = `collect-remainder:${key}`;
    setOrderActionLoading(actionKey);
    try {
      let response: Response;
      if (order.source === 'egg') {
        const amountOre = Math.round(parseFloat(amountInput) * 100);
        response = await fetch(`/api/admin/eggs/orders/${order.order_id}/collect-remainder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountOre, note, locale: lang }),
        });
      } else if (order.source === 'chicken') {
        const amountNok = parseFloat(amountInput);
        response = await fetch(`/api/admin/chickens/orders/${order.order_id}/collect-remainder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountNok, note, locale: lang }),
        });
      } else {
        const amountNok = parseFloat(amountInput);
        response = await fetch(`/api/admin/orders/${order.order_id}/collect-remainder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountNok, note }),
        });
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Remainder collected' : 'Restbetaling registrert' });
      setCollectRemainderModal(null);
      setCollectAmountInput('');
      setCollectNoteInput('');
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setOrderActionLoading((c) => (c === actionKey ? null : c));
    }
  }

  async function enableRemainder(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const actionKey = `enable-remainder:${key}`;
    setOrderActionLoading(actionKey);
    try {
      const url = order.source === 'chicken'
        ? `/api/admin/chickens/orders/${order.order_id}/enable-remainder`
        : `/api/admin/orders/${order.order_id}/enable-remainder`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Remainder payment enabled' : 'Restbetaling aktivert', description: lang === 'en' ? 'Customer can now pay the remainder.' : 'Kunden kan nå betale restbeløpet.' });
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setOrderActionLoading((c) => (c === actionKey ? null : c));
    }
  }

  async function correctOrderStatus(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const actionKey = `correct-status:${key}`;
    setOrderActionLoading(actionKey);
    try {
      const response = await fetch(`/api/admin/chickens/orders/${order.order_id}/correct-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({
        title: lang === 'en' ? 'Status corrected' : 'Status korrigert',
        description: lang === 'en'
          ? 'Order reset to deposit_paid. Phantom payments voided.'
          : 'Ordre tilbakestilt til innbetalt depositum. Phantom-betalinger annullert.',
      });
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setOrderActionLoading((c) => (c === actionKey ? null : c));
    }
  }

  async function openCreateEggOrderModal() {
    setCreateEggOrderModal(true);
    setEggInventoryLoading(true);
    setNewEggInventoryId('');
    setNewEggQuantity('6');
    setNewEggDeliveryMethod('farm_pickup');
    setNewEggAdminNote('');
    setNewEggPriceOverride('');
    try {
      const [inventoryRes, breedsRes] = await Promise.all([
        fetch('/api/admin/eggs/inventory', { cache: 'no-store' }),
        fetch('/api/admin/eggs/breeds', { cache: 'no-store' }),
      ]);
      const inventoryData = await inventoryRes.json();
      const breedsData = await breedsRes.json();
      // Build a breed price map: breedId → price_per_egg (øre)
      const breedPriceMap = new Map<string, number>();
      if (Array.isArray(breedsData)) {
        for (const breed of breedsData) {
          if (breed?.id) breedPriceMap.set(breed.id, Number(breed.price_per_egg || 0));
        }
      }
      const rows: EggInventoryOption[] = (Array.isArray(inventoryData) ? inventoryData : []).map((r: any) => ({
        ...r,
        egg_breeds: r.egg_breeds
          ? { ...r.egg_breeds, price_per_egg: breedPriceMap.get(r.egg_breeds.id ?? r.breed_id) ?? Number(r.egg_breeds.price_per_egg || 0) }
          : null,
      }));
      // Show rows with available eggs — sort newest first
      const relevant = rows
        .filter((r) => (r.eggs_available - r.eggs_allocated) > 0)
        .sort((a, b) => (a.year === b.year ? b.week_number - a.week_number : b.year - a.year));
      setEggInventoryOptions(relevant);
      // Pre-select the most recent maran week, else first option
      const maranRow = relevant.find((r) => r.egg_breeds?.name?.toLowerCase().includes('maran'));
      setNewEggInventoryId(maranRow?.id || relevant[0]?.id || '');
    } catch {
      // leave empty, user can still pick
    } finally {
      setEggInventoryLoading(false);
    }
  }

  async function createManualEggOrder() {
    if (!selectedCustomer || !newEggInventoryId) return;
    setCreateEggOrderLoading(true);
    try {
      const priceOverrideOre = newEggPriceOverride ? Math.round(parseFloat(newEggPriceOverride) * 100) : undefined;
      const response = await fetch('/api/admin/eggs/orders/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: selectedCustomer.name,
          customerEmail: selectedCustomer.email,
          customerPhone: selectedCustomer.phone || undefined,
          inventoryId: newEggInventoryId,
          quantity: parseInt(newEggQuantity, 10),
          deliveryMethod: newEggDeliveryMethod,
          adminNote: newEggAdminNote || undefined,
          ...(priceOverrideOre ? { pricePerEggOre: priceOverrideOre } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({
        title: lang === 'en' ? 'Egg order created' : 'Rugeeggordre opprettet',
        description: `${body.orderNumber} — ${body.quantity} egg${body.quantity !== 1 ? (lang === 'en' ? 's' : '') : ''} (${body.breed})`,
      });
      setCreateEggOrderModal(false);
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setCreateEggOrderLoading(false);
    }
  }

  async function markShipped(order: CustomerOrderSummary, trackingNumber: string) {
    const key = orderKey(order);
    const actionKey = `mark-shipped:${key}`;
    setOrderActionLoading(actionKey);
    try {
      const response = await fetch(`/api/admin/eggs/orders/${order.order_id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_shipped', data: { trackingNumber: trackingNumber.trim() } }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Marked as shipped' : 'Merket som sendt' });
      setShipModal(null);
      setTrackingNumberInput('');
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setOrderActionLoading((c) => (c === actionKey ? null : c));
    }
  }

  async function toggleLockOrder(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const details = (order.details || {}) as Record<string, unknown>;
    const isLocked = Boolean(details.locked_at);
    const action = isLocked ? 'unlock_orders' : 'lock_orders';
    const actionKey = `lock:${key}`;
    setOrderActionLoading(actionKey);
    try {
      const url = order.source === 'egg' ? '/api/admin/eggs/orders' : '/api/admin/orders';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orderIds: [order.order_id] }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: isLocked ? (lang === 'en' ? 'Order unlocked' : 'Ordre låst opp') : (lang === 'en' ? 'Order locked' : 'Ordre låst') });
      if (selectedCustomer) await viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setOrderActionLoading((c) => (c === actionKey ? null : c));
    }
  }

  // ── Egg order actions ─────────────────────────────────────────────────────

  async function runEggOrderAction(order: CustomerOrderSummary, action: string, data: Record<string, unknown> = {}) {
    const loadingKey = `${action}:${order.order_id}`;
    setEggActionLoading(loadingKey);
    try {
      const res = await fetch(`/api/admin/eggs/orders/${order.order_id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Order updated' : 'Bestilling oppdatert' });
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setEggActionLoading((c) => (c === loadingKey ? null : c));
    }
  }

  async function handleConfirmedEggAction() {
    if (!eggActionConfirm) return;
    const { order, action } = eggActionConfirm;
    setEggActionConfirm(null);
    await runEggOrderAction(order, action, { releaseInventory: true, reason: eggActionReason || undefined });
    setEggActionReason('');
  }

  async function moveEggWeek() {
    if (!moveWeekModal) return;
    const weekNum = Number(moveWeekInput);
    if (!Number.isFinite(weekNum) || weekNum < 1 || weekNum > 53) {
      toast({ title: lang === 'en' ? 'Invalid week number' : 'Ugyldig ukenummer', variant: 'destructive' });
      return;
    }
    await runEggOrderAction(moveWeekModal.order, 'move_week', { weekNumber: weekNum });
    setMoveWeekModal(null);
    setMoveWeekInput('');
  }

  // ── Pig order actions ──────────────────────────────────────────────────────

  async function syncPigAmounts(order: CustomerOrderSummary) {
    setSyncAmountsLoading(order.order_id);
    try {
      const res = await fetch('/api/admin/orders/sync-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.order_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Amounts synced' : 'Beløp synkronisert' });
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setSyncAmountsLoading(null);
    }
  }

  async function setPigPickupDate(order: CustomerOrderSummary, date: string, time: string) {
    setPickupDateLoading(order.order_id);
    try {
      const res = await fetch(`/api/admin/orders/${order.order_id}/pickup-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupDate: date, pickupTime: time }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Pickup date set' : 'Hentedato satt', description: `${date} ${time}` });
      setPickupDateModal(null);
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setPickupDateLoading(null);
    }
  }

  // ── Chicken order actions ──────────────────────────────────────────────────

  async function markChickenPickedUp(order: CustomerOrderSummary) {
    setMarkPickedUpLoading(order.order_id);
    try {
      const res = await fetch(`/api/admin/chickens/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'picked_up' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Marked as picked up' : 'Merket som hentet' });
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setMarkPickedUpLoading(null);
    }
  }

  async function sendPickupEmail(order: CustomerOrderSummary) {
    setSendPickupEmailLoading(order.order_id);
    try {
      const endpoint = order.source === 'chicken'
        ? `/api/admin/chickens/orders/${order.order_id}/send-pickup-email`
        : `/api/admin/orders/${order.order_id}/send-pickup-email`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: lang }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Pickup email sent' : 'Hentemelding sendt' });
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setSendPickupEmailLoading(null);
    }
  }

  function openAdjustBirdsModal(order: CustomerOrderSummary) {
    const detail = orderDetails[orderKey(order)] || {};
    const additions = (detail.chicken_order_additions as Array<Record<string, unknown>> | undefined) || [];
    const initial: Record<string, { hensDelta: number; roostersDelta: number }> = {
      main: { hensDelta: 0, roostersDelta: 0 },
    };
    for (const a of additions) {
      initial[String(a.id)] = { hensDelta: 0, roostersDelta: 0 };
    }
    setAdjustDeltas(initial);
    setAdjustPoolReturns({});
    setAdjustNote('');
    setAdjustBirdsStep('edit');
    setAdjustBirdsModal({ order });
  }

  function adjustBirdsHasSubtractions() {
    return Object.values(adjustDeltas).some((d) => d.hensDelta < 0 || d.roostersDelta < 0);
  }

  function adjustBirdsHasChanges() {
    return Object.values(adjustDeltas).some((d) => d.hensDelta !== 0 || d.roostersDelta !== 0);
  }

  function handleAdjustBirdsNext() {
    if (adjustBirdsStep === 'edit') {
      if (adjustBirdsHasSubtractions()) {
        const returns: Record<string, { poolHensReturn: number; poolRoostersReturn: number }> = {};
        for (const [key, delta] of Object.entries(adjustDeltas)) {
          if (delta.hensDelta < 0 || delta.roostersDelta < 0) {
            returns[key] = { poolHensReturn: 0, poolRoostersReturn: 0 };
          }
        }
        setAdjustPoolReturns(returns);
        setAdjustBirdsStep('pool');
      } else {
        setAdjustBirdsStep('confirm');
      }
    } else if (adjustBirdsStep === 'pool') {
      setAdjustBirdsStep('confirm');
    }
  }

  function handleAdjustBirdsBack() {
    if (adjustBirdsStep === 'pool') setAdjustBirdsStep('edit');
    else if (adjustBirdsStep === 'confirm') {
      if (adjustBirdsHasSubtractions()) setAdjustBirdsStep('pool');
      else setAdjustBirdsStep('edit');
    }
  }

  async function submitAdjustBirds() {
    if (!adjustBirdsModal) return;
    setAdjustBirdsLoading(true);
    try {
      const adjustments = Object.entries(adjustDeltas)
        .filter(([, d]) => d.hensDelta !== 0 || d.roostersDelta !== 0)
        .map(([key, d]) => {
          const isMain = key === 'main';
          const pr = adjustPoolReturns[key] || { poolHensReturn: 0, poolRoostersReturn: 0 };
          return {
            type: isMain ? 'main' : 'addition',
            additionId: isMain ? null : key,
            hensDelta: d.hensDelta,
            roostersDelta: d.roostersDelta,
            poolHensReturn: d.hensDelta < 0 ? pr.poolHensReturn : 0,
            poolRoostersReturn: d.roostersDelta < 0 ? pr.poolRoostersReturn : 0,
            poolHensIncrease: d.hensDelta > 0 ? d.hensDelta : 0,
            poolRoostersIncrease: d.roostersDelta > 0 ? d.roostersDelta : 0,
          };
        });
      const order = adjustBirdsModal.order;
      const res = await fetch(`/api/admin/chickens/orders/${order.order_id}/adjust-birds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments, adminNote: adjustNote }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Birds adjusted' : 'Antall fugler justert' });
      setAdjustBirdsModal(null);
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setAdjustBirdsLoading(false);
    }
  }

  async function openAddChickenAdditionModal(order: CustomerOrderSummary) {
    setAddAdditionHens('0');
    setAddAdditionRoosters('0');
    setAddAdditionAge('0');
    setAddAdditionHatchId('');
    setAddAdditionHatches([]);
    setAddAdditionModal({ order });
    try {
      const res = await fetch('/api/admin/chickens/demand-summary', { cache: 'no-store' });
      const rows = await res.json().catch(() => []);
      const options = (Array.isArray(rows) ? rows : []).filter(
        (r: ChickenHatchOption) => r.available_hens > 0 || r.available_roosters > 0
      );
      setAddAdditionHatches(options);
      if (options.length > 0) setAddAdditionHatchId(options[0].hatch_id);
    } catch {
      // leave empty, user can see no options
    }
  }

  async function submitChickenAddition() {
    if (!addAdditionModal || !addAdditionHatchId) return;
    const hens = Number(addAdditionHens);
    const roosters = Number(addAdditionRoosters);
    const age = Number(addAdditionAge);
    if (hens === 0 && roosters === 0) {
      toast({ title: lang === 'en' ? 'Add at least one bird' : 'Legg til minst én fugl', variant: 'destructive' });
      return;
    }
    setAddAdditionLoading(true);
    try {
      const order = addAdditionModal.order;
      const res = await fetch(`/api/admin/chickens/orders/${order.order_id}/add-addition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hatchId: addAdditionHatchId, quantityHens: hens, quantityRoosters: roosters, ageWeeksAtPickup: age }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || copy.orderSaveErrorDescription);
      toast({ title: lang === 'en' ? 'Addition added' : 'Tillegg lagt til' });
      setAddAdditionModal(null);
      await loadOrderDetail(order, true);
      if (selectedCustomer) void viewCustomerProfile(selectedCustomer.customer_id);
    } catch (error) {
      toast({ title: lang === 'en' ? 'Error' : 'Feil', description: error instanceof Error ? error.message : copy.orderSaveErrorDescription, variant: 'destructive' });
    } finally {
      setAddAdditionLoading(false);
    }
  }

  function getOrderItemSummary(order: CustomerOrderSummary) {
    const details = (order.details || {}) as Record<string, unknown>;

    if (order.source === 'egg') {
      const quantity = toNumber(details.quantity);
      const breed = String(details.breed_name || '').trim();
      return {
        primary: quantity > 0 ? `${quantity} ${copy.fieldLabels.quantity}` : copy.notProvided,
        secondary: breed || null,
      };
    }

    if (order.source === 'chicken') {
      const baseHens = toNumber(details.quantity_hens);
      const baseRoosters = toNumber(details.quantity_roosters);
      const additions = Array.isArray(details.additions)
        ? (details.additions as Array<Record<string, unknown>>)
        : [];
      const baseAge = toNumber(details.age_weeks_at_pickup, 0);
      const allAges = [
        baseAge,
        ...additions.map((item) => toNumber(item.age_weeks_at_pickup, 0)),
      ].filter((age) => Number.isFinite(age) && age > 0);
      const uniqueAges = Array.from(new Set(allAges)).sort((a, b) => a - b);

      const extraHens = additions.reduce((sum, item) => sum + toNumber(item.quantity_hens), 0);
      const extraRoosters = additions.reduce((sum, item) => sum + toNumber(item.quantity_roosters), 0);

      const hens = baseHens + extraHens;
      const roosters = baseRoosters + extraRoosters;
      const breed = String(details.breed_name || '').trim();
      const additionsLabel =
        additions.length > 0
          ? `${lang === 'en' ? ' + ' : ' + '}${additions.length} ${lang === 'en' ? 'additions' : 'tillegg'}`
          : '';

      return {
        primary:
          roosters > 0
            ? `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens} + ${roosters.toLocaleString(locale)} ${copy.fieldLabels.roosters}`
            : `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens}`,
        secondary:
          uniqueAges.length === 0
            ? (breed ? `${breed}${additionsLabel}` : additions.length > 0 ? additionsLabel.trim() : null)
            : uniqueAges.length === 1
              ? `${breed ? `${breed} - ` : ''}${uniqueAges[0]} ${lang === 'en' ? 'weeks' : 'uker'}${additionsLabel}`
              : `${breed ? `${breed} - ` : ''}${uniqueAges[0]}-${uniqueAges[uniqueAges.length - 1]} ${
                  lang === 'en' ? 'weeks' : 'uker'
                }${additionsLabel}`,
      };
    }

    const boxSize = toNumber(details.box_size);
    const extras = Array.isArray(details.order_extras) ? (details.order_extras as Array<Record<string, unknown>>) : [];
    const extrasLabel =
      extras.length > 0 ? `${lang === 'en' ? ' + ' : ' + '}${extras.length} ${lang === 'en' ? 'extras' : 'tillegg'}` : '';
    return {
      primary: boxSize > 0 ? `${boxSize.toLocaleString(locale)} kg` : copy.notProvided,
      secondary: `${String(details.ribbe_choice || '').trim() || ''}${extrasLabel}` || null,
    };
  }

  async function openOrderContentModal(order: CustomerOrderSummary) {
    const key = orderKey(order);
    setContentModalOrder(order);
    setContentModalOpen(true);

    if (orderDetails[key]) return;
    try {
      setContentModalLoadingKey(key);
      await loadOrderDetail(order);
    } finally {
      setContentModalLoadingKey((current) => (current === key ? null : current));
    }
  }

  function getOrderPaymentRows(
    order: CustomerOrderSummary,
    detailArg?: Record<string, unknown>
  ) {
    const detail = (detailArg || orderDetails[orderKey(order)] || order.details || {}) as Record<string, unknown>;
    const payments =
      order.source === 'egg'
        ? ((detail.egg_payments as Array<Record<string, unknown>> | undefined) || [])
        : order.source === 'chicken'
          ? ((detail.chicken_payments as Array<Record<string, unknown>> | undefined) || [])
          : ((detail.payments as Array<Record<string, unknown>> | undefined) || []);

    return payments.map((payment, index) => {
      const paymentType = String(payment.payment_type || '').trim();
      const status = String(payment.status || '').trim();
      const label =
        paymentType === 'deposit'
          ? (lang === 'en' ? 'Deposit paid' : 'Forskudd betalt')
          : paymentType === 'remainder'
            ? (lang === 'en' ? 'Remainder paid' : 'Restbetaling betalt')
            : paymentType === 'addition_deposit'
              ? (lang === 'en' ? 'Extra eggs paid' : 'Ekstra egg betalt')
              : paymentType === 'refund'
                ? (lang === 'en' ? 'Refund' : 'Refusjon')
                : paymentType || copy.notProvided;

      return {
        key: `${orderKey(order)}:payment:${String(payment.id || index)}`,
        kind: paymentType,
        label,
        amountNok: toNumber(payment.amount_nok),
        status,
        statusLabel: copy.statusLabels[status as keyof typeof copy.statusLabels] || status || copy.notProvided,
        date: String(payment.paid_at || payment.created_at || '').trim() || null,
        dateLabel: payment.paid_at ? (lang === 'en' ? 'Paid' : 'Betalt') : orderCreatedLabel,
      };
    });
  }

  function getOrderBalanceMeta(
    order: CustomerOrderSummary,
    paymentRows: Array<{ kind: string; status: string }>
  ) {
    const total = toNumber(order.total_amount);
    const paid = toNumber(order.paid_amount);
    const remaining = Math.max(0, total - paid);
    const hasCompletedRemainder = paymentRows.some(
      (payment) => payment.kind === 'remainder' && payment.status === 'completed'
    );
    const currentBalanceLabel =
      remaining > 0 && hasCompletedRemainder
        ? (lang === 'en' ? 'New changes' : 'Nye endringer')
        : ((copy as any).orderCardRemainingLabel || (lang === 'en' ? 'Remaining' : 'Rest'));
    const balanceNote =
      remaining > 0 && hasCompletedRemainder
        ? (lang === 'en'
            ? 'The earlier remainder was already paid. The amount left now comes from later changes or additions.'
            : 'Tidligere restbetaling er allerede mottatt. Belopet som star igjen kommer fra senere endringer eller tillegg.')
        : null;

    return { total, paid, remaining, currentBalanceLabel, balanceNote };
  }

  function getOrderContentModalData(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const detail = (orderDetails[key] || order.details || {}) as Record<string, unknown>;
    const lines: Array<{ key: string; label: string; quantity: string; amount?: string | null }> = [];
    const paymentRows = getOrderPaymentRows(order, detail);
    const balanceMeta = getOrderBalanceMeta(order, paymentRows);

    if (order.source === 'egg') {
      const baseBreed = String(
        (detail.egg_breeds as Record<string, unknown> | undefined)?.name || detail.breed_name || copy.notProvided
      );
      const baseQty = toNumber(detail.quantity);
      lines.push({
        key: `${key}:base`,
        label: lang === 'en' ? 'Base order' : 'Grunnbestilling',
        quantity: `${baseQty.toLocaleString(locale)} ${copy.fieldLabels.quantity}`,
      });

      const additions = ((detail.egg_order_additions as Array<Record<string, unknown>> | undefined) ||
        (detail.additions as Array<Record<string, unknown>> | undefined) ||
        []) as Array<Record<string, unknown>>;

      additions.forEach((addition, index) => {
        const additionBreed = String(
          (addition.egg_breeds as Record<string, unknown> | undefined)?.name || copy.notProvided
        );
        const qty = toNumber(addition.quantity);
        const subtotalOre = toNumber(addition.subtotal);
        lines.push({
          key: `${key}:addition:${index}`,
          label: lang === 'en' ? 'Extra eggs' : 'Ekstra egg',
          quantity: `${qty.toLocaleString(locale)} ${copy.fieldLabels.quantity}`,
          amount: subtotalOre > 0 ? `${currency} ${(subtotalOre / 100).toLocaleString(locale)}` : null,
        });
      });

      const totalQty = lines.reduce((sum, line) => {
        const parsed = Number(String(line.quantity).split(' ')[0].replace(/[^0-9]/g, ''));
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);

      return {
        summary: `${totalQty.toLocaleString(locale)} ${copy.fieldLabels.quantity}`,
        lines,
        paymentRows,
        currentBalanceLabel: balanceMeta.currentBalanceLabel,
        balanceNote: balanceMeta.balanceNote,
      };
    }

    if (order.source === 'chicken') {
      const baseBreed = String(
        (detail.chicken_breeds as Record<string, unknown> | undefined)?.name ||
          detail.breed_name ||
          copy.notProvided
      );
      const pickupDate = (() => {
        const raw = String(detail.pickup_monday || '').trim();
        if (!raw) return null;
        const date = new Date(raw);
        return Number.isFinite(date.getTime()) ? date : null;
      })();
      const baseHens = toNumber(detail.quantity_hens);
      const baseRoosters = toNumber(detail.quantity_roosters);
      const formatBirds = (hens: number, roosters: number) =>
        roosters > 0
          ? `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens} + ${roosters.toLocaleString(locale)} ${copy.fieldLabels.roosters}`
          : `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens}`;
      const getAdditionAgeWeeks = (addition: Record<string, unknown>) => {
        const explicitAge = toNumber(addition.age_weeks_at_pickup, 0);
        if (explicitAge > 0) return explicitAge;
        const hatchDate = String(
          ((addition.chicken_hatches as Record<string, unknown> | undefined)?.hatch_date as string | undefined) || ''
        ).trim();
        if (!hatchDate || !pickupDate) return 0;
        const hatch = new Date(hatchDate);
        if (!Number.isFinite(hatch.getTime())) return 0;
        const diffMs = pickupDate.getTime() - hatch.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
        return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      };

      const additions = ((detail.chicken_order_additions as Array<Record<string, unknown>> | undefined) ||
        (detail.additions as Array<Record<string, unknown>> | undefined) ||
        []) as Array<Record<string, unknown>>;

      const additionsSubtotal = additions.reduce((sum, addition) => sum + getChickenAdditionSubtotal(addition), 0);
      const baseSubtotal = getChickenBaseSubtotal({
        baseHens,
        baseRoosters,
        pricePerHen: toNumber(detail.price_per_hen_nok),
        pricePerRooster: toNumber(detail.price_per_rooster_nok),
        totalAmount: toNumber(order.total_amount),
        deliveryFee: toNumber(detail.delivery_fee_nok),
        additionsSubtotal,
      });

      lines.push({
        key: `${key}:base`,
        label: lang === 'en' ? 'Base order' : 'Grunnbestilling',
        quantity: `${baseBreed} - ${formatBirds(baseHens, baseRoosters)}${
          toNumber(detail.age_weeks_at_pickup, 0) > 0
            ? ` · ${toNumber(detail.age_weeks_at_pickup, 0)} ${lang === 'en' ? 'weeks' : 'uker'}`
            : ''
        }`,
        amount: baseSubtotal > 0 ? `${currency} ${baseSubtotal.toLocaleString(locale)}` : null,
      });

      additions.forEach((addition, index) => {
        const additionBreed = String(
          (addition.chicken_breeds as Record<string, unknown> | undefined)?.name || copy.notProvided
        );
        const hens = toNumber(addition.quantity_hens);
        const roosters = toNumber(addition.quantity_roosters);
        const additionSubtotal = getChickenAdditionSubtotal(addition);
        const additionAge = getAdditionAgeWeeks(addition);
        lines.push({
          key: `${key}:addition:${index}`,
          label: lang === 'en' ? 'Extra chickens' : 'Ekstra kyllinger',
          quantity: `${additionBreed} - ${formatBirds(hens, roosters)}${
            additionAge > 0 ? ` · ${additionAge} ${lang === 'en' ? 'weeks' : 'uker'}` : ''
          }`,
          amount: additionSubtotal > 0 ? `${currency} ${additionSubtotal.toLocaleString(locale)}` : null,
        });
      });

      const totals = lines.reduce(
        (acc, line) => {
          if (line.quantity.includes(copy.fieldLabels.roosters)) {
            const parts = line.quantity.split('+');
            const hens = Number(parts[0]?.replace(/[^0-9]/g, '') || 0);
            const roosters = Number(parts[1]?.replace(/[^0-9]/g, '') || 0);
            acc.hens += Number.isFinite(hens) ? hens : 0;
            acc.roosters += Number.isFinite(roosters) ? roosters : 0;
          } else {
            const hens = Number(line.quantity.replace(/[^0-9]/g, '') || 0);
            acc.hens += Number.isFinite(hens) ? hens : 0;
          }
          return acc;
        },
        { hens: 0, roosters: 0 }
      );

      return {
        summary:
          totals.roosters > 0
            ? `${totals.hens.toLocaleString(locale)} ${copy.fieldLabels.hens} + ${totals.roosters.toLocaleString(locale)} ${copy.fieldLabels.roosters}`
            : `${totals.hens.toLocaleString(locale)} ${copy.fieldLabels.hens}`,
        lines,
        paymentRows,
        currentBalanceLabel: balanceMeta.currentBalanceLabel,
        balanceNote: balanceMeta.balanceNote,
      };
    }

    const boxSize = toNumber(detail.box_size);
    const boxLabel = boxSize > 0 ? `${boxSize.toLocaleString(locale)} kg` : copy.notProvided;
    const extras = (detail.order_extras as Array<Record<string, unknown>> | undefined) || [];
    const extrasTotal = extras.reduce((sum, extra) => sum + toNumber(extra.total_price || extra.price_nok), 0);
    const baseOrderTotal = Math.max(0, toNumber(order.total_amount) - extrasTotal);
    lines.push({
      key: `${key}:base`,
      label: lang === 'en' ? 'Base order' : 'Grunnbestilling',
      quantity: `${boxLabel} - ${String(detail.ribbe_choice || copy.notProvided)}`,
      amount: baseOrderTotal > 0 ? `${currency} ${baseOrderTotal.toLocaleString(locale)}` : null,
    });

    extras.forEach((extra, index) => {
      const name = String(
        (lang === 'en'
          ? (extra.extras_catalog as Record<string, unknown> | undefined)?.name_en
          : (extra.extras_catalog as Record<string, unknown> | undefined)?.name_no) ||
          extra.name ||
          copy.notProvided
      );
      const qty = toNumber(extra.quantity);
      const totalPrice = toNumber(extra.total_price || extra.price_nok);
      lines.push({
        key: `${key}:extra:${index}`,
        label: lang === 'en' ? 'Extra product' : 'Tilleggsprodukt',
        quantity: `${name} - ${qty.toLocaleString(locale)}x`,
        amount: totalPrice > 0 ? `${currency} ${totalPrice.toLocaleString(locale)}` : null,
      });
    });

    return {
      summary: boxLabel,
      lines,
      paymentRows,
      currentBalanceLabel: balanceMeta.currentBalanceLabel,
      balanceNote: balanceMeta.balanceNote,
    };
  }

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return customers;
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        (customer.phone || '').includes(search)
      );
    });
  }, [customers, searchTerm]);

  function renderOrderDetails(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const detail = orderDetails[key];
    const draft = orderDrafts[key] || {};
    const isLoadingOrder = loadingOrder === key;
    const isSavingOrder = savingOrder === key;

    if (isLoadingOrder || !detail) {
      return (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.orderDetailsLoading}
          </span>
        </div>
      );
    }

    const statusOptions = Object.keys(copy.statusLabels || {});
    const deliveryOptions =
      order.source === 'egg'
        ? ['posten', 'e6_pickup', 'farm_pickup']
        : order.source === 'chicken'
          ? ['farm_pickup', 'delivery_namsos_trondheim']
          : [];

    const additions =
      order.source === 'egg'
        ? ((detail.egg_order_additions as Array<Record<string, unknown>> | undefined) || [])
        : order.source === 'chicken'
          ? ((detail.chicken_order_additions as Array<Record<string, unknown>> | undefined) || [])
          : [];

    const hasBaseLine = order.source === 'egg' || order.source === 'chicken';
    const content = getOrderContentModalData(order);
    const paymentRows = getOrderPaymentRows(order, detail);
    const balanceMeta = getOrderBalanceMeta(order, paymentRows);

    return (
      <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input value={String(draft.customerName || '')} onChange={(e) => updateDraft(order, 'customerName', e.target.value)} placeholder={copy.fieldLabels.customerName} />
          <Input value={String(draft.customerEmail || '')} onChange={(e) => updateDraft(order, 'customerEmail', e.target.value)} placeholder={copy.fieldLabels.customerEmail} />
          <Input value={String(draft.customerPhone || '')} onChange={(e) => updateDraft(order, 'customerPhone', e.target.value)} placeholder={copy.fieldLabels.customerPhone} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={String(draft.status || '')} onChange={(e) => updateDraft(order, 'status', e.target.value)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {copy.statusLabels[status as keyof typeof copy.statusLabels] || status}
              </option>
            ))}
          </select>

          {order.source === 'egg' && (
            <>
              <Input type="number" min={0} value={String(draft.quantity ?? '')} onChange={(e) => updateDraft(order, 'quantity', e.target.value)} placeholder={copy.fieldLabels.quantity} />
              <Input type="number" min={0} value={String(draft.pricePerEgg ?? '')} onChange={(e) => updateDraft(order, 'pricePerEgg', e.target.value)} placeholder={copy.fieldLabels.pricePerEgg} />
            </>
          )}

          {order.source === 'chicken' && (
            <>
              <Input type="number" min={0} value={String(draft.quantityHens ?? '')} onChange={(e) => updateDraft(order, 'quantityHens', e.target.value)} placeholder={copy.fieldLabels.hens} />
              <Input type="number" min={0} value={String(draft.quantityRoosters ?? '')} onChange={(e) => updateDraft(order, 'quantityRoosters', e.target.value)} placeholder={copy.fieldLabels.roosters} />
              <Input type="number" min={0} value={String(draft.pickupYear ?? '')} onChange={(e) => updateDraft(order, 'pickupYear', e.target.value)} placeholder={copy.fieldLabels.pickupYear} />
              <Input type="number" min={0} value={String(draft.pickupWeek ?? '')} onChange={(e) => updateDraft(order, 'pickupWeek', e.target.value)} placeholder={copy.fieldLabels.pickupWeek} />
              <Input type="number" min={0} value={String(draft.pricePerHenNok ?? '')} onChange={(e) => updateDraft(order, 'pricePerHenNok', e.target.value)} placeholder={copy.fieldLabels.pricePerHen} />
              <Input type="number" min={0} value={String(draft.pricePerRoosterNok ?? '')} onChange={(e) => updateDraft(order, 'pricePerRoosterNok', e.target.value)} placeholder={copy.fieldLabels.pricePerRooster} />
            </>
          )}
        </div>

        {deliveryOptions.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={String(draft.deliveryMethod || '')} onChange={(e) => updateDraft(order, 'deliveryMethod', e.target.value)}>
              {deliveryOptions.map((method) => (
                <option key={method} value={method}>
                  {copy.deliveryMethodLabels[method as keyof typeof copy.deliveryMethodLabels] || method}
                </option>
              ))}
            </select>
            <Input type="number" min={0} value={String(order.source === 'egg' ? draft.deliveryFee ?? '' : draft.deliveryFeeNok ?? '')} onChange={(e) => updateDraft(order, order.source === 'egg' ? 'deliveryFee' : 'deliveryFeeNok', e.target.value)} placeholder={copy.fieldLabels.deliveryFee} />
            <Input type="date" value={String(draft.remainderDueDate || '')} onChange={(e) => updateDraft(order, 'remainderDueDate', e.target.value)} placeholder={copy.fieldLabels.remainderDueDate} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Textarea value={String(draft.notes || '')} onChange={(e) => updateDraft(order, 'notes', e.target.value)} placeholder={copy.fieldLabels.notes} rows={2} />
          <Textarea value={String(draft.adminNotes || '')} onChange={(e) => updateDraft(order, 'adminNotes', e.target.value)} placeholder={copy.fieldLabels.adminNotes} rows={2} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            {copy.fieldLabels.orderId}: {String(detail.id || '')}
          </p>
          <Button onClick={() => saveOrder(order)} disabled={isSavingOrder}>
            {isSavingOrder ? copy.savingOrderButton : copy.saveOrderButton}
          </Button>
        </div>

        {balanceMeta.balanceNote ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">
              {balanceMeta.currentBalanceLabel}: {currency} {balanceMeta.remaining.toLocaleString(locale)}
            </p>
            <p className="mt-1 text-xs">{balanceMeta.balanceNote}</p>
          </div>
        ) : null}

        <div>
          <h4 className="font-semibold text-neutral-900">{copy.paymentsInfoTitle}</h4>
          {paymentRows.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">{copy.noPayments}</p>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              {paymentRows.map((payment) => (
                <div key={payment.key} className="rounded border p-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">{payment.label}</p>
                      <p className="text-xs text-neutral-500">{payment.statusLabel}</p>
                      {payment.date ? (
                        <p className="text-xs text-neutral-500">
                          {payment.dateLabel}: {new Date(payment.date).toLocaleString(locale)}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {currency} {payment.amountNok.toLocaleString(locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(hasBaseLine || additions.length > 0 || content.lines.length > 0) && (
          <div>
            <h4 className="font-semibold text-neutral-900">{copy.additionsInfoTitle}</h4>
            <div className="mt-2 space-y-1 text-sm">
              {content.lines.length === 0 ? (
                <p className="text-sm text-neutral-500">{copy.noAdditions}</p>
              ) : (
                content.lines.map((line) => (
                  <div key={line.key} className="rounded border p-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-900">{line.label}</p>
                        <p className="text-xs text-neutral-500">{line.quantity}</p>
                      </div>
                      {line.amount ? <p className="font-semibold text-neutral-900">{line.amount}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-600" />
      </div>
    );
  }

  if (showProfile && selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowProfile(false)} variant="outline">
            {copy.backToList}
          </Button>
          <Button
            onClick={openSupportMessageComposer}
            disabled={!selectedCustomer.email && !selectedCustomer.phone}
            variant="outline"
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            {copy.sendMessageButton}
          </Button>
          <Button
            onClick={() =>
              impersonateCustomer({
                customer_id: selectedCustomer.customer_id,
                email: selectedCustomer.email,
                phone: selectedCustomer.phone,
                name: selectedCustomer.name,
              })
            }
            variant="outline"
          >
            <LogIn className="mr-1 h-4 w-4" />
            {copy.impersonateButton}
          </Button>
        </div>

        <Card className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
              <p className="text-sm text-neutral-600">
                {(copy as any).profileSubtitle ||
                  (lang === 'en' ? 'Unified customer profile across all products.' : 'Samlet kundeprofil på tvers av alle produkter.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Boolean(customers.find((entry) => entry.customer_id === selectedCustomer.customer_id)?.at_risk) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  {copy.atRiskTag}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={openCreateEggOrderModal}>
                <Package className="mr-1.5 h-4 w-4" />
                {lang === 'en' ? 'Add egg order' : 'Ny rugeeggordre'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.totalOrdersLabel}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {toNumber(selectedCustomer.total_orders).toLocaleString(locale)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.completedLabel}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {toNumber(selectedCustomer.completed_orders).toLocaleString(locale)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.totalSpentLabel}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {currency} {toNumber(selectedCustomer.total_spent).toLocaleString(locale)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.averagePerOrderLabel}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {currency} {toNumber(selectedCustomer.avg_order_value).toLocaleString(locale)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.emailLabel}</p>
                <p className="font-semibold">{selectedCustomer.email || copy.notProvided}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.phoneLabel}</p>
                <p className="font-semibold">{selectedCustomer.phone || copy.notProvided}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.firstOrderLabel}</p>
                <p className="font-semibold">{new Date(selectedCustomer.first_order_date).toLocaleDateString(locale)}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{copy.orderHistoryTitle}</h3>
              <p className="text-xs text-neutral-500">
                {(copy as any).orderHistoryHint ||
                  (lang === 'en'
                    ? 'Quick actions: details, resend confirmation, edit.'
                    : 'Hurtighandlinger: detaljer, send bekreftelse på nytt, rediger.')}
              </p>
            </div>
            {selectedCustomer.orders.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {(copy as any).noOrdersForCustomer ||
                  (lang === 'en' ? 'No orders registered for this customer.' : 'Ingen ordrer registrert for denne kunden.')}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedCustomer.orders.map((order) => {
                  const key = orderKey(order);
                  const expanded = expandedOrder === key;
                  const orderStatus =
                    copy.statusLabels[order.status as keyof typeof copy.statusLabels] || order.status;
                  const sourceLabel =
                    copy.sourceLabels[order.source as keyof typeof copy.sourceLabels] || order.source;
                  const total = toNumber(order.total_amount);
                  const paid = toNumber(order.paid_amount);
                  const remaining = Math.max(0, total - paid);
                  const itemSummary = getOrderItemSummary(order);
                  const isResending = emailActionLoading === `order-resend:${key}`;
                  const isOpeningContents = contentModalLoadingKey === key;
                  const orderDets = (order.details || {}) as Record<string, unknown>;
                  const isLocked = Boolean(orderDets.locked_at);
                  const remainderEnabled = Boolean(orderDets.remainder_payment_enabled);
                  // Statuses where payment is complete or the order is closed
                  const paymentClosedStatuses = ['fully_paid', 'completed', 'cancelled', 'forfeited', 'picked_up'];
                  const paymentOpen = !paymentClosedStatuses.includes(order.status);
                  const canLock = order.source === 'egg' || order.source === 'pig';
                  const canCollectRemainder = remaining > 0 && paymentOpen;
                  // Enable remainder: only if not already enabled and deposit-stage statuses
                  const depositPaidStatuses = ['deposit_paid', 'partially_paid'];
                  const canEnableRemainder = (order.source === 'chicken' || order.source === 'pig')
                    && remaining > 0
                    && !remainderEnabled
                    && depositPaidStatuses.includes(order.status);
                  const canMarkShipped = order.source === 'egg' && !['shipped', 'completed', 'cancelled', 'fully_paid'].includes(order.status);
                  // Dataavvik correction: chicken orders only — status closed but remainder unpaid
                  const canCorrectStatus = order.source === 'chicken'
                    && ['fully_paid', 'completed'].includes(order.status)
                    && remaining > 0;
                  const isCollecting = orderActionLoading === `collect-remainder:${key}`;
                  const isEnabling = orderActionLoading === `enable-remainder:${key}`;
                  const isShipping = orderActionLoading === `mark-shipped:${key}`;
                  const isLocking = orderActionLoading === `lock:${key}`;
                  const isCorrecting = orderActionLoading === `correct-status:${key}`;

                  // Egg action loading helpers
                  const eggActionIs = (action: string) => eggActionLoading === `${action}:${order.order_id}`;

                  // Source-specific capability flags
                  const canMarkPickedUp = order.source === 'chicken' && order.status === 'ready_for_pickup';
                  const canSendPickupEmail = (order.source === 'chicken' || order.source === 'pig')
                    && ['deposit_paid', 'fully_paid', 'ready_for_pickup'].includes(order.status);
                  const canAdjustBirds = order.source === 'chicken'
                    && !['cancelled', 'picked_up'].includes(order.status);
                  const canSyncPigAmounts = order.source === 'pig';
                  const canSetPickupDate = order.source === 'pig'
                    && !['cancelled', 'forfeited', 'completed'].includes(order.status);
                  const canEggFinancials = order.source === 'egg'
                    && !['cancelled', 'forfeited'].includes(order.status);
                  const canMoveWeek = order.source === 'egg'
                    && !['cancelled', 'forfeited', 'delivered', 'completed'].includes(order.status);
                  const canSendRemainderReminder = order.source === 'egg'
                    && order.status === 'deposit_paid';
                  const canAddChickenAddition = order.source === 'chicken'
                    && !['cancelled', 'picked_up'].includes(order.status);
                  const pigDetail = order.source === 'pig' ? (orderDetails[key] || {}) as Record<string, unknown> : null;
                  return (
                    <div key={key} className="rounded-2xl border border-neutral-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-neutral-900">{order.order_number}</p>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                              {sourceLabel}
                            </span>
                            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                              {orderStatus}
                            </span>
                            {isLocked && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {lang === 'en' ? 'Locked' : 'Låst'}
                              </span>
                            )}
                          {!paymentOpen && remaining > 0 && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={lang === 'en' ? 'Status says paid but amount does not match' : 'Status sier betalt, men beløp stemmer ikke'}>
                                {lang === 'en' ? 'Data mismatch' : 'Dataavvik'}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-neutral-600">
                            {orderCreatedLabel}:{' '}
                            {new Date(order.created_at).toLocaleString(locale, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => toggleOrder(order)}>
                            {expanded ? (
                              <>
                                <ChevronUp className="mr-1 h-4 w-4" />
                                {copy.orderDetailsHideButton}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="mr-1 h-4 w-4" />
                                {copy.orderDetailsButton}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendOrderConfirmation(order)}
                            disabled={isResending}
                          >
                            {isResending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
                            {isResending ? (lang === 'en' ? 'Sending...' : 'Sender...') : (lang === 'en' ? 'Resend' : 'Send bekr.')}
                          </Button>
                          {canCollectRemainder && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCollectRemainderModal({ order, defaultAmount: remaining });
                                setCollectAmountInput('');
                                setCollectNoteInput('');
                              }}
                              disabled={isCollecting}
                            >
                              {isCollecting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wallet className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Collect' : 'Innkrev rest'}
                            </Button>
                          )}
                          {canEnableRemainder && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enableRemainder(order)}
                              disabled={isEnabling}
                            >
                              {isEnabling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Enable remainder' : 'Aktiver rest'}
                            </Button>
                          )}
                          {canCorrectStatus && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => correctOrderStatus(order)}
                              disabled={isCorrecting}
                              title={lang === 'en' ? 'Reset status to deposit_paid and void phantom payments' : 'Tilbakestill status og annuller phantom-betalinger'}
                            >
                              {isCorrecting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Correct status' : 'Korriger status'}
                            </Button>
                          )}
                          {canMarkShipped && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setShipModal(order); setTrackingNumberInput(''); }}
                              disabled={isShipping}
                            >
                              {isShipping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Truck className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Mark shipped' : 'Merk sendt'}
                            </Button>
                          )}
                          {canLock && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleLockOrder(order)}
                              disabled={isLocking}
                            >
                              {isLocking ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : isLocked ? <Unlock className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
                              {isLocked ? (lang === 'en' ? 'Unlock' : 'Lås opp') : (lang === 'en' ? 'Lock' : 'Lås')}
                            </Button>
                          )}

                          {/* ── Egg financial overrides ─────────────────────── */}
                          {canEggFinancials && (
                            <>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => runEggOrderAction(order, 'mark_deposit_paid')}
                                disabled={!!eggActionLoading}
                              >
                                {eggActionIs('mark_deposit_paid') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wallet className="mr-1 h-4 w-4" />}
                                {lang === 'en' ? 'Dep. paid' : 'Dep. betalt'}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => runEggOrderAction(order, 'mark_remainder_paid')}
                                disabled={!!eggActionLoading}
                              >
                                {eggActionIs('mark_remainder_paid') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wallet className="mr-1 h-4 w-4" />}
                                {lang === 'en' ? 'Rest paid' : 'Rest betalt'}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => runEggOrderAction(order, 'sync_status')}
                                disabled={!!eggActionLoading}
                              >
                                {eggActionIs('sync_status') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                                {lang === 'en' ? 'Sync' : 'Synkroniser'}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => runEggOrderAction(order, 'mark_deposit_refunded')}
                                disabled={!!eggActionLoading}
                              >
                                {eggActionIs('mark_deposit_refunded') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                {lang === 'en' ? 'Dep. refunded' : 'Dep. refundert'}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => runEggOrderAction(order, 'mark_remainder_refunded')}
                                disabled={!!eggActionLoading}
                              >
                                {eggActionIs('mark_remainder_refunded') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                {lang === 'en' ? 'Rest refunded' : 'Rest refundert'}
                              </Button>
                              <Button
                                variant="destructive" size="sm"
                                onClick={() => setEggActionConfirm({
                                  order,
                                  action: 'refund_deposit',
                                  title: lang === 'en' ? 'Refund deposit' : 'Refunder depositum',
                                  description: lang === 'en' ? 'This will initiate a Vipps refund for the deposit.' : 'Dette starter en Vipps-refusjon for depositumet.',
                                })}
                                disabled={!!eggActionLoading}
                              >
                                {lang === 'en' ? 'Refund dep.' : 'Refunder dep.'}
                              </Button>
                              <Button
                                variant="destructive" size="sm"
                                onClick={() => setEggActionConfirm({
                                  order,
                                  action: 'cancel_order',
                                  title: lang === 'en' ? 'Cancel order' : 'Kanseller ordre',
                                  description: lang === 'en' ? 'Cancel and release inventory. No refund will be issued.' : 'Kansellerer og frigjør lager. Ingen refusjon utføres.',
                                })}
                                disabled={!!eggActionLoading}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                {lang === 'en' ? 'Cancel' : 'Kanseller'}
                              </Button>
                              <Button
                                variant="destructive" size="sm"
                                onClick={() => setEggActionConfirm({
                                  order,
                                  action: 'cancel_and_refund',
                                  title: lang === 'en' ? 'Cancel & refund' : 'Kanseller og refunder',
                                  description: lang === 'en' ? 'Cancel, release inventory, and initiate a full Vipps refund.' : 'Kansellerer, frigjør lager og starter full Vipps-refusjon.',
                                })}
                                disabled={!!eggActionLoading}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                {lang === 'en' ? 'Cancel & refund' : 'Kanseller & refunder'}
                              </Button>
                            </>
                          )}

                          {/* ── Egg week move ─────────────────────────────── */}
                          {canMoveWeek && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => {
                                const dets = (order.details || {}) as Record<string, unknown>;
                                setMoveWeekModal({ order, currentWeek: Number(dets.week_number || 0) });
                                setMoveWeekInput(String((order.details as any)?.week_number || ''));
                              }}
                              disabled={!!eggActionLoading}
                            >
                              <ArrowLeftRight className="mr-1 h-4 w-4" />
                              {lang === 'en' ? 'Move week' : 'Flytt uke'}
                            </Button>
                          )}

                          {/* ── Chicken actions ───────────────────────────── */}
                          {canMarkPickedUp && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => markChickenPickedUp(order)}
                              disabled={markPickedUpLoading === order.order_id}
                            >
                              {markPickedUpLoading === order.order_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Package className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Mark picked up' : 'Merk hentet'}
                            </Button>
                          )}
                          {canSendPickupEmail && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => sendPickupEmail(order)}
                              disabled={sendPickupEmailLoading === order.order_id}
                            >
                              {sendPickupEmailLoading === order.order_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Pickup email' : 'Send hentemelding'}
                            </Button>
                          )}
                          {canAdjustBirds && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => openAdjustBirdsModal(order)}
                            >
                              <Bird className="mr-1 h-4 w-4" />
                              {lang === 'en' ? 'Adjust birds' : 'Juster fugler'}
                            </Button>
                          )}

                          {/* ── Egg remainder reminder ────────────────────── */}
                          {canSendRemainderReminder && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => runEggOrderAction(order, 'send_remainder_reminder')}
                              disabled={!!eggActionLoading}
                            >
                              {eggActionIs('send_remainder_reminder') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Send reminder' : 'Send påminnelse'}
                            </Button>
                          )}

                          {/* ── Pig actions ───────────────────────────────── */}
                          {canSyncPigAmounts && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => syncPigAmounts(order)}
                              disabled={syncAmountsLoading === order.order_id}
                            >
                              {syncAmountsLoading === order.order_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                              {lang === 'en' ? 'Sync amounts' : 'Synk beløp'}
                            </Button>
                          )}
                          {canSetPickupDate && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => {
                                const d = String(pigDetail?.pickup_date || '');
                                const t = String(pigDetail?.pickup_time || '11:00');
                                setPickupDateModal({ order, currentDate: d, currentTime: t });
                                setPickupDateInput(d);
                                setPickupTimeInput(t || '11:00');
                              }}
                              disabled={pickupDateLoading === order.order_id}
                            >
                              {pickupDateLoading === order.order_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Calendar className="mr-1 h-4 w-4" />}
                              {pigDetail?.pickup_date
                                ? `${String(pigDetail.pickup_date)} ${String(pigDetail.pickup_time || '')}`
                                : (lang === 'en' ? 'Set pickup' : 'Sett henting')}
                            </Button>
                          )}

                          {/* ── Chicken add addition ─────────────────────── */}
                          {canAddChickenAddition && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => void openAddChickenAdditionModal(order)}
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              {lang === 'en' ? 'Add breed' : 'Legg til rase'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-neutral-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            {(copy as any).orderCardTotalLabel || (lang === 'en' ? 'Total' : 'Total')}
                          </p>
                          <p className="mt-1 text-base font-semibold text-neutral-900">
                            {currency} {total.toLocaleString(locale)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-neutral-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            {(copy as any).orderCardPaidLabel || (lang === 'en' ? 'Paid' : 'Betalt')}
                          </p>
                          <p className="mt-1 text-base font-semibold text-neutral-900">
                            {currency} {paid.toLocaleString(locale)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-neutral-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            {(copy as any).orderCardRemainingLabel || (lang === 'en' ? 'Remaining' : 'Rest')}
                          </p>
                          <p className="mt-1 text-base font-semibold text-neutral-900">
                            {currency} {remaining.toLocaleString(locale)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:bg-neutral-50"
                          onClick={() => void openOrderContentModal(order)}
                        >
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            {(copy as any).orderCardItemsLabel || (lang === 'en' ? 'Items' : 'Innhold')}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-neutral-900">{itemSummary.primary}</p>
                          {itemSummary.secondary && (
                            <p className="text-xs text-neutral-600">{itemSummary.secondary}</p>
                          )}
                          <p className="mt-2 text-xs text-neutral-500">
                            {isOpeningContents
                              ? ((copy as any).orderCardItemsLoading ||
                                (lang === 'en' ? 'Loading full contents...' : 'Laster fullt innhold...'))
                              : ((copy as any).orderCardItemsOpen ||
                                (lang === 'en' ? 'Open full contents' : 'Se fullt innhold'))}
                          </p>
                        </button>
                      </div>
                      {expanded && renderOrderDetails(order)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">{copy.communicationTitle}</h3>
            <p className="mb-3 text-sm text-neutral-600">{copy.communicationSubtitle}</p>
            <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {copy.supportThreadsTitle}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {copy.supportThreadsSubtitle}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedCustomer.email
                      ? copy.supportMessageDeliveryEmail
                      : selectedCustomer.phone
                        ? copy.supportMessageDeliveryPortalOnly
                        : copy.supportMessageNoContact}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={openSupportMessageComposer}
                  disabled={!selectedCustomer.email && !selectedCustomer.phone}
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  {copy.sendMessageButton}
                </Button>
              </div>

              {selectedCustomer.support_threads && selectedCustomer.support_threads.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedCustomer.support_threads.map((thread) => {
                    const lastPublicReply = (thread.message_replies || [])
                      .filter((reply) => !reply.is_internal)
                      .slice(-1)[0];

                    const statusClass =
                      thread.status === 'open'
                        ? 'bg-amber-100 text-amber-800'
                        : thread.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : thread.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-neutral-200 text-neutral-700';

                    const threadStarter =
                      thread.initiated_by === 'admin'
                        ? thread.initiated_by_admin_name || t.adminMessagingPanel.farmSender
                        : selectedCustomer.name || copy.notProvided;

                    return (
                      <div key={thread.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-neutral-900">{thread.subject}</p>
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClass)}>
                                {supportThreadStatusLabels[thread.status]}
                              </span>
                              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                                {supportThreadPriorityLabels[thread.priority]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-neutral-600">
                              {copy.supportThreadStartedByLabel}:{' '}
                              {threadStarter}
                              {' • '}
                              {copy.supportThreadUpdatedLabel}:{' '}
                              {new Date(thread.updated_at).toLocaleString(locale)}
                              {thread.order_number
                                ? ` • ${copy.supportThreadOrderLabel}: ${thread.order_number}`
                                : ''}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{thread.message}</p>
                            {lastPublicReply ? (
                              <div className="mt-2 rounded-md border border-neutral-200 bg-white p-2">
                                <p className="text-xs font-medium text-neutral-700">
                                  {lastPublicReply.is_from_customer
                                    ? copy.supportThreadLastCustomerReply
                                    : copy.supportThreadLastFarmReply}
                                </p>
                                <p className="mt-1 text-xs text-neutral-600">{lastPublicReply.reply_text}</p>
                              </div>
                            ) : null}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openSupportThreadInMessages(thread.id)}>
                            {copy.supportThreadOpenButton}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-500">
                  {copy.noSupportThreads}
                </p>
              )}
            </div>
            <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {(copy as any).emailControlTitle || (lang === 'en' ? 'Email control' : 'E-postkontroll')}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {selectedCustomer.email_controls?.suppressed
                      ? `${(copy as any).emailControlStatusSuppressed || (lang === 'en' ? 'Suppressed' : 'Blokkert')}${
                          selectedCustomer.email_controls?.suppression_reason
                            ? ` - ${selectedCustomer.email_controls.suppression_reason}`
                            : ''
                        }`
                      : (copy as any).emailControlStatusActive || (lang === 'en' ? 'Active' : 'Aktiv')}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(copy as any).emailControlTotalsLabel || (lang === 'en' ? 'Emails' : 'E-poster')}:&nbsp;
                    {selectedCustomer.email_controls?.totals?.total ?? selectedCustomer.communications?.length ?? 0}
                    &nbsp;|&nbsp;
                    {(copy as any).emailControlSentLabel || (lang === 'en' ? 'sent' : 'sendt')}:&nbsp;
                    {selectedCustomer.email_controls?.totals?.sent ?? 0}
                    &nbsp;|&nbsp;
                    {(copy as any).emailControlFailedLabel || (lang === 'en' ? 'failed' : 'feilet')}:&nbsp;
                    {selectedCustomer.email_controls?.totals?.failed ?? 0}
                  </p>
                </div>
                {selectedCustomer.email && (
                  <Button
                    variant="outline"
                    onClick={() => toggleSuppression(!Boolean(selectedCustomer.email_controls?.suppressed))}
                    disabled={Boolean(emailActionLoading === 'suppress' || emailActionLoading === 'unsuppress')}
                  >
                    {selectedCustomer.email_controls?.suppressed
                      ? ((copy as any).emailAllowButton || (lang === 'en' ? 'Allow email' : 'Tillat e-post'))
                      : ((copy as any).emailSuppressButton || (lang === 'en' ? 'Suppress email' : 'Blokker e-post'))}
                  </Button>
                )}
              </div>
            </div>
            {selectedCustomer.email_consistency ? (
              <div
                className={cn(
                  'mb-4 rounded-lg border p-3',
                  selectedCustomer.email_consistency.ok
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      selectedCustomer.email_consistency.ok ? 'text-emerald-900' : 'text-amber-900'
                    )}
                  >
                    {lang === 'en' ? 'Email consistency' : 'E-postkonsistens'}
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      selectedCustomer.email_consistency.ok ? 'text-emerald-700' : 'text-amber-700'
                    )}
                  >
                    {lang === 'en'
                      ? `planned: ${selectedCustomer.email_consistency.planned}, sent: ${selectedCustomer.email_consistency.sent}, failed: ${selectedCustomer.email_consistency.failed}`
                      : `planlagt: ${selectedCustomer.email_consistency.planned}, sendt: ${selectedCustomer.email_consistency.sent}, feilet: ${selectedCustomer.email_consistency.failed}`}
                  </p>
                </div>
                {!selectedCustomer.email_consistency.ok ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
                    {(selectedCustomer.email_consistency.issues || []).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-emerald-800">
                    {lang === 'en'
                      ? 'No consistency issues detected for this customer.'
                      : 'Ingen konsistensavvik oppdaget for denne kunden.'}
                  </p>
                )}
              </div>
            ) : null}
            {selectedCustomer.scheduled_communications &&
            selectedCustomer.scheduled_communications.length > 0 ? (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-blue-900">
                    {(copy as any).scheduledEmailsTitle ||
                      (lang === 'en'
                        ? 'Upcoming automated emails'
                        : 'Planlagte automatiske e-poster')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedCustomer.scheduled_communications.length}
                  </p>
                </div>
                <div className="space-y-2">
                  {selectedCustomer.scheduled_communications.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className="cursor-pointer rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-xs text-neutral-700 transition-colors hover:bg-blue-50"
                      role="button"
                      tabIndex={0}
                      onClick={() => void openScheduledCommunicationPreview(entry)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void openScheduledCommunicationPreview(entry);
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-neutral-900">{entry.flow_key}</p>
                        <p className="text-neutral-600">
                          {entry.scheduled_for
                            ? new Date(entry.scheduled_for).toLocaleString(locale)
                            : copy.notProvided}
                        </p>
                      </div>
                      <p className="mt-1 text-neutral-600">
                        {entry.order_number
                          ? `${entry.order_number} (${entry.order_source || entry.entity_type})`
                          : `${entry.entity_type} ${entry.entity_id}`}
                      </p>
                      <p className="mt-1 text-neutral-600">
                        {(copy as any).communicationStatusLabel || (lang === 'en' ? 'Status' : 'Status')}:{' '}
                        {entry.status}
                        {entry.template_key ? ` – ${entry.template_key}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedCustomer.wishlist_requests && selectedCustomer.wishlist_requests.length > 0 ? (
              <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-purple-900">
                    {lang === 'en' ? 'Wishlist timeline' : 'Ønskeliste-tidslinje'}
                  </p>
                  <p className="text-xs text-purple-700">{selectedCustomer.wishlist_requests.length}</p>
                </div>
                <div className="space-y-2">
                  {selectedCustomer.wishlist_requests.slice(0, 12).map((request) => (
                    <div key={request.id} className="rounded-md border border-purple-200 bg-white/80 px-3 py-2 text-xs text-neutral-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-neutral-900">
                          {request.order_number
                            ? `${request.order_number} • ${request.source || ''}`
                            : `${request.source || 'standalone'} • ${request.priority || ''}`}
                        </p>
                        <p className="text-neutral-600">
                          {request.week_number && request.year
                            ? `${lang === 'en' ? 'Week' : 'Uke'} ${request.week_number}/${request.year}`
                            : copy.notProvided}
                        </p>
                      </div>
                      <p className="mt-1 text-neutral-600">
                        {(copy as any).communicationStatusLabel || (lang === 'en' ? 'Status' : 'Status')}:{' '}
                        {request.status || copy.notProvided}
                      </p>
                      {request.items && request.items.length > 0 ? (
                        <div className="mt-1 text-neutral-600">
                          {request.items.map((item) => (
                            <div key={item.id}>
                              {(item.breed_name || item.breed_id || copy.notProvided)}:{' '}
                              {lang === 'en'
                                ? `wanted ${item.qty_requested ?? 0}, allocated ${item.qty_allocated ?? 0}, remaining ${item.qty_remaining ?? 0}`
                                : `ønsket ${item.qty_requested ?? 0}, tildelt ${item.qty_allocated ?? 0}, igjen ${item.qty_remaining ?? 0}`}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {request.events && request.events.length > 0 ? (
                        <div className="mt-1 text-neutral-500">
                          {request.events.slice(0, 3).map((event) => (
                            <div key={event.id}>
                              {new Date(event.created_at).toLocaleString(locale)} - {event.event_type || 'event'}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedCustomer.communications && selectedCustomer.communications.length > 0 ? (
              <div className="space-y-2">
                {selectedCustomer.communications.map((entry) => (
                  <div
                    key={`${entry.source}-${entry.id}`}
                    className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-neutral-50"
                    role="button"
                    tabIndex={0}
                    onClick={() => void openCommunicationPreview(entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openCommunicationPreview(entry);
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.subject || copy.communicationNoSubject}</p>
                        <p className="text-xs text-neutral-600">
                          {copy.communicationTypeLabel}: {entry.classification}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {(copy as any).communicationStatusLabel || (lang === 'en' ? 'Status' : 'Status')}:{' '}
                          {entry.status}
                        </p>
                        {entry.templateKey && (
                          <p className="text-xs text-neutral-600">
                            {copy.communicationTemplateLabel}: {entry.templateKey}
                          </p>
                        )}
                        {entry.sourcePath && (
                          <p className="text-xs text-neutral-600">
                            {(copy as any).communicationSourcePathLabel || 'Source'}: {entry.sourcePath}
                          </p>
                        )}
                        {entry.lastError && (
                          <p className="text-xs text-red-600">
                            {(copy as any).communicationErrorLabel || (lang === 'en' ? 'Error' : 'Feil')}:{' '}
                            {entry.lastError}
                          </p>
                        )}
                        <p className="text-xs text-neutral-600">
                          {(entry.sentAt ? copy.communicationSentAtLabel : copy.communicationCreatedAtLabel)}:{' '}
                          {new Date(String(entry.sentAt || entry.createdAt || '')).toLocaleString(locale)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {(copy as any).communicationOpenPreviewHint ||
                            (lang === 'en' ? 'Click to open email preview' : 'Klikk for e-postforhåndsvisning')}
                        </p>
                      </div>
                      {entry.source === 'email_dispatch_queue' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void resendCommunication(entry);
                          }}
                          disabled={emailActionLoading === `resend:${entry.id}`}
                        >
                          {emailActionLoading === `resend:${entry.id}`
                            ? copy.savingOrderButton
                            : ((copy as any).resendEmailButton ||
                              (lang === 'en' ? 'Resend' : 'Send på nytt'))}
                        </Button>
                      )}
                    </div>
                    {entry.templateKey && entry.orderRefs && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {(copy as any).communicationOrderRefsLabel ||
                          (lang === 'en' ? 'Order refs' : 'Ordre-referanser')}
                        :{' '}
                        {[entry.orderRefs.orderId, entry.orderRefs.eggOrderId, entry.orderRefs.chickenOrderId]
                          .filter(Boolean)
                          .join(', ') || copy.notProvided}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{copy.noCommunications}</p>
            )}
          </div>
        </Card>

        <Dialog
          open={contentModalOpen}
          onOpenChange={(open) => {
            setContentModalOpen(open);
            if (!open) {
              setContentModalOrder(null);
              setContentModalLoadingKey(null);
            }
          }}
        >
          <DialogContent className="mx-4 sm:mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[86vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {(copy as any).orderCardItemsLabel || (lang === 'en' ? 'Items' : 'Innhold')}
                {contentModalOrder ? (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    {contentModalOrder.order_number}
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription>
                {(copy as any).orderContentModalDescription ||
                  (lang === 'en'
                    ? 'Full order contents, including base line and additions.'
                    : 'Fullt ordreinnhold, inkludert grunnlinje og tillegg.')}
              </DialogDescription>
            </DialogHeader>

            {!contentModalOrder ? null : (() => {
              const key = orderKey(contentModalOrder);
              const isLoadingContent = contentModalLoadingKey === key && !orderDetails[key];
              const content = getOrderContentModalData(contentModalOrder);
              const balanceMeta = getOrderBalanceMeta(contentModalOrder, content.paymentRows || []);
              const total = balanceMeta.total;
              const paid = balanceMeta.paid;
              const remaining = balanceMeta.remaining;

              if (isLoadingContent) {
                return (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {copy.orderDetailsLoading}
                    </span>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {(copy as any).orderCardTotalLabel || (lang === 'en' ? 'Total' : 'Total')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {currency} {total.toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {(copy as any).orderCardPaidLabel || (lang === 'en' ? 'Paid' : 'Betalt')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {currency} {paid.toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {content.currentBalanceLabel || (copy as any).orderCardRemainingLabel || (lang === 'en' ? 'Remaining' : 'Rest')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {currency} {remaining.toLocaleString(locale)}
                      </p>
                    </div>
                  </div>

                  {content.balanceNote ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-medium">
                        {(content.currentBalanceLabel || balanceMeta.currentBalanceLabel)}: {currency} {remaining.toLocaleString(locale)}
                      </p>
                      <p className="mt-1 text-xs">{content.balanceNote}</p>
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
                      <p className="text-sm font-medium text-neutral-900">
                        {(copy as any).orderCardItemsLabel || (lang === 'en' ? 'Items' : 'Innhold')}
                      </p>
                      <p className="text-xs text-neutral-600">{content.summary}</p>
                    </div>
                    <div className="divide-y divide-neutral-200">
                      {content.lines.map((line) => (
                        <div key={line.key} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{line.label}</p>
                            <p className="text-xs text-neutral-600">{line.quantity}</p>
                          </div>
                          {line.amount ? (
                            <p className="text-sm font-semibold text-neutral-900">{line.amount}</p>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
                      <p className="text-sm font-medium text-neutral-900">{copy.paymentsInfoTitle}</p>
                    </div>
                    <div className="divide-y divide-neutral-200">
                      {content.paymentRows && content.paymentRows.length > 0 ? (
                        content.paymentRows.map((payment: any) => (
                          <div key={payment.key} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{payment.label}</p>
                              <p className="text-xs text-neutral-600">{payment.statusLabel}</p>
                              {payment.date ? (
                                <p className="text-xs text-neutral-500">
                                  {payment.dateLabel}: {new Date(payment.date).toLocaleString(locale)}
                                </p>
                              ) : null}
                            </div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {currency} {Number(payment.amountNok || 0).toLocaleString(locale)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-neutral-500">{copy.noPayments}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog
          open={communicationModalOpen}
          onOpenChange={(open) => {
            setCommunicationModalOpen(open);
            if (!open) {
              setCommunicationPreview(null);
              setCommunicationPreviewLoading(null);
              setCommunicationPreviewMode('html');
            }
          }}
        >
          <DialogContent className="mx-4 sm:mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {(copy as any).communicationModalTitle ||
                  (lang === 'en' ? 'Email preview' : 'E-postforhåndsvisning')}
              </DialogTitle>
              <DialogDescription>
                {(copy as any).communicationModalDescription ||
                  (lang === 'en'
                    ? 'Preview of the email exactly as stored in the dispatch history.'
                    : 'Forhåndsvisning av e-posten slik den er lagret i utsendingshistorikken.')}
              </DialogDescription>
            </DialogHeader>

            {communicationPreviewLoading ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {(copy as any).communicationModalLoading ||
                    (lang === 'en' ? 'Loading email preview...' : 'Laster e-postforhåndsvisning...')}
                </span>
              </div>
            ) : communicationPreview ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700 sm:grid-cols-2">
                  <p>
                    <span className="font-medium">
                      {(copy as any).communicationModalSubjectLabel ||
                        (lang === 'en' ? 'Subject' : 'Emne')}
                      :
                    </span>{' '}
                    {communicationPreview.subject || copy.communicationNoSubject}
                  </p>
                  <p>
                    <span className="font-medium">
                      {(copy as any).communicationStatusLabel || (lang === 'en' ? 'Status' : 'Status')}
                      :
                    </span>{' '}
                    {communicationPreview.status}
                  </p>
                  <p>
                    <span className="font-medium">
                      {(copy as any).communicationTypeLabel || (lang === 'en' ? 'Type' : 'Type')}
                      :
                    </span>{' '}
                    {communicationPreview.classification}
                  </p>
                  <p>
                    <span className="font-medium">
                      {(copy as any).communicationTemplateLabel || (lang === 'en' ? 'Template' : 'Mal')}
                      :
                    </span>{' '}
                    {communicationPreview.templateKey || copy.notProvided}
                  </p>
                  <p>
                    <span className="font-medium">
                      {communicationPreview.scheduledFor
                        ? (lang === 'en' ? 'Planned send' : 'Planlagt sending')
                        : (copy as any).communicationSentAtLabel || (lang === 'en' ? 'Sent' : 'Sendt')}
                      :
                    </span>{' '}
                    {(communicationPreview.scheduledFor || communicationPreview.sentAt)
                      ? new Date(String(communicationPreview.scheduledFor || communicationPreview.sentAt)).toLocaleString(
                          locale
                        )
                      : copy.notProvided}
                  </p>
                  <p>
                    <span className="font-medium">
                      {(copy as any).communicationCreatedAtLabel || (lang === 'en' ? 'Created' : 'Opprettet')}
                      :
                    </span>{' '}
                    {communicationPreview.createdAt
                      ? new Date(communicationPreview.createdAt).toLocaleString(locale)
                      : copy.notProvided}
                  </p>
                </div>

                {communicationPreview.scheduleReason ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                    <p className="font-medium mb-1">
                      {lang === 'en' ? 'Why this email is scheduled' : 'Hvorfor denne e-posten er planlagt'}
                    </p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold">Flow:</span>{' '}
                        {communicationPreview.scheduleReason.flowKey || copy.notProvided}
                      </p>
                      <p>
                        <span className="font-semibold">Event:</span>{' '}
                        {communicationPreview.scheduleReason.eventType || copy.notProvided}
                      </p>
                      <p>
                        <span className="font-semibold">Template:</span>{' '}
                        {communicationPreview.scheduleReason.templateKey || copy.notProvided}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {lang === 'en' ? 'Product scope' : 'Produktscope'}:
                        </span>{' '}
                        {communicationPreview.scheduleReason.productScope || copy.notProvided}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {lang === 'en' ? 'Trigger date key' : 'Trigger-dato'}:
                        </span>{' '}
                        {communicationPreview.scheduleReason.triggerDateKey || copy.notProvided}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {lang === 'en' ? 'Offset days' : 'Offset dager'}:
                        </span>{' '}
                        {typeof communicationPreview.scheduleReason.triggerOffsetDays === 'number'
                          ? communicationPreview.scheduleReason.triggerOffsetDays
                          : copy.notProvided}
                      </p>
                    </div>
                    {communicationPreview.scheduleReason.condition ? (
                      <p className="mt-2">
                        <span className="font-semibold">{lang === 'en' ? 'Condition' : 'Betingelse'}:</span>{' '}
                        {communicationPreview.scheduleReason.condition}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {communicationPreview.text ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={communicationPreviewMode === 'html' ? 'default' : 'outline'}
                      onClick={() => setCommunicationPreviewMode('html')}
                    >
                      {lang === 'en' ? 'HTML view' : 'HTML-visning'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={communicationPreviewMode === 'text' ? 'default' : 'outline'}
                      onClick={() => setCommunicationPreviewMode('text')}
                    >
                      {lang === 'en' ? 'Text fallback' : 'Tekstfallback'}
                    </Button>
                  </div>
                ) : null}

                <div className="rounded-lg border border-neutral-200">
                  {communicationPreviewMode === 'text' && communicationPreview.text ? (
                    <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-white p-4 text-xs text-neutral-800">
                      {communicationPreview.text}
                    </pre>
                  ) : (
                    <iframe
                      title={communicationPreview.subject || 'Email preview'}
                      srcDoc={communicationPreview.html || ''}
                      sandbox=""
                      className="h-[60vh] w-full rounded-lg bg-white"
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                {(copy as any).communicationModalEmpty ||
                  (lang === 'en' ? 'No preview available.' : 'Ingen forhåndsvisning tilgjengelig.')}
              </p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={supportMessageComposerOpen}
          onOpenChange={(open) => {
            setSupportMessageComposerOpen(open);
            if (!open) {
              setSupportMessageDraft(createSupportMessageDraft());
            }
          }}
        >
          <DialogContent className="mx-4 sm:mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {copy.messageComposerTitle}
              </DialogTitle>
              <DialogDescription>
                {copy.messageComposerDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 sm:grid-cols-2">
                <p>
                  <span className="font-medium">{copy.emailLabel}:</span> {selectedCustomer.email || copy.notProvided}
                </p>
                <p>
                  <span className="font-medium">{copy.phoneLabel}:</span> {selectedCustomer.phone || copy.notProvided}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    {copy.messageComposerOrderLabel}
                  </label>
                  <select
                    value={supportMessageDraft.relatedOrderKey}
                    onChange={(event) =>
                      setSupportMessageDraft((current) => ({
                        ...current,
                        relatedOrderKey: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">
                      {copy.messageComposerOrderPlaceholder}
                    </option>
                    {selectedCustomer.orders.map((order) => (
                      <option key={orderKey(order)} value={orderKey(order)}>
                        {order.order_number} • {copy.sourceLabels[order.source]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    {copy.messageComposerTypeLabel}
                  </label>
                  <select
                    value={supportMessageDraft.messageType}
                    onChange={(event) =>
                      setSupportMessageDraft((current) => ({
                        ...current,
                        messageType: event.target.value as SupportThreadSummary['message_type'],
                      }))
                    }
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="support">{t.customerMessagingPanel.categorySupport}</option>
                    <option value="inquiry">{t.customerMessagingPanel.categoryInquiry}</option>
                    <option value="complaint">{t.customerMessagingPanel.categoryComplaint}</option>
                    <option value="feedback">{t.customerMessagingPanel.categoryFeedback}</option>
                    <option value="referral_question">{t.customerMessagingPanel.categoryReferralQuestion}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  {copy.messageComposerPriorityLabel}
                </label>
                <select
                  value={supportMessageDraft.priority}
                  onChange={(event) =>
                    setSupportMessageDraft((current) => ({
                      ...current,
                      priority: event.target.value as SupportThreadSummary['priority'],
                    }))
                  }
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="low">{supportThreadPriorityLabels.low}</option>
                  <option value="normal">{supportThreadPriorityLabels.normal}</option>
                  <option value="high">{supportThreadPriorityLabels.high}</option>
                  <option value="urgent">{supportThreadPriorityLabels.urgent}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  {copy.messageComposerSubjectLabel}
                </label>
                <Input
                  value={supportMessageDraft.subject}
                  onChange={(event) =>
                    setSupportMessageDraft((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder={
                    copy.messageComposerSubjectPlaceholder
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  {copy.messageComposerBodyLabel}
                </label>
                <Textarea
                  value={supportMessageDraft.message}
                  onChange={(event) =>
                    setSupportMessageDraft((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder={
                    copy.messageComposerBodyPlaceholder
                  }
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSupportMessageComposerOpen(false);
                    setSupportMessageDraft(createSupportMessageDraft());
                  }}
                >
                  {copy.messageComposerCancelButton}
                </Button>
                <Button type="button" onClick={() => void sendSupportMessageToCustomer()} disabled={supportMessageSending}>
                  {supportMessageSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {copy.messageComposerSendingButton}
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {copy.messageComposerSendButton}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Collect Remainder Modal */}
      <Dialog open={!!collectRemainderModal} onOpenChange={(open) => { if (!open) { setCollectRemainderModal(null); setCollectAmountInput(''); setCollectNoteInput(''); } }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Collect remainder payment' : 'Registrer restbetaling'}</DialogTitle>
            <DialogDescription>
              {collectRemainderModal?.order.order_number} — {lang === 'en' ? 'remaining' : 'restbeløp'}:{' '}
              {currency} {collectRemainderModal?.defaultAmount.toLocaleString(locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? `Amount (${currency})` : `Beløp (${currency})`}
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder={lang === 'en' ? `Enter amount (max ${collectRemainderModal?.defaultAmount ?? ''})` : `Skriv inn beløp (maks ${collectRemainderModal?.defaultAmount ?? ''})`}
                value={collectAmountInput}
                onChange={(e) => setCollectAmountInput(e.target.value)}
                min="1"
                max={collectRemainderModal?.defaultAmount}
                step="1"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Note (optional)' : 'Notat (valgfritt)'}
              </label>
              <Textarea
                value={collectNoteInput}
                onChange={(e) => setCollectNoteInput(e.target.value)}
                rows={2}
                className="border-neutral-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCollectRemainderModal(null); setCollectAmountInput(''); setCollectNoteInput(''); }}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              <Button
                onClick={() => collectRemainderModal && collectRemainder(collectRemainderModal.order, collectAmountInput, collectNoteInput)}
                disabled={
                  !collectAmountInput ||
                  parseFloat(collectAmountInput) <= 0 ||
                  (collectRemainderModal != null && parseFloat(collectAmountInput) > collectRemainderModal.defaultAmount) ||
                  orderActionLoading === `collect-remainder:${collectRemainderModal ? orderKey(collectRemainderModal.order) : ''}`
                }
              >
                {orderActionLoading?.startsWith('collect-remainder:') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                {lang === 'en' ? 'Confirm collection' : 'Bekreft innkreving'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Shipped Modal */}
      <Dialog open={!!shipModal} onOpenChange={(open) => { if (!open) { setShipModal(null); setTrackingNumberInput(''); } }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Mark as shipped' : 'Merk som sendt'}</DialogTitle>
            <DialogDescription>{shipModal?.order_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Tracking number (optional)' : 'Sporingsnummer (valgfritt)'}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                placeholder="e.g. 12345678901"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShipModal(null); setTrackingNumberInput(''); }}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              <Button
                onClick={() => shipModal && markShipped(shipModal, trackingNumberInput)}
                disabled={orderActionLoading === `mark-shipped:${shipModal ? orderKey(shipModal) : ''}`}
              >
                {orderActionLoading?.startsWith('mark-shipped:') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                {lang === 'en' ? 'Mark shipped' : 'Merk sendt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Egg Action Confirm Modal */}
      <Dialog open={!!eggActionConfirm} onOpenChange={(open) => { if (!open) { setEggActionConfirm(null); setEggActionReason(''); } }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{eggActionConfirm?.title}</DialogTitle>
            <DialogDescription>
              {eggActionConfirm?.order.order_number} — {eggActionConfirm?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Reason (optional)' : 'Årsak (valgfritt)'}
              </label>
              <Textarea
                value={eggActionReason}
                onChange={(e) => setEggActionReason(e.target.value)}
                rows={2}
                className="border-neutral-200 text-sm"
                placeholder={lang === 'en' ? 'Admin note for the log' : 'Admin-notat til loggen'}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEggActionConfirm(null); setEggActionReason(''); }}>
                {lang === 'en' ? 'Back' : 'Avbryt'}
              </Button>
              <Button variant="destructive" onClick={() => void handleConfirmedEggAction()}>
                {lang === 'en' ? 'Confirm' : 'Bekreft'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Egg Week Modal */}
      <Dialog open={!!moveWeekModal} onOpenChange={(open) => { if (!open) { setMoveWeekModal(null); setMoveWeekInput(''); } }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Move to different week' : 'Flytt til annen uke'}</DialogTitle>
            <DialogDescription>
              {moveWeekModal?.order.order_number}
              {moveWeekModal?.currentWeek ? ` — ${lang === 'en' ? 'current week' : 'nåværende uke'} ${moveWeekModal.currentWeek}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Target week number' : 'Måluke'}
              </label>
              <Input
                type="number"
                min={1}
                max={53}
                value={moveWeekInput}
                onChange={(e) => setMoveWeekInput(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. 24' : 'f.eks. 24'}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setMoveWeekModal(null); setMoveWeekInput(''); }}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              <Button onClick={() => void moveEggWeek()} disabled={!moveWeekInput || !!eggActionLoading}>
                {eggActionLoading?.startsWith('move_week:') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
                {lang === 'en' ? 'Move' : 'Flytt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Birds Modal */}
      <Dialog open={!!adjustBirdsModal} onOpenChange={(open) => { if (!open) setAdjustBirdsModal(null); }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lang === 'en' ? 'Adjust bird quantities' : 'Juster antall fugler'}
            </DialogTitle>
            <DialogDescription>
              {adjustBirdsModal?.order.order_number}
              {adjustBirdsStep === 'pool' && (lang === 'en' ? ' — Pool returns' : ' — Retur til pool')}
              {adjustBirdsStep === 'confirm' && (lang === 'en' ? ' — Confirm changes' : ' — Bekreft endringer')}
            </DialogDescription>
          </DialogHeader>

          {adjustBirdsStep === 'edit' && (
            <div className="space-y-4 pt-2">
              {Object.entries(adjustDeltas).map(([key, delta]) => {
                const label = key === 'main'
                  ? (lang === 'en' ? 'Main order' : 'Hovedordre')
                  : `${lang === 'en' ? 'Addition' : 'Tillegg'} ${key.slice(0, 6)}…`;
                return (
                  <div key={key} className="rounded-lg border border-neutral-200 p-3">
                    <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-xs text-neutral-500">{lang === 'en' ? 'Hens Δ' : 'Høner Δ'}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50" onClick={() => setAdjustDeltas((p) => ({ ...p, [key]: { ...p[key], hensDelta: p[key].hensDelta - 1 } }))}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className={`w-8 text-center text-sm font-medium ${delta.hensDelta < 0 ? 'text-red-600' : delta.hensDelta > 0 ? 'text-green-700' : 'text-neutral-500'}`}>
                            {delta.hensDelta > 0 ? `+${delta.hensDelta}` : delta.hensDelta}
                          </span>
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50" onClick={() => setAdjustDeltas((p) => ({ ...p, [key]: { ...p[key], hensDelta: p[key].hensDelta + 1 } }))}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-neutral-500">{lang === 'en' ? 'Roosters Δ' : 'Haner Δ'}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50" onClick={() => setAdjustDeltas((p) => ({ ...p, [key]: { ...p[key], roostersDelta: p[key].roostersDelta - 1 } }))}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className={`w-8 text-center text-sm font-medium ${delta.roostersDelta < 0 ? 'text-red-600' : delta.roostersDelta > 0 ? 'text-green-700' : 'text-neutral-500'}`}>
                            {delta.roostersDelta > 0 ? `+${delta.roostersDelta}` : delta.roostersDelta}
                          </span>
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-50" onClick={() => setAdjustDeltas((p) => ({ ...p, [key]: { ...p[key], roostersDelta: p[key].roostersDelta + 1 } }))}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {lang === 'en' ? 'Admin note (optional)' : 'Admin-notat (valgfritt)'}
                </label>
                <Textarea value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} rows={2} className="border-neutral-200 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAdjustBirdsModal(null)}>{lang === 'en' ? 'Cancel' : 'Avbryt'}</Button>
                <Button onClick={handleAdjustBirdsNext} disabled={!adjustBirdsHasChanges()}>
                  {lang === 'en' ? 'Next' : 'Neste'}
                </Button>
              </div>
            </div>
          )}

          {adjustBirdsStep === 'pool' && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-neutral-600">
                {lang === 'en'
                  ? 'For each reduction, specify how many birds return to the available pool.'
                  : 'For hvert trekk, angi hvor mange fugler som returneres til tilgjengelig pool.'}
              </p>
              {Object.entries(adjustPoolReturns).map(([key, pr]) => {
                const delta = adjustDeltas[key] || { hensDelta: 0, roostersDelta: 0 };
                const label = key === 'main' ? (lang === 'en' ? 'Main order' : 'Hovedordre') : `${lang === 'en' ? 'Addition' : 'Tillegg'} ${key.slice(0, 6)}…`;
                return (
                  <div key={key} className="rounded-lg border border-neutral-200 p-3">
                    <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {delta.hensDelta < 0 && (
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">{lang === 'en' ? `Hens back to pool (max ${Math.abs(delta.hensDelta)})` : `Høner tilbake til pool (maks ${Math.abs(delta.hensDelta)})`}</label>
                          <Input type="number" min={0} max={Math.abs(delta.hensDelta)} value={pr.poolHensReturn} onChange={(e) => setAdjustPoolReturns((p) => ({ ...p, [key]: { ...p[key], poolHensReturn: Number(e.target.value) } }))} className="h-8 text-sm" />
                        </div>
                      )}
                      {delta.roostersDelta < 0 && (
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">{lang === 'en' ? `Roosters back to pool (max ${Math.abs(delta.roostersDelta)})` : `Haner tilbake til pool (maks ${Math.abs(delta.roostersDelta)})`}</label>
                          <Input type="number" min={0} max={Math.abs(delta.roostersDelta)} value={pr.poolRoostersReturn} onChange={(e) => setAdjustPoolReturns((p) => ({ ...p, [key]: { ...p[key], poolRoostersReturn: Number(e.target.value) } }))} className="h-8 text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleAdjustBirdsBack}>{lang === 'en' ? 'Back' : 'Tilbake'}</Button>
                <Button onClick={handleAdjustBirdsNext}>{lang === 'en' ? 'Next' : 'Neste'}</Button>
              </div>
            </div>
          )}

          {adjustBirdsStep === 'confirm' && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm space-y-1">
                {Object.entries(adjustDeltas)
                  .filter(([, d]) => d.hensDelta !== 0 || d.roostersDelta !== 0)
                  .map(([key, d]) => {
                    const label = key === 'main' ? (lang === 'en' ? 'Main' : 'Hoved') : `${lang === 'en' ? 'Add.' : 'Tillegg'} ${key.slice(0, 6)}`;
                    return (
                      <p key={key} className="text-neutral-700">
                        {label}: {d.hensDelta !== 0 && `${lang === 'en' ? 'hens' : 'høner'} ${d.hensDelta > 0 ? '+' : ''}${d.hensDelta}`}
                        {d.hensDelta !== 0 && d.roostersDelta !== 0 && ', '}
                        {d.roostersDelta !== 0 && `${lang === 'en' ? 'roosters' : 'haner'} ${d.roostersDelta > 0 ? '+' : ''}${d.roostersDelta}`}
                      </p>
                    );
                  })}
                {adjustNote && <p className="mt-2 text-xs text-neutral-500">{lang === 'en' ? 'Note:' : 'Notat:'} {adjustNote}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleAdjustBirdsBack}>{lang === 'en' ? 'Back' : 'Tilbake'}</Button>
                <Button onClick={() => void submitAdjustBirds()} disabled={adjustBirdsLoading}>
                  {adjustBirdsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bird className="mr-2 h-4 w-4" />}
                  {lang === 'en' ? 'Confirm' : 'Bekreft'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pig Pickup Date Modal */}
      <Dialog open={!!pickupDateModal} onOpenChange={(open) => { if (!open) setPickupDateModal(null); }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Set pickup date & time' : 'Sett hentedato og tidspunkt'}</DialogTitle>
            <DialogDescription>{pickupDateModal?.order.order_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Pickup date' : 'Hentedato'}
              </label>
              <Input
                type="date"
                value={pickupDateInput}
                onChange={(e) => setPickupDateInput(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Pickup time' : 'Hentetidspunkt'}
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={pickupTimeInput}
                onChange={(e) => setPickupTimeInput(e.target.value)}
              >
                <option value="11:00">11:00</option>
                <option value="17:00">17:00</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPickupDateModal(null)}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              <Button
                onClick={() => pickupDateModal && void setPigPickupDate(pickupDateModal.order, pickupDateInput, pickupTimeInput)}
                disabled={!pickupDateInput || pickupDateLoading !== null}
              >
                {pickupDateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                {lang === 'en' ? 'Save' : 'Lagre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Chicken Breed/Addition Modal */}
      <Dialog open={!!addAdditionModal} onOpenChange={(open) => { if (!open) setAddAdditionModal(null); }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Add breed to order' : 'Legg til rase på bestilling'}</DialogTitle>
            <DialogDescription>{addAdditionModal?.order.order_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {addAdditionHatches.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {lang === 'en' ? 'No hatches with available birds.' : 'Ingen kull med ledige fugler.'}
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    {lang === 'en' ? 'Hatch' : 'Kull'}
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={addAdditionHatchId}
                    onChange={(e) => setAddAdditionHatchId(e.target.value)}
                  >
                    {addAdditionHatches.map((h) => (
                      <option key={h.hatch_id} value={h.hatch_id}>
                        {h.breed_name} — {h.hatch_date} ({lang === 'en' ? 'hens' : 'høner'}: {h.available_hens}, {lang === 'en' ? 'roosters' : 'haner'}: {h.available_roosters})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      {lang === 'en' ? 'Hens' : 'Høner'}
                    </label>
                    <Input type="number" min={0} value={addAdditionHens} onChange={(e) => setAddAdditionHens(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      {lang === 'en' ? 'Roosters' : 'Haner'}
                    </label>
                    <Input type="number" min={0} value={addAdditionRoosters} onChange={(e) => setAddAdditionRoosters(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      {lang === 'en' ? 'Age (wks)' : 'Alder (uker)'}
                    </label>
                    <Input type="number" min={0} value={addAdditionAge} onChange={(e) => setAddAdditionAge(e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAddAdditionModal(null)}>
                    {lang === 'en' ? 'Cancel' : 'Avbryt'}
                  </Button>
                  <Button onClick={() => void submitChickenAddition()} disabled={addAdditionLoading || !addAdditionHatchId}>
                    {addAdditionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {lang === 'en' ? 'Add' : 'Legg til'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Manual Egg Order Modal */}
      <Dialog open={createEggOrderModal} onOpenChange={(open) => { if (!open) setCreateEggOrderModal(false); }}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Add egg order' : 'Opprett rugeeggordre'}</DialogTitle>
            <DialogDescription>
              {lang === 'en'
                ? 'Walk-in order — no deposit collected. Full amount enabled for customer payment.'
                : 'Gårdsalg — ingen depositum. Fullt beløp aktiveres som restbetaling for kunden.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Inventory week' : 'Lagersaldo / uke'}
              </label>
              {eggInventoryLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === 'en' ? 'Loading...' : 'Laster...'}
                </div>
              ) : eggInventoryOptions.length === 0 ? (
                <p className="text-sm text-red-600">{lang === 'en' ? 'No inventory with available eggs found.' : 'Ingen lager med ledige egg funnet.'}</p>
              ) : (
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  value={newEggInventoryId}
                  onChange={(e) => setNewEggInventoryId(e.target.value)}
                >
                  {eggInventoryOptions.map((opt) => {
                    const free = opt.eggs_available - opt.eggs_allocated;
                    return (
                      <option key={opt.id} value={opt.id}>
                        {opt.egg_breeds?.name ?? '—'} · Uke {opt.week_number}/{opt.year} · {free} ledige · kr {Math.round((opt.egg_breeds?.price_per_egg ?? 0) / 100)}/egg
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {lang === 'en' ? 'Quantity' : 'Antall egg'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  value={newEggQuantity}
                  onChange={(e) => setNewEggQuantity(e.target.value)}
                  min="1"
                  step="1"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {lang === 'en' ? 'Price/egg override (kr)' : 'Pris per egg (kr, valgfritt)'}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder={(() => {
                    const selected = eggInventoryOptions.find((o) => o.id === newEggInventoryId);
                    return selected ? String(Math.round((selected.egg_breeds?.price_per_egg ?? 0) / 100)) : '';
                  })()}
                  value={newEggPriceOverride}
                  onChange={(e) => setNewEggPriceOverride(e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Delivery method' : 'Leveringsmåte'}
              </label>
              <select
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                value={newEggDeliveryMethod}
                onChange={(e) => setNewEggDeliveryMethod(e.target.value)}
              >
                <option value="farm_pickup">{lang === 'en' ? 'Farm pickup (free)' : 'Hentes på gård (gratis)'}</option>
                <option value="e6_pickup">{lang === 'en' ? 'E6 pickup (+kr 200)' : 'E6 hentepunkt (+kr 200)'}</option>
                <option value="posten">{lang === 'en' ? 'Postal (+kr 300)' : 'Posten (+kr 300)'}</option>
              </select>
            </div>
            {newEggInventoryId && newEggQuantity && (
              (() => {
                const selected = eggInventoryOptions.find((o) => o.id === newEggInventoryId);
                const priceOre = newEggPriceOverride
                  ? Math.round(parseFloat(newEggPriceOverride) * 100)
                  : (selected?.egg_breeds?.price_per_egg ?? 0);
                const qty = parseInt(newEggQuantity, 10);
                const deliveryFeeOre = newEggDeliveryMethod === 'posten' ? 30000 : newEggDeliveryMethod === 'e6_pickup' ? 20000 : 0;
                const totalOre = (Number.isFinite(qty) && qty > 0 && priceOre > 0)
                  ? qty * priceOre + deliveryFeeOre : 0;
                if (!totalOre) return null;
                return (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>{qty} × kr {Math.round(priceOre / 100)}</span>
                      <span>kr {Math.round(qty * priceOre / 100).toLocaleString('nb-NO')}</span>
                    </div>
                    {deliveryFeeOre > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>{lang === 'en' ? 'Delivery' : 'Levering'}</span>
                        <span>kr {Math.round(deliveryFeeOre / 100).toLocaleString('nb-NO')}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold text-neutral-900">
                      <span>{lang === 'en' ? 'Total (full remainder due)' : 'Total (fullt restbeløp)'}</span>
                      <span>kr {Math.round(totalOre / 100).toLocaleString('nb-NO')}</span>
                    </div>
                  </div>
                );
              })()
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {lang === 'en' ? 'Admin note (optional)' : 'Adminnotat (valgfritt)'}
              </label>
              <Textarea
                value={newEggAdminNote}
                onChange={(e) => setNewEggAdminNote(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Picked up at farm, invoice to be sent.' : 'F.eks. hentet på gård, faktura sendes.'}
                rows={2}
                className="border-neutral-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateEggOrderModal(false)} disabled={createEggOrderLoading}>
                {lang === 'en' ? 'Cancel' : 'Avbryt'}
              </Button>
              <Button
                onClick={createManualEggOrder}
                disabled={createEggOrderLoading || !newEggInventoryId || !newEggQuantity || parseInt(newEggQuantity, 10) <= 0 || eggInventoryLoading}
              >
                {createEggOrderLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                {lang === 'en' ? 'Create order' : 'Opprett ordre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="text-gray-600">{copy.totalCustomers.replace('{count}', String(customers.length))}</p>
      </div>

      <Card className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <div key={customer.customer_id || customer.email} className="flex items-center justify-between rounded-xl border p-4 hover:bg-gray-50">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  {customer.at_risk && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      {copy.atRiskTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={() => viewCustomerProfile(customer.customer_id || customer.email)} variant="outline" size="sm" disabled={profileLoading}>
                  {profileLoading ? <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" /> : <Eye className="mr-1 h-4 w-4" />}
                  {copy.viewProfileButton}
                </Button>
                <Button onClick={() => impersonateCustomer(customer)} variant="outline" size="sm">
                  <LogIn className="mr-1 h-4 w-4" />
                  {copy.impersonateButton}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && <div className="py-12 text-center text-gray-500">{copy.emptyResults}</div>}
      </Card>
    </div>
  );
}


