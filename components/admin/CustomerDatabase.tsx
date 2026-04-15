'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  LogIn,
  Mail,
  MessageSquare,
  Phone,
  Search,
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
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to load customer profile');
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
      } else {
        const queueEntry = findQueueCommunicationForOrder(order);
        if (!queueEntry) {
          throw new Error(
            (copy as any).resendConfirmationMissingDescription ||
              (lang === 'en'
                ? 'No previous email was found for this order yet.'
                : 'Fant ingen tidligere e-post på denne ordren enda.')
          );
        }

        const response = await fetch('/api/admin/customers/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'resend',
            queueId: queueEntry.id,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || copy.orderSaveErrorDescription);
        }
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

      return {
        primary:
          roosters > 0
            ? `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens} + ${roosters.toLocaleString(locale)} ${copy.fieldLabels.roosters}`
            : `${hens.toLocaleString(locale)} ${copy.fieldLabels.hens}`,
        secondary:
          uniqueAges.length === 0
            ? breed || null
            : uniqueAges.length === 1
              ? `${breed ? `${breed} · ` : ''}${uniqueAges[0]} ${lang === 'en' ? 'weeks' : 'uker'}`
              : `${breed ? `${breed} · ` : ''}${uniqueAges[0]}-${uniqueAges[uniqueAges.length - 1]} ${
                  lang === 'en' ? 'weeks' : 'uker'
                }`,
      };
    }

    const boxSize = toNumber(details.box_size);
    return {
      primary: boxSize > 0 ? `${boxSize.toLocaleString(locale)} kg` : copy.notProvided,
      secondary: String(details.ribbe_choice || '').trim() || null,
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

  function getOrderContentModalData(order: CustomerOrderSummary) {
    const key = orderKey(order);
    const detail = (orderDetails[key] || order.details || {}) as Record<string, unknown>;
    const lines: Array<{ key: string; label: string; quantity: string; amount?: string | null }> = [];

    if (order.source === 'egg') {
      const baseBreed = String(
        (detail.egg_breeds as Record<string, unknown> | undefined)?.name || detail.breed_name || copy.notProvided
      );
      const baseQty = toNumber(detail.quantity);
      lines.push({
        key: `${key}:base`,
        label: baseBreed,
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
          label: additionBreed,
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
        label: baseBreed,
        quantity: `${formatBirds(baseHens, baseRoosters)}${
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
          label: additionBreed,
          quantity: `${formatBirds(hens, roosters)}${
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
      };
    }

    const boxSize = toNumber(detail.box_size);
    const boxLabel = boxSize > 0 ? `${boxSize.toLocaleString(locale)} kg` : copy.notProvided;
    lines.push({
      key: `${key}:base`,
      label: (copy as any).orderCardItemsLabel || (lang === 'en' ? 'Items' : 'Innhold'),
      quantity: boxLabel,
    });

    const extras = (detail.order_extras as Array<Record<string, unknown>> | undefined) || [];
    extras.forEach((extra, index) => {
      const name = String(
        (extra.extras_catalog as Record<string, unknown> | undefined)?.name_no || copy.notProvided
      );
      const qty = toNumber(extra.quantity);
      const totalPrice = toNumber(extra.total_price || extra.price_nok);
      lines.push({
        key: `${key}:extra:${index}`,
        label: name,
        quantity: `${qty.toLocaleString(locale)}x`,
        amount: totalPrice > 0 ? `${currency} ${totalPrice.toLocaleString(locale)}` : null,
      });
    });

    return {
      summary: boxLabel,
      lines,
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

    const payments =
      order.source === 'egg'
        ? ((detail.egg_payments as Array<Record<string, unknown>> | undefined) || [])
        : order.source === 'chicken'
          ? ((detail.chicken_payments as Array<Record<string, unknown>> | undefined) || [])
          : ((detail.payments as Array<Record<string, unknown>> | undefined) || []);

    const additions =
      order.source === 'egg'
        ? ((detail.egg_order_additions as Array<Record<string, unknown>> | undefined) || [])
        : order.source === 'chicken'
          ? ((detail.chicken_order_additions as Array<Record<string, unknown>> | undefined) || [])
          : [];

    const hasBaseLine = order.source === 'egg' || order.source === 'chicken';

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

        <div>
          <h4 className="font-semibold text-neutral-900">{copy.paymentsInfoTitle}</h4>
          {payments.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">{copy.noPayments}</p>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              {payments.map((payment, index) => (
                <div key={`${String(payment.id || index)}-${index}`} className="rounded border p-2">
                  {String(payment.payment_type || '-')} • {copy.statusLabels[String(payment.status || '') as keyof typeof copy.statusLabels] || String(payment.status || '-')} • {currency}{' '}
                  {toNumber(payment.amount_nok).toLocaleString(locale)}
                </div>
              ))}
            </div>
          )}
        </div>

        {(hasBaseLine || additions.length > 0) && (
          <div>
            <h4 className="font-semibold text-neutral-900">{copy.additionsInfoTitle}</h4>
            <div className="mt-2 space-y-1 text-sm">
              {order.source === 'egg' && (
                <div className="rounded border p-2">
                  {String((detail.egg_breeds as Record<string, unknown> | null | undefined)?.name || copy.notProvided)} •{' '}
                  {toNumber(detail.quantity).toLocaleString(locale)} {copy.fieldLabels.quantity}
                </div>
              )}
              {order.source === 'chicken' && (
                <div className="rounded border p-2">
                  {String((detail.chicken_breeds as Record<string, unknown> | null | undefined)?.name || copy.notProvided)} •{' '}
                  {toNumber(detail.quantity_hens).toLocaleString(locale)} {copy.fieldLabels.hens}
                  {toNumber(detail.quantity_roosters) > 0
                    ? ` + ${toNumber(detail.quantity_roosters).toLocaleString(locale)} ${copy.fieldLabels.roosters}`
                    : ''}
                </div>
              )}
              {additions.length === 0 ? (
                <p className="text-sm text-neutral-500">{copy.noAdditions}</p>
              ) : (
                additions.map((addition, index) => {
                  if (order.source === 'egg') {
                    const breedName = String(
                      (addition.egg_breeds as Record<string, unknown> | null | undefined)?.name || copy.notProvided
                    );
                    return (
                      <div key={`${String(addition.id || index)}-${index}`} className="rounded border p-2">
                        {breedName} • {toNumber(addition.quantity).toLocaleString(locale)} {copy.fieldLabels.quantity}
                      </div>
                    );
                  }

                  const breedName = String(
                    (addition.chicken_breeds as Record<string, unknown> | null | undefined)?.name || copy.notProvided
                  );
                  const hens = toNumber(addition.quantity_hens);
                  const roosters = toNumber(addition.quantity_roosters);
                  return (
                    <div key={`${String(addition.id || index)}-${index}`} className="rounded border p-2">
                      {breedName} • {hens.toLocaleString(locale)} {copy.fieldLabels.hens}
                      {roosters > 0 ? ` + ${roosters.toLocaleString(locale)} ${copy.fieldLabels.roosters}` : ''}
                    </div>
                  );
                })
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
            {Boolean(customers.find((entry) => entry.customer_id === selectedCustomer.customer_id)?.at_risk) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {copy.atRiskTag}
              </span>
            )}
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
                            {isResending ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="mr-1 h-4 w-4" />
                            )}
                            {isResending
                              ? ((copy as any).resendConfirmationLoading ||
                                (lang === 'en' ? 'Sending...' : 'Sender...'))
                              : ((copy as any).resendConfirmationButton ||
                                (lang === 'en' ? 'Resend confirmation' : 'Send bekreftelse på nytt'))}
                          </Button>
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
          <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto">
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
              const total = toNumber(contentModalOrder.total_amount);
              const paid = toNumber(contentModalOrder.paid_amount);
              const remaining = Math.max(0, total - paid);

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
                        {(copy as any).orderCardRemainingLabel || (lang === 'en' ? 'Remaining' : 'Rest')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {currency} {remaining.toLocaleString(locale)}
                      </p>
                    </div>
                  </div>

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
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
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
          <DialogContent className="max-w-2xl">
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

