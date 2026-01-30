'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { CustomerDatabase } from '@/components/admin/CustomerDatabase';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { CommunicationCenter } from '@/components/admin/CommunicationCenter';
import { CommunicationHistory } from '@/components/admin/CommunicationHistory';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { ConfigurationManagement } from '@/components/admin/ConfigurationManagement';
import { DeliveryCalendar } from '@/components/admin/DeliveryCalendar';
import { BoxConfiguration } from '@/components/admin/BoxConfiguration';
import { RebateCodesManager } from '@/components/admin/RebateCodesManager';
import { ExtrasCatalogManager } from '@/components/admin/ExtrasCatalogManager';

type TabType = 'dashboard' | 'orders' | 'customers' | 'analytics' | 'production' | 'communication' | 'health' | 'inventory' | 'boxes' | 'rebates' | 'extras' | 'settings';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  box_size: number;
  status: string;
  delivery_type: string;
  fresh_delivery: boolean;
  ribbe_choice: string;
  extra_products: any[];
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
  const { t } = useLanguage();

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

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

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

  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard') {
      loadDashboard();
    } else if (isAuthenticated && activeTab === 'orders') {
      loadOrders();
    } else if (isAuthenticated && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [isAuthenticated, activeTab]);

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

  async function loadDashboard() {
    setDashboardLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        if (response.status === 403) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error('Failed to load dashboard');
      }
      const data = await response.json();
      setDashboardMetrics(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setDashboardLoading(false);
    }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      const response = await fetch('/api/admin/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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
        if (activeTab === 'dashboard') await loadDashboard();
        setShowOrderDetail(false);
      } else {
        alert('Kunne ikke oppdatere status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Kunne ikke oppdatere status');
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
        alert('Kunne ikke lagre notater');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Kunne ikke lagre notater');
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
      alert('Ingen ordrer valgt');
      return;
    }

    if (!window.confirm(`Endre status til "${newStatus}" for ${selectedOrders.size} ordrer?`)) {
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
        alert(`${selectedOrders.size} ordrer oppdatert`);
      } else {
        alert('Kunne ikke oppdatere ordrer');
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Kunne ikke oppdatere ordrer');
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkLock() {
    if (selectedOrders.size === 0) {
      alert('Ingen ordrer valgt');
      return;
    }

    if (!window.confirm(`Låse ${selectedOrders.size} ordrer? Dette kan ikke angres.`)) {
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
        alert(`${selectedOrders.size} ordrer låst`);
      } else {
        alert('Kunne ikke låse ordrer');
      }
    } catch (error) {
      console.error('Bulk lock error:', error);
      alert('Kunne ikke låse ordrer');
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
      alert('Kunne ikke eksportere CSV');
    }
  }

  async function handleExportProduction() {
    if (selectedOrders.size === 0) {
      alert('Velg ordrer å eksportere');
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
      alert('Kunne ikke eksportere produksjonsplan');
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

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Bestillinger', icon: ShoppingCart },
    { id: 'customers', label: 'Kunder', icon: Users },
    { id: 'analytics', label: 'Analyse', icon: BarChart3 },
    { id: 'communication', label: 'Kommunikasjon', icon: MessageSquare },
    { id: 'production', label: 'Hentekalender', icon: Calendar },
    { id: 'inventory', label: 'Lager', icon: Warehouse },
    { id: 'boxes', label: 'Boksinnhold', icon: Package },
    { id: 'rebates', label: 'Rabattkoder', icon: Tag },
    { id: 'extras', label: 'Ekstraprodukter', icon: ShoppingCart },
    { id: 'health', label: 'Systemhelse', icon: Activity },
    { id: 'settings', label: 'Innstillinger', icon: Settings },
  ];

  const statusOptions = [
    { value: 'all', label: 'Alle statuser' },
    { value: 'draft', label: 'Utkast' },
    { value: 'deposit_paid', label: 'Depositum betalt' },
    { value: 'paid', label: 'Fullstendig betalt' },
    { value: 'ready_for_pickup', label: 'Klar for henting' },
    { value: 'completed', label: 'Fullført' },
    { value: 'cancelled', label: 'Kansellert' },
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
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Login</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-password" className="text-gray-700 font-semibold">
                Passord
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2"
                autoFocus
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">Feil passord. Prøv igjen.</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Logg inn
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Tinglumgård - Admin</h1>
            <Button variant="outline" onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              setIsAuthenticated(false);
            }}>
              Logg ut
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap border-b-2',
                    activeTab === tab.id
                      ? 'text-gray-900 border-gray-900'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
              <Button onClick={loadDashboard} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Oppdater
              </Button>
            </div>

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              </div>
            ) : dashboardMetrics ? (
              <DashboardMetrics metrics={dashboardMetrics} />
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Ingen data tilgjengelig</p>
              </Card>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Søk etter ordre, navn eller e-post..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button onClick={loadOrders} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Eksporter CSV
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedOrders.size > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-900">
                    {selectedOrders.size} ordre(r) valgt
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusUpdate('ready_for_pickup')}
                      disabled={bulkActionLoading}
                    >
                      Marker klar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkLock}
                      disabled={bulkActionLoading}
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Lås
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportProduction}
                      disabled={bulkActionLoading}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Produksjonsplan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrders(new Set())}
                    >
                      Avbryt
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
                <p className="text-xl font-semibold text-gray-900 mb-2">Ingen bestillinger funnet</p>
                <p className="text-gray-600">Prøv å justere filtrene dine</p>
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ordrenr</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kunde</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Boks</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Beløp</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dato</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Handlinger</th>
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
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderDetail(true);
                              }}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              {order.order_number}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.customer_name}</p>
                              <p className="text-sm text-gray-600">{order.customer_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-900">{order.box_size}kg</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'ready_for_pickup' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'paid' ? 'bg-green-100 text-green-800' :
                              order.status === 'deposit_paid' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              {statusOptions.find((s) => s.value === order.status)?.label || order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            kr {order.total_amount.toLocaleString('nb-NO')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('nb-NO')}
                          </td>
                          <td className="px-4 py-3 text-right">
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
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Analyse & Rapporter</h2>
            {analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Nøkkeltall</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Totale bestillinger</span>
                      <span className="font-bold text-xl">{analytics.summary.total_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unike kunder</span>
                      <span className="font-bold text-xl">{analytics.summary.total_customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gjentakende kunder</span>
                      <span className="font-bold text-xl">{analytics.summary.repeat_customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gjentakelsesrate</span>
                      <span className="font-bold text-xl">{analytics.customer_insights.repeat_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Konverteringstrakt</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.conversion_funnel).map(([status, count]: [string, any]) => {
                      const percentage = (count / analytics.summary.total_orders) * 100;
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-gray-700">{status.replace('_', ' ')}</span>
                            <span className="font-semibold">{count} ({percentage.toFixed(0)}%)</span>
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
                    <h3 className="font-semibold text-lg mb-4">Populære produktkombinasjoner</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.products.combinations.map((combo: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg bg-gray-50">
                          <p className="font-medium text-gray-900">{combo.combo}</p>
                          <p className="text-2xl font-bold text-blue-600">{combo.count}</p>
                          <p className="text-sm text-gray-600">bestillinger</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Laster analysedata...</p>
              </Card>
            )}
          </div>
        )}

        {/* PRODUCTION/DELIVERY CALENDAR TAB */}
        {activeTab === 'production' && <DeliveryCalendar />}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && <InventoryManagement />}

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
                  Send e-post
                </button>
                <button
                  onClick={() => {
                    const historySection = document.getElementById('comm-history');
                    if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="pb-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-medium"
                >
                  Historikk
                </button>
              </div>
            </div>
            <CommunicationCenter />
            <div id="comm-history">
              <CommunicationHistory />
            </div>
          </div>
        )}

        {/* BOX CONFIGURATION TAB */}
        {activeTab === 'boxes' && <BoxConfiguration />}

        {/* SYSTEM HEALTH TAB */}
        {activeTab === 'health' && <SystemHealth />}

        {/* REBATE CODES TAB */}
        {activeTab === 'rebates' && <RebateCodesManager />}

        {/* EXTRAS TAB */}
        {activeTab === 'extras' && <ExtrasCatalogManager />}

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
