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
  Egg,
  Package,
  Settings,
  Search,
  Filter,
  Download,
  Lock,
  Eye,
  RefreshCw,
  MessageSquare,
  Warehouse,
  Tag,
  Beef,
  BookOpen,
  Bird,
} from 'lucide-react';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { CustomerDatabase } from '@/components/admin/CustomerDatabase';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { CommunicationCenter } from '@/components/admin/CommunicationCenter';
import { CommunicationHistory } from '@/components/admin/CommunicationHistory';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { AdminMessagingPanel } from '@/components/admin/AdminMessagingPanel';
import { ConfigurationManagement } from '@/components/admin/ConfigurationManagement';
import { DeliveryCalendar } from '@/components/admin/DeliveryCalendar';
import { RebateCodesManager } from '@/components/admin/RebateCodesManager';
import { MangalitsaBoxManager } from '@/components/admin/MangalitsaBoxManager';
import { MangalitsaExtrasManager } from '@/components/admin/MangalitsaExtrasManager';
import { MangalitsaCutsManager } from '@/components/admin/MangalitsaCutsManager';
import { EggOrdersWorkbench } from '@/components/admin/EggOrdersWorkbench';
import { EggInventoryManagement } from '@/components/admin/EggInventoryManagement';
import { BreedManagement } from '@/components/admin/BreedManagement';
import { EggAnalytics } from '@/components/admin/EggAnalytics';
import { RecipeManager } from '@/components/admin/RecipeManager';
import { ChickenBreedManager } from '@/components/admin/ChickenBreedManager';
import { ChickenHatchManager } from '@/components/admin/ChickenHatchManager';
import { ChickenOrdersManager } from '@/components/admin/ChickenOrdersManager';

