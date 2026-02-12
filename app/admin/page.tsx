'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  BarChart3,
  Package,
  Settings,
  Search,
  Filter,
  Download,
  Mail,
  Lock,
  Eye,
  Trash2,
  CheckSquare,
  RefreshCw,
  Activity,
  MessageSquare,
  Warehouse,
  Calendar,
  Tag
} from 'lucide-react';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { EggMetrics } from '@/components/admin/EggMetrics';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { CustomerDatabase } from '@/components/admin/CustomerDatabase';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { CommunicationCenter } from '@/components/admin/CommunicationCenter';
import { CommunicationHistory } from '@/components/admin/CommunicationHistory';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { EggInventoryManagement } from '@/components/admin/EggInventoryManagement';
import { BreedManagement } from '@/components/admin/BreedManagement';
import { EggAnalytics } from '@/components/admin/EggAnalytics';
import { EggOrdersWorkbench } from '@/components/admin/EggOrdersWorkbench';
import { AdminMessagingPanel } from '@/components/admin/AdminMessagingPanel';
import { ConfigurationManagement } from '@/components/admin/ConfigurationManagement';
import { DeliveryCalendar } from '@/components/admin/DeliveryCalendar';
import { RebateCodesManager } from '@/components/admin/RebateCodesManager';
import { MangalitsaBoxManager } from '@/components/admin/MangalitsaBoxManager';
import { MangalitsaExtrasManager } from '@/components/admin/MangalitsaExtrasManager';
import { NotificationSettings } from '@/components/admin/NotificationSettings';

type TabType = 'dashboard' | 'orders' | 'customers' | 'analytics' | 'production' | 'communication' | 'messages' | 'health' | 'inventory' | 'breeds' | 'mangalitsa-boxes' | 'mangalitsa-extras' | 'rebates' | 'settings' | 'notifications';

interface Order {
  id: string;
  order_number: string;
  product_type: 'pig_box' | 'eggs';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;

  // Pig-specific fields (optional)
  box_size?: number;
  effective_box_size?: number;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  fresh_delivery?: boolean;
  ribbe_choice?: string;
  extra_products?: any[];

  // Egg-specific fields (optional)
  breed_id?: string;
  breed_name?: string;
  quantity?: number;
  week_number?: number;
  year?: number;
  delivery_monday?: string;
  price_per_egg?: number;

