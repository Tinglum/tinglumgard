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
  Phone,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  sentAt: string | null;
  createdAt: string | null;
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
  communications?: CommunicationHistoryItem[];
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const orderKey = (order: Pick<CustomerOrderSummary, 'source' | 'order_id'>) =>
  `${order.source}:${order.order_id}`;

const parseNumberOrUndefined = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
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

export function CustomerDatabase() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const copy = t.customerDatabase;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, Record<string, unknown>>>({});
  const [orderDrafts, setOrderDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [loadingOrder, setLoadingOrder] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);

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
    } catch (error) {
      toast({
        title: copy.impersonateErrorTitle,
        description: error instanceof Error ? error.message : copy.impersonateErrorDescription,
        variant: 'destructive',
      });
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
          <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.emailLabel}</p>
                <p className="font-semibold">{selectedCustomer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.phoneLabel}</p>
                <p className="font-semibold">{selectedCustomer.phone || copy.notProvided}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.firstOrderLabel}</p>
                <p className="font-semibold">{new Date(selectedCustomer.first_order_date).toLocaleDateString(locale)}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold">{copy.orderHistoryTitle}</h3>
            <div className="space-y-2">
              {selectedCustomer.orders.map((order) => {
                const key = orderKey(order);
                const expanded = expandedOrder === key;
                return (
                  <div key={key} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-neutral-600">
                          {new Date(order.created_at).toLocaleDateString(locale)} - {currency}{' '}
                          {toNumber(order.total_amount).toLocaleString(locale)} -{' '}
                          {copy.statusLabels[order.status as keyof typeof copy.statusLabels] || order.status}
                        </p>
                      </div>
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
                    </div>
                    {expanded && renderOrderDetails(order)}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">{copy.communicationTitle}</h3>
            <p className="mb-3 text-sm text-neutral-600">{copy.communicationSubtitle}</p>
            {selectedCustomer.communications && selectedCustomer.communications.length > 0 ? (
              <div className="space-y-2">
                {selectedCustomer.communications.map((entry) => (
                  <div key={`${entry.source}-${entry.id}`} className="rounded-lg border p-3">
                    <p className="font-medium">{entry.subject || copy.communicationNoSubject}</p>
                    <p className="text-xs text-neutral-600">
                      {copy.communicationTypeLabel}: {entry.classification}
                    </p>
                    {entry.templateKey && (
                      <p className="text-xs text-neutral-600">
                        {copy.communicationTemplateLabel}: {entry.templateKey}
                      </p>
                    )}
                    <p className="text-xs text-neutral-600">
                      {(entry.sentAt ? copy.communicationSentAtLabel : copy.communicationCreatedAtLabel)}:{' '}
                      {new Date(String(entry.sentAt || entry.createdAt || '')).toLocaleString(locale)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{copy.noCommunications}</p>
            )}
          </div>
        </Card>
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
                <Button onClick={() => viewCustomerProfile(customer.customer_id || customer.email)} variant="outline" size="sm">
                  <Eye className="mr-1 h-4 w-4" />
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