type TabType = 'dashboard' | 'orders' | 'mangalitsa' | 'eggs' | 'chickens' | 'inventory' | 'customers' | 'analytics' | 'rebates' | 'recipes' | 'settings';

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

  // Pig-specific fields (optional)
  box_size?: number;
  effective_box_size?: number;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  is_mangalitsa?: boolean;
  mangalitsa_preset_id?: string | null;
  fresh_delivery?: boolean;
  ribbe_choice?: string;
  extra_products?: any[];
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

  // Sub-tab state
  const [mangalitsaSubTab, setMangalitsaSubTab] = useState<'boxes' | 'extras' | 'cuts'>('boxes');
  const [eggsSubTab, setEggsSubTab] = useState<'orders' | 'inventory' | 'breeds' | 'analytics' | 'calendar' | 'messages'>('orders');
  const [customersSubTab, setCustomersSubTab] = useState<'database' | 'messages' | 'communication'>('database');
  const [chickensSubTab, setChickensSubTab] = useState<'orders' | 'hatches' | 'breeds'>('orders');

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
      const pigResponse = await fetch('/api/admin/dashboard');
      if (!pigResponse.ok) {
        if (pigResponse.status === 403) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error('Failed to load pig dashboard');
      }
      const pigData = await pigResponse.json();
      setDashboardMetrics({ pigs: pigData });
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

      const pigResponse = await fetch(`/api/admin/orders?${params}`);
      const pigData = await pigResponse.json();
      const pigOrders: Order[] = (pigData.orders || []).map((o: any) => ({
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
    } else if (isAuthenticated && activeTab === 'orders') {
      loadOrders();
    } else if (isAuthenticated && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [isAuthenticated, activeTab, loadDashboard, loadOrders, loadAnalytics]);

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
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDelivery = deliveryFilter === 'all' || order.delivery_type === deliveryFilter;

    return matchesSearch && matchesStatus && matchesDelivery;
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
    { id: 'orders', label: copy.tabs.orders, icon: ShoppingCart },
    { id: 'mangalitsa', label: 'Mangalitsa', icon: Beef },
    { id: 'eggs', label: copy.tabs.eggs || (lang === 'no' ? 'Rugeegg' : 'Eggs'), icon: Egg },
    { id: 'inventory', label: copy.tabs.inventory, icon: Warehouse },
    { id: 'customers', label: copy.tabs.customers, icon: Users },
    { id: 'analytics', label: copy.tabs.analytics, icon: BarChart3 },
    { id: 'rebates', label: copy.tabs.rebates, icon: Tag },
    { id: 'chickens', label: 'Kyllinger', icon: Bird },
    { id: 'recipes', label: 'Oppskrifter', icon: BookOpen },
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

  const unresolvedCount = messageStats.open + messageStats.in_progress;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light tracking-tight text-neutral-900">Tinglumgård Admin</h1>
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

      {/* Tabs - 8 tabs */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 whitespace-nowrap relative',
                    activeTab === tab.id
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {/* Unread messages badge on Kunder tab */}
                  {tab.id === 'customers' && unresolvedCount > 0 && (
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

        {/* ═══════════ DASHBOARD TAB ═══════════ */}
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

            {/* Message stats card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-light text-neutral-900">{copy.pendingMessagesTitle}</h3>
                  <p className="text-sm font-light text-neutral-600 mt-1">{copy.pendingMessagesSubtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-light text-neutral-900 tabular-nums">
                    {unresolvedCount}
                  </div>
                  <Button onClick={() => { setActiveTab('customers'); setCustomersSubTab('messages'); }} variant="outline">
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
                {dashboardMetrics.pigs && (
                  <DashboardMetrics metrics={dashboardMetrics.pigs} />
                )}

                {/* Mangalitsa Widget */}
                {dashboardMetrics.pigs?.mangalitsa && (
                  <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-3 mb-6">
                      <Beef className="w-6 h-6 text-amber-700" />
                      <h3 className="text-2xl font-light text-neutral-900">Mangalitsa</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-700 mb-1">Bestillinger</p>
                        <p className="text-3xl font-bold text-amber-900">{dashboardMetrics.pigs.mangalitsa.total_orders}</p>
                      </div>
                      <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-700 mb-1">Omsetning</p>
                        <p className="text-3xl font-bold text-amber-900">
                          {currency} {dashboardMetrics.pigs.mangalitsa.revenue.toLocaleString(locale)}
                        </p>
                      </div>
                      <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-700 mb-1">Fordeling</p>
                        <div className="space-y-1 mt-2">
                          {dashboardMetrics.pigs.mangalitsa.preset_breakdown.map((p: any) => (
                            <div key={p.name} className="flex justify-between text-sm">
                              <span className="text-amber-800 truncate mr-2">{p.name}</span>
                              <span className="font-bold text-amber-900">{p.count}</span>
                            </div>
                          ))}
                          {dashboardMetrics.pigs.mangalitsa.preset_breakdown.length === 0 && (
                            <p className="text-sm text-amber-600">Ingen bestillinger ennå</p>
                          )}
                        </div>
                      </div>
                    </div>
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

        {/* ═══════════ ORDERS TAB (merged with Production/Calendar) ═══════════ */}
        {activeTab === 'orders' && (
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
                                  setSelectedOrder(order);
                                  setShowOrderDetail(true);
                                }}
                                className="font-medium text-blue-600 hover:text-blue-800"
                              >
                                {order.order_number}
                              </button>
                              {(order.is_mangalitsa || order.mangalitsa_preset_id) && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                                  Mangalitsa
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
                            <span className="text-gray-900">
                              {getPigProductLabel(order)}
                            </span>
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
                            <div>{order.delivery_type}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {currency} {order.total_amount.toLocaleString(locale)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString(locale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
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

            {/* Delivery Calendar - merged from old Production tab */}
            <div className="pt-8 border-t border-neutral-200">
              <h3 className="text-2xl font-light text-neutral-900 mb-6">{copy.tabs.production}</h3>
              <DeliveryCalendar />
            </div>
          </div>
        )}

        {/* ═══════════ MANGALITSA TAB (sub-tabbed: Bokser + Ekstra) ═══════════ */}
        {activeTab === 'mangalitsa' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Beef className="w-7 h-7 text-amber-700" />
              <h2 className="text-3xl font-light tracking-tight text-neutral-900">Mangalitsa</h2>
            </div>

            {/* Sub-tab bar */}
            <div className="border-b border-neutral-200">
              <div className="flex gap-1">
                <button
                  onClick={() => setMangalitsaSubTab('boxes')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    mangalitsaSubTab === 'boxes'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  Bokser
                  {mangalitsaSubTab === 'boxes' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setMangalitsaSubTab('extras')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    mangalitsaSubTab === 'extras'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  Ekstraprodukter
                  {mangalitsaSubTab === 'extras' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setMangalitsaSubTab('cuts')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    mangalitsaSubTab === 'cuts'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  Stykker
                  {mangalitsaSubTab === 'cuts' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
              </div>
            </div>

            {mangalitsaSubTab === 'boxes' && <MangalitsaBoxManager />}
            {mangalitsaSubTab === 'extras' && <MangalitsaExtrasManager />}
            {mangalitsaSubTab === 'cuts' && <MangalitsaCutsManager />}
          </div>
        )}

        {/* ═══════════ INVENTORY TAB ═══════════ */}
        {activeTab === 'eggs' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Egg className="w-7 h-7 text-neutral-700" />
              <h2 className="text-3xl font-light tracking-tight text-neutral-900">
                {copy.tabs.eggs || (lang === 'no' ? 'Rugeegg' : 'Eggs')}
              </h2>
            </div>

            <div className="border-b border-neutral-200">
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setEggsSubTab('orders')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'orders'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {lang === 'no' ? 'Bestillinger' : 'Orders'}
                  {eggsSubTab === 'orders' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setEggsSubTab('inventory')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'inventory'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {lang === 'no' ? 'Lager' : 'Inventory'}
                  {eggsSubTab === 'inventory' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setEggsSubTab('breeds')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'breeds'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {lang === 'no' ? 'Raser' : 'Breeds'}
                  {eggsSubTab === 'breeds' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setEggsSubTab('calendar')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'calendar'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {copy.tabs.production}
                  {eggsSubTab === 'calendar' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setEggsSubTab('messages')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'messages'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {copy.tabs.messages}
                  {eggsSubTab === 'messages' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setEggsSubTab('analytics')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
                    eggsSubTab === 'analytics'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  {copy.tabs.analytics}
                  {eggsSubTab === 'analytics' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
              </div>
            </div>

            {eggsSubTab === 'orders' && <EggOrdersWorkbench />}
            {eggsSubTab === 'inventory' && <EggInventoryManagement />}
            {eggsSubTab === 'breeds' && <BreedManagement />}
            {eggsSubTab === 'calendar' && <DeliveryCalendar />}
            {eggsSubTab === 'messages' && <AdminMessagingPanel />}
            {eggsSubTab === 'analytics' && <EggAnalytics />}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <InventoryManagement />
          </div>
        )}

        {/* ═══════════ CUSTOMERS TAB (sub-tabbed: Database + Messages + Communication) ═══════════ */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-light tracking-tight text-neutral-900">{copy.tabs.customers}</h2>

            {/* Sub-tab bar */}
            <div className="border-b border-neutral-200">
              <div className="flex gap-1">
                <button
                  onClick={() => setCustomersSubTab('database')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    customersSubTab === 'database'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  Database
                  {customersSubTab === 'database' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setCustomersSubTab('messages')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    customersSubTab === 'messages'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  <span className="flex items-center gap-2">
                    Meldinger
                    {unresolvedCount > 0 && (
                      <span className="inline-flex items-center justify-center text-xs font-light bg-red-600 text-white rounded-full px-2 py-0.5">
                        {unresolvedCount}
                      </span>
                    )}
                  </span>
                  {customersSubTab === 'messages' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
                <button
                  onClick={() => setCustomersSubTab('communication')}
                  className={cn(
                    'px-5 py-3 text-sm font-light transition-all relative',
                    customersSubTab === 'communication'
                      ? 'text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  Utsendelser
                  {customersSubTab === 'communication' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
              </div>
            </div>

            {customersSubTab === 'database' && <CustomerDatabase />}
            {customersSubTab === 'messages' && <AdminMessagingPanel />}
            {customersSubTab === 'communication' && (
              <div className="space-y-6">
                <CommunicationCenter />
                <CommunicationHistory />
              </div>
            )}
          </div>
        )}

        {/* ═══════════ ANALYTICS TAB ═══════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">{copy.analyticsTitle}</h2>

            {analytics ? (
              <div className="space-y-8">
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

                {/* Mangalitsa Analytics Section */}
                {analytics.mangalitsa && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Beef className="w-6 h-6 text-amber-700" />
                      <h3 className="text-2xl font-light text-neutral-900">Mangalitsa-analyse</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Split card */}
                      <Card className="p-6 bg-amber-50 border-amber-200">
                        <h4 className="font-normal text-lg mb-4 text-amber-900">Fordeling</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-amber-800">Mangalitsa-bestillinger</span>
                            <span className="font-bold text-amber-900">{analytics.mangalitsa.split.mangalitsa_orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-800">Standard-bestillinger</span>
                            <span className="font-bold text-amber-900">{analytics.mangalitsa.split.standard_orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-800">Mangalitsa-andel</span>
                            <span className="font-bold text-amber-900">{analytics.mangalitsa.split.mangalitsa_share_pct}%</span>
                          </div>
                          <div className="pt-2 border-t border-amber-200">
                            <div className="flex justify-between">
                              <span className="text-amber-800">Mangalitsa-omsetning</span>
                              <span className="font-bold text-amber-900">
                                {currency} {analytics.mangalitsa.split.mangalitsa_revenue.toLocaleString(locale)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Preset ranking */}
                      <Card className="p-6">
                        <h4 className="font-normal text-lg mb-4">Preset-rangering</h4>
                        <div className="space-y-3">
                          {analytics.mangalitsa.preset_ranking.length > 0 ? (
                            analytics.mangalitsa.preset_ranking.map((preset: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                <div>
                                  <p className="font-medium text-gray-900">{preset.name}</p>
                                  <p className="text-sm text-gray-600">{currency} {preset.revenue.toLocaleString(locale)}</p>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{preset.count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Ingen Mangalitsa-bestillinger ennå</p>
                          )}
                        </div>
                      </Card>

                      {/* Revenue trend */}
                      <Card className="p-6">
                        <h4 className="font-normal text-lg mb-4">Trend per uke</h4>
                        <div className="space-y-2">
                          {analytics.mangalitsa.revenue_trend.length > 0 ? (
                            analytics.mangalitsa.revenue_trend.slice(-8).map((week: any) => (
                              <div key={week.week} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{week.week}</span>
                                <div className="text-right">
                                  <span className="font-bold text-gray-900">{week.count} </span>
                                  <span className="text-gray-500">({currency} {week.revenue.toLocaleString(locale)})</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Ingen data ennå</p>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">{copy.loadingAnalytics}</p>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════ REBATES TAB ═══════════ */}
        {activeTab === 'rebates' && <RebateCodesManager />}

        {/* ═══════════ CHICKENS TAB ═══════════ */}
        {activeTab === 'chickens' && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b pb-3">
              {[
                { id: 'orders' as const, label: 'Bestillinger' },
                { id: 'hatches' as const, label: 'Kull' },
                { id: 'breeds' as const, label: 'Raser' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setChickensSubTab(sub.id)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg transition-colors',
                    chickensSubTab === sub.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            {chickensSubTab === 'orders' && <ChickenOrdersManager />}
            {chickensSubTab === 'hatches' && <ChickenHatchManager />}
            {chickensSubTab === 'breeds' && <ChickenBreedManager />}
          </div>
        )}

        {/* ═══════════ RECIPES TAB ═══════════ */}
        {activeTab === 'recipes' && <RecipeManager />}

        {/* ═══════════ SETTINGS TAB (merged with SystemHealth) ═══════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <ConfigurationManagement />

            <div className="pt-8 border-t border-neutral-200">
              <h3 className="text-2xl font-light text-neutral-900 mb-6">Systemhelse</h3>
              <SystemHealth />
            </div>
          </div>
        )}
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
