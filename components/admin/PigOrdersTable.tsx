'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Lock,
  Eye,
} from 'lucide-react';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';

interface Order {
  id: string;
  order_number: string;
  product_type: 'pig_box';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;
  box_size?: number;
  effective_box_size?: number;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  is_mangalitsa?: boolean;
  mangalitsa_preset_id?: string | null;
  fresh_delivery?: boolean;
  ribbe_choice?: string;
  extra_products?: any[];
  status: string;
  delivery_type: string;
  notes: string;
  admin_notes: string;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  created_at: string;
  locked_at: string | null;
  marked_delivered_at: string | null;
  at_risk: boolean;
  payments: any[];
}

export function PigOrdersTable({
  initialOrderId = null,
  onInitialOrderHandled,
}: {
  initialOrderId?: string | null;
  onInitialOrderHandled?: () => void;
} = {}) {
  const { t, lang } = useLanguage();
  const copy = t.adminPage;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [initialOrderHandled, setInitialOrderHandled] = useState(false);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to load orders');
      const data = await response.json();
      const pigOrders: Order[] = (data.orders || []).map((o: any) => ({
        ...o,
        product_type: 'pig_box' as const,
      }));
      pigOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(pigOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setInitialOrderHandled(false);
  }, [initialOrderId]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDelivery = deliveryFilter === 'all' || order.delivery_type === deliveryFilter;
    return matchesSearch && matchesStatus && matchesDelivery;
  });

  useEffect(() => {
    if (!initialOrderId || initialOrderHandled || ordersLoading) return;

    const targetOrder =
      orders.find((order) => order.id === initialOrderId) ||
      orders.find((order) => order.order_number === initialOrderId) ||
      null;

    setInitialOrderHandled(true);
    onInitialOrderHandled?.();

    if (targetOrder) {
      setSelectedOrder(targetOrder);
      setShowOrderDetail(true);
    }
  }, [initialOrderHandled, initialOrderId, onInitialOrderHandled, orders, ordersLoading]);

  function getPigProductLabel(order: Order): string {
    const presetName = lang === 'no' ? order.display_box_name_no : order.display_box_name_en;
    const boxSize = order.box_size || order.effective_box_size;
    if (presetName && boxSize) return `${presetName} (${boxSize} kg)`;
    if (presetName) return presetName;
    if (boxSize) return copy.productPigBox.replace('{size}', String(boxSize));
    return 'Mangalitsa';
  }

  function toggleOrderSelection(orderId: string) {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  }

  function selectAllOrders() {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        await loadOrders();
        setShowOrderDetail(false);
      } else {
        toast({ title: copy.toastErrorTitle, description: copy.updateStatusError, variant: 'destructive' });
      }
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.updateStatusError, variant: 'destructive' });
    }
  }

  async function handleSaveNotes(orderId: string, notes: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (response.ok) {
        await loadOrders();
        const updatedOrder = orders.find((o) => o.id === orderId);
        if (updatedOrder) setSelectedOrder({ ...updatedOrder, admin_notes: notes });
      } else {
        toast({ title: copy.toastErrorTitle, description: copy.saveNotesError, variant: 'destructive' });
      }
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.saveNotesError, variant: 'destructive' });
    }
  }

  async function handleBulkStatusUpdate(newStatus: string) {
    if (selectedOrders.size === 0) {
      toast({ title: copy.noOrdersSelectedTitle, description: copy.bulkNoSelectionUpdate, variant: 'destructive' });
      return;
    }
    if (!window.confirm(copy.confirmBulkUpdate.replace('{status}', newStatus).replace('{count}', String(selectedOrders.size)))) return;

    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', orderIds: Array.from(selectedOrders), data: { status: newStatus } }),
      });
      if (response.ok) {
        await loadOrders();
        setSelectedOrders(new Set());
        toast({ title: copy.bulkUpdateSuccessTitle, description: copy.bulkUpdateSuccessDescription.replace('{count}', String(selectedOrders.size)) });
      } else {
        toast({ title: copy.toastErrorTitle, description: copy.bulkUpdateError, variant: 'destructive' });
      }
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.bulkUpdateError, variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkLock() {
    if (selectedOrders.size === 0) {
      toast({ title: copy.noOrdersSelectedTitle, description: copy.bulkNoSelectionLock, variant: 'destructive' });
      return;
    }
    if (!window.confirm(copy.confirmBulkLock.replace('{count}', String(selectedOrders.size)))) return;

    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock_orders', orderIds: Array.from(selectedOrders) }),
      });
      if (response.ok) {
        await loadOrders();
        setSelectedOrders(new Set());
        toast({ title: copy.bulkLockSuccessTitle, description: copy.bulkLockSuccessDescription.replace('{count}', String(selectedOrders.size)) });
      } else {
        toast({ title: copy.toastErrorTitle, description: copy.bulkLockError, variant: 'destructive' });
      }
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.bulkLockError, variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await fetch(`/api/admin/orders?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.exportCsvError, variant: 'destructive' });
    }
  }

  async function handleExportProduction() {
    if (selectedOrders.size === 0) {
      toast({ title: copy.noOrdersSelectedTitle, description: copy.noOrdersSelectedDescription, variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_production', orderIds: Array.from(selectedOrders) }),
      });
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: copy.toastErrorTitle, description: copy.exportProductionError, variant: 'destructive' });
    }
  }

  const statusOptions = [
    { value: 'all', label: copy.statusOptions.all },
    { value: 'pending', label: copy.statusOptions.pending },
    { value: 'draft', label: copy.statusOptions.draft },
    { value: 'deposit_paid', label: copy.statusOptions.depositPaid },
    { value: 'paid', label: copy.statusOptions.paid },
    { value: 'ready_for_pickup', label: copy.statusOptions.readyForPickup },
    { value: 'completed', label: copy.statusOptions.completed },
    { value: 'cancelled', label: copy.statusOptions.cancelled },
    { value: 'forfeited', label: copy.statusOptions.forfeited },
  ];

  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button onClick={loadOrders} variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          {copy.filterButton}
        </Button>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          {copy.exportCsvButton}
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="font-medium text-blue-900">
              {copy.bulkSelected.replace('{count}', String(selectedOrders.size))}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('ready_for_pickup')} disabled={bulkActionLoading}>
                {copy.bulkMarkReady}
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkLock} disabled={bulkActionLoading}>
                <Lock className="w-4 h-4 mr-1" />{copy.bulkLock}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportProduction} disabled={bulkActionLoading}>
                <Download className="w-4 h-4 mr-1" />{copy.bulkProductionPlan}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedOrders(new Set())}>
                {copy.bulkCancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Orders Table */}
      {ordersLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl font-normal text-gray-900 mb-2">{copy.noOrdersTitle}</p>
          <p className="text-gray-600">{copy.noOrdersSubtitle}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={selectAllOrders}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.orderNumber}</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.customer}</th>
                  <th className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.product}</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.status}</th>
                  <th className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.delivery}</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.amount}</th>
                  <th className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-normal text-gray-700">{copy.table.date}</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs sm:text-sm font-normal text-gray-700">{copy.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                          className="font-medium text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                        >
                          {order.order_number}
                        </button>
                        {(order.is_mangalitsa || order.mangalitsa_preset_id) && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium hidden sm:inline">Mangalitsa</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs sm:text-sm">{order.customer_name}</p>
                        <p className="text-xs text-gray-600 hidden sm:block">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3">
                      <span className="text-xs sm:text-sm text-gray-900">{getPigProductLabel(order)}</span>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        order.status === 'completed' ? 'bg-neutral-100 text-neutral-900' :
                        order.status === 'ready_for_pickup' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'paid' ? 'bg-neutral-100 text-neutral-900' :
                        order.status === 'fully_paid' ? 'bg-neutral-100 text-neutral-900' :
                        order.status === 'deposit_paid' ? 'bg-neutral-100 text-neutral-600' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {statusOptions.find((s) => s.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-600">{order.delivery_type}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm text-gray-900">
                      {currency} {order.total_amount.toLocaleString(locale)}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString(locale)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={showOrderDetail}
          onClose={() => { setShowOrderDetail(false); setSelectedOrder(null); }}
          onStatusChange={handleStatusChange}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  );
}