  // Common fields
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

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const copy = t.adminPage;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;
  const { toast } = useToast();

  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Product Mode Filter
  const [productMode, setProductMode] = useState<'pigs' | 'eggs' | 'combined'>('pigs');

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [messageStats, setMessageStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  // Loading states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setPasswordError(true);
    } finally {
      setLoading(false);
    }
  }

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      // Fetch pig metrics
      const pigResponse = await fetch('/api/admin/dashboard');
      if (!pigResponse.ok) {
        if (pigResponse.status === 403) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error('Failed to load pig dashboard');
      }
      const pigData = await pigResponse.json();

      // Fetch egg metrics
      let eggData = null;
      try {
        const eggResponse = await fetch('/api/admin/eggs/dashboard');
        if (eggResponse.ok) {
          eggData = await eggResponse.json();
        }
      } catch (err) {
        console.log('Egg dashboard not available yet');
      }

      setDashboardMetrics({
        pigs: pigData,
        eggs: eggData,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      // Fetch pig orders
      const pigResponse = await fetch(`/api/admin/orders?${params}`);
      const pigData = await pigResponse.json();
      const pigOrders = (pigData.orders || []).map((o: any) => ({
        ...o,
        product_type: 'pig_box' as const,
      }));

      // Fetch egg orders
      const eggResponse = await fetch(`/api/eggs/orders`);
      const eggData = await eggResponse.json();
      const eggOrders = (eggData || []).map((o: any) => ({
        ...o,
        product_type: 'eggs' as const,
        breed_name: o.egg_breeds?.[0]?.name ?? o.egg_breeds?.name,
        delivery_type: o.delivery_method,
      }));

      // Combine orders
      const allOrders = [...pigOrders, ...eggOrders];

      // Sort by created_at
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  const loadMessageStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/messages');
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
        }
        return;
      }
      const data = await response.json();
      if (data?.stats) {
        setMessageStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load message stats:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard') {
      loadDashboard();
    } else if (isAuthenticated && activeTab === 'orders' && productMode !== 'eggs') {
      loadOrders();
    } else if (isAuthenticated && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [isAuthenticated, activeTab, productMode, loadDashboard, loadOrders, loadAnalytics]);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadMessageStats();
    const interval = setInterval(() => {
      loadMessageStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadMessageStats]);

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await loadOrders();
        if (activeTab === 'dashboard') await loadDashboard();
        setShowOrderDetail(false);
      } else {
        toast({
          title: copy.toastErrorTitle,
          description: copy.updateStatusError,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.updateStatusError,
        variant: 'destructive'
      });
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
        // Update the selected order
        const updatedOrder = orders.find((o) => o.id === orderId);
        if (updatedOrder) {
          setSelectedOrder({ ...updatedOrder, admin_notes: notes });
        }
      } else {
        toast({
          title: copy.toastErrorTitle,
          description: copy.saveNotesError,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.saveNotesError,
        variant: 'destructive'
      });
    }
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

  async function handleBulkStatusUpdate(newStatus: string) {
    if (selectedOrders.size === 0) {
      toast({
        title: copy.noOrdersSelectedTitle,
        description: copy.bulkNoSelectionUpdate,
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(
      copy.confirmBulkUpdate
        .replace('{status}', newStatus)
        .replace('{count}', String(selectedOrders.size))
    )) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          orderIds: Array.from(selectedOrders),
          data: { status: newStatus },
        }),
      });

      if (response.ok) {
        await loadOrders();
        setSelectedOrders(new Set());
        toast({
          title: copy.bulkUpdateSuccessTitle,
          description: copy.bulkUpdateSuccessDescription.replace('{count}', String(selectedOrders.size))
        });
      } else {
        toast({
          title: copy.toastErrorTitle,
          description: copy.bulkUpdateError,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.bulkUpdateError,
        variant: 'destructive'
      });
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkLock() {
    if (selectedOrders.size === 0) {
      toast({
        title: copy.noOrdersSelectedTitle,
        description: copy.bulkNoSelectionLock,
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(copy.confirmBulkLock.replace('{count}', String(selectedOrders.size)))) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lock_orders',
          orderIds: Array.from(selectedOrders),
        }),
      });

      if (response.ok) {
        await loadOrders();
        setSelectedOrders(new Set());
        toast({
          title: copy.bulkLockSuccessTitle,
          description: copy.bulkLockSuccessDescription.replace('{count}', String(selectedOrders.size))
        });
      } else {
        toast({
          title: copy.toastErrorTitle,
          description: copy.bulkLockError,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Bulk lock error:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.bulkLockError,
        variant: 'destructive'
      });
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
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.exportCsvError,
        variant: 'destructive'
      });
    }
  }

  async function handleExportProduction() {
    if (selectedOrders.size === 0) {
      toast({
        title: copy.noOrdersSelectedTitle,
        description: copy.noOrdersSelectedDescription,
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_production',
          orderIds: Array.from(selectedOrders),
        }),
      });

      const data = await response.json();

      // Create downloadable JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.exportProductionError,
        variant: 'destructive'
      });
    }
  }

  const filteredOrders = orders.filter((order) => {
    // Filter by product mode
    const matchesProductMode =
      productMode === 'combined' ||
      (productMode === 'pigs' && order.product_type === 'pig_box') ||
      (productMode === 'eggs' && order.product_type === 'eggs');

    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDelivery = deliveryFilter === 'all' || order.delivery_type === deliveryFilter;

    return matchesProductMode && matchesSearch && matchesStatus && matchesDelivery;
  });

  function getPigProductLabel(order: Order): string {
    const presetName = lang === 'no' ? order.display_box_name_no : order.display_box_name_en;
    const boxSize = order.box_size || order.effective_box_size;
    if (presetName && boxSize) return `${presetName} (${boxSize} kg)`;
    if (presetName) return presetName;
    if (boxSize) return copy.productPigBox.replace('{size}', String(boxSize));
    return 'Mangalitsa';
  }

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'dashboard', label: copy.tabs.dashboard, icon: LayoutDashboard },
    { id: 'mangalitsa-boxes', label: 'Mangalitsa Bokser', icon: Package },
    { id: 'mangalitsa-extras', label: 'Ekstraprodukter', icon: ShoppingCart },
    { id: 'orders', label: copy.tabs.orders, icon: ShoppingCart },
    { id: 'inventory', label: copy.tabs.inventory, icon: Warehouse },
    { id: 'production', label: copy.tabs.production, icon: Calendar },
    { id: 'analytics', label: copy.tabs.analytics, icon: BarChart3 },
    { id: 'messages', label: copy.tabs.messages, icon: MessageSquare },
    { id: 'customers', label: copy.tabs.customers, icon: Users },
    { id: 'communication', label: copy.tabs.communication, icon: MessageSquare },
    { id: 'breeds', label: copy.tabs.breeds, icon: Tag },
    { id: 'rebates', label: copy.tabs.rebates, icon: Tag },
    { id: 'notifications', label: copy.tabs.notifications, icon: Mail },
    { id: 'health', label: copy.tabs.health, icon: Activity },
    { id: 'settings', label: copy.tabs.settings, icon: Settings },
  ];

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-center mb-8">
            <Lock className="w-16 h-16 text-neutral-400" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-neutral-900 mb-8 text-center">{copy.loginTitle}</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <Label htmlFor="admin-password" className="text-sm font-light text-neutral-600">
                {copy.passwordLabel}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 border-neutral-200 rounded-xl font-light"
                autoFocus
                placeholder={copy.passwordPlaceholder}
              />
              {passwordError && (
                <p className="text-red-600 text-sm font-light mt-2">{copy.passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-6 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
            >
              {copy.loginButton}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light tracking-tight text-neutral-900">Tinglumgard Admin - Mangalitsa</h1>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' });
                setIsAuthenticated(false);
              }}
              className="px-6 py-3 border-2 border-neutral-200 text-neutral-900 rounded-xl text-sm font-light hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300"
            >
              {copy.logoutButton}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const unresolvedCount = messageStats.open + messageStats.in_progress;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 whitespace-nowrap relative',
                    activeTab === tab.id
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {tab.id === 'messages' && unresolvedCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center text-xs font-light bg-red-600 text-white rounded-full px-2 py-0.5 shadow-[0_5px_15px_-5px_rgba(220,38,38,0.4)]">
                      {unresolvedCount}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-10">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-light tracking-tight text-neutral-900">{copy.dashboardTitle}</h2>
              <button
                onClick={loadDashboard}
                className="px-6 py-3 border-2 border-neutral-200 text-neutral-900 rounded-xl text-sm font-light flex items-center gap-2 hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                {copy.refreshButton}
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-light text-neutral-900">{copy.pendingMessagesTitle}</h3>
                  <p className="text-sm font-light text-neutral-600 mt-1">{copy.pendingMessagesSubtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-light text-neutral-900 tabular-nums">
                    {messageStats.open + messageStats.in_progress}
                  </div>
                  <Button onClick={() => setActiveTab('messages')} variant="outline">
                    {copy.goToMessages}
                  </Button>
                </div>
              </div>
            </div>

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              </div>
            ) : dashboardMetrics ? (
              <div className="space-y-8">
                {(productMode === 'pigs' || productMode === 'combined') && dashboardMetrics.pigs && (
                  <div>
                    <DashboardMetrics metrics={dashboardMetrics.pigs} />
                  </div>
                )}

                {(productMode === 'eggs' || productMode === 'combined') && (
                  <div>
                    <EggMetrics metrics={dashboardMetrics.eggs} />
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">{copy.noData}</p>
              </Card>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && productMode === 'eggs' && (
          <EggOrdersWorkbench />
        )}

        {activeTab === 'orders' && productMode !== 'eggs' && (
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusUpdate('ready_for_pickup')}
                      disabled={bulkActionLoading}
                    >
                      {copy.bulkMarkReady}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkLock}
                      disabled={bulkActionLoading}
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      {copy.bulkLock}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportProduction}
                      disabled={bulkActionLoading}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {copy.bulkProductionPlan}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrders(new Set())}
                    >
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
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.orderNumber}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.customer}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.product}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.status}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.delivery}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.amount}</th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-gray-700">{copy.table.date}</th>
                        <th className="px-4 py-3 text-right text-sm font-normal text-gray-700">{copy.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (order.product_type === 'eggs') {
                                    setProductMode('eggs');
                                    setSearchTerm(order.order_number);
                                    return;
                                  }
                                  setSelectedOrder(order);
                                  setShowOrderDetail(true);
                                }}
                                className="font-medium text-blue-600 hover:text-blue-800"
                              >
                                {order.order_number}
                              </button>
                              {order.product_type === 'eggs' && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                  ðŸ¥š
                                </span>
                              )}
                              {order.product_type === 'pig_box' && (
                                <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full font-medium">
                                  ðŸ·
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.customer_name}</p>
                              <p className="text-sm text-gray-600">{order.customer_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {order.product_type === 'pig_box' && (
                              <span className="text-gray-900">
                                {getPigProductLabel(order)}
                              </span>
                            )}
                            {order.product_type === 'eggs' && (
                              <div>
                                <p className="font-medium text-gray-900">{order.breed_name}</p>
                                <p className="text-sm text-gray-600">
                                  {copy.productEggs.replace('{quantity}', String(order.quantity))}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.product_type === 'eggs' && order.week_number && (
                              <div>{copy.weekLabel.replace('{week}', String(order.week_number))}</div>
                            )}
                            <div>{order.delivery_type}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {currency} {(order.product_type === 'eggs' ? (order.total_amount / 100) : order.total_amount).toLocaleString(locale)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString(locale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {order.product_type === 'eggs' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProductMode('eggs');
                                  }}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (order.product_type === 'eggs') {
                                    setProductMode('eggs');
                                    setSearchTerm(order.order_number);
                                    return;
                                  }
                                  setSelectedOrder(order);
                                  setShowOrderDetail(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">{copy.analyticsTitle}</h2>

            {/* Pig Analytics */}
            {(productMode === 'pigs' || productMode === 'combined') && analytics && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">ðŸ· {copy.pigAnalyticsTitle}</h3>
            {analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-normal text-lg mb-4">{copy.keyMetricsTitle}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{copy.totalOrdersLabel}</span>
                      <span className="font-bold text-xl">{analytics.summary.total_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{copy.uniqueCustomersLabel}</span>
                      <span className="font-bold text-xl">{analytics.summary.total_customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{copy.repeatCustomersLabel}</span>
                      <span className="font-bold text-xl">{analytics.summary.repeat_customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{copy.repeatRateLabel}</span>
                      <span className="font-bold text-xl">{analytics.customer_insights.repeat_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-normal text-lg mb-4">{copy.conversionFunnelTitle}</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.conversion_funnel).map(([status, count]: [string, any]) => {
                      const percentage = (count / analytics.summary.total_orders) * 100;
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-gray-700">{status.replace('_', ' ')}</span>
                            <span className="font-normal">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {analytics.products.combinations.length > 0 && (
                  <Card className="p-6 lg:col-span-2">
                    <h3 className="font-normal text-lg mb-4">{copy.popularCombosTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.products.combinations.map((combo: any, index: number) => (
                        <div key={index} className="p-4 rounded-xl bg-gray-50">
                          <p className="font-medium text-gray-900">{combo.combo}</p>
                          <p className="text-2xl font-bold text-blue-600">{combo.count}</p>
                          <p className="text-sm text-gray-600">{copy.ordersLabel}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">{copy.loadingAnalytics}</p>
              </Card>
            )}
              </div>
            )}

            {/* Egg Analytics */}
            {(productMode === 'eggs' || productMode === 'combined') && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">ðŸ¥š {copy.eggAnalyticsTitle}</h3>
                <EggAnalytics />
              </div>
            )}
          </div>
        )}

        {/* PRODUCTION/DELIVERY CALENDAR TAB */}
        {activeTab === 'production' && <DeliveryCalendar />}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            {(productMode === 'pigs' || productMode === 'combined') && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">ðŸ· {copy.pigInventoryTitle}</h3>
                <InventoryManagement />
              </div>
            )}

            {(productMode === 'eggs' || productMode === 'combined') && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">ðŸ¥š {copy.eggInventoryTitle}</h3>
                <EggInventoryManagement />
              </div>
            )}
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && <CustomerDatabase />}

        {/* COMMUNICATION TAB */}
        {activeTab === 'communication' && (
          <div className="space-y-6">
            <div className="border-b">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('communication')}
                  className="pb-3 px-1 border-b-2 border-[#2C1810] text-[#2C1810] font-medium"
                >
                  {copy.communicationSendEmail}
                </button>
                <button
                  onClick={() => {
                    const historySection = document.getElementById('comm-history');
                    if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="pb-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-medium"
                >
                  {copy.communicationHistory}
                </button>
              </div>
            </div>
            <CommunicationCenter />
            <div id="comm-history">
              <CommunicationHistory />
            </div>
          </div>
        )}

        {/* BREEDS TAB */}
        {activeTab === 'breeds' && <BreedManagement />}

  {/* MESSAGES TAB */}
  {activeTab === 'messages' && <AdminMessagingPanel />}

        {/* SYSTEM HEALTH TAB */}
        {activeTab === 'health' && <SystemHealth />}

        {/* REBATE CODES TAB */}
        {activeTab === 'rebates' && <RebateCodesManager />}

        {/* MANGALITSA BOXES TAB */}
        {activeTab === 'mangalitsa-boxes' && <MangalitsaBoxManager />}

        {/* MANGALITSA EXTRAS TAB */}
        {activeTab === 'mangalitsa-extras' && <MangalitsaExtrasManager />}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && <NotificationSettings />}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && <ConfigurationManagement />}
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={showOrderDetail}
          onClose={() => {
            setShowOrderDetail(false);
            setSelectedOrder(null);
          }}
          onStatusChange={handleStatusChange}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  );
}
