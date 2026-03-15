'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Egg,
  Settings,
  Lock,
  MessageSquare,
  Beef,
  Bird,
  Package,
  ListChecks,
} from 'lucide-react';
import { ActionDashboard } from '@/components/admin/ActionDashboard';
import { PigOrdersTable } from '@/components/admin/PigOrdersTable';
import { CustomerDatabase } from '@/components/admin/CustomerDatabase';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { AdminMessagingPanel } from '@/components/admin/AdminMessagingPanel';
import { EmailControlCenter } from '@/components/admin/EmailControlCenter';
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
import { UnifiedEggChickenOrdersManager } from '@/components/admin/UnifiedEggChickenOrdersManager';
import { EggWishlistManager } from '@/components/admin/EggWishlistManager';
import { EggOpsDailyCollection } from '@/components/eggops/EggOpsDailyCollection';

type TabType = 'dashboard' | 'orders' | 'products' | 'customers' | 'settings';

// Orders sub-tabs
type OrdersSubTab = 'pig' | 'unified' | 'egg' | 'wishlist' | 'chicken' | 'calendar';

// Products L1 sub-tabs
type ProductsL1 = 'mangalitsa' | 'eggs' | 'chickens';

// Products L2 sub-tabs
type MangalitsaL2 = 'boxes' | 'extras' | 'cuts' | 'recipes' | 'inventory';
type EggsL2 = 'daily' | 'inventory' | 'breeds' | 'analytics';
type ChickensL2 = 'hatches' | 'breeds';

// Customers sub-tabs
type CustomersSubTab = 'database' | 'messages' | 'email';

// Settings sub-tabs
type SettingsSubTab = 'config' | 'rebates' | 'health';

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const copy = t.adminPage;

  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [ordersSubTab, setOrdersSubTab] = useState<OrdersSubTab>('unified');
  const [productsL1, setProductsL1] = useState<ProductsL1>('mangalitsa');
  const [mangalitsaL2, setMangalitsaL2] = useState<MangalitsaL2>('boxes');
  const [eggsL2, setEggsL2] = useState<EggsL2>('daily');
  const [chickensL2, setChickensL2] = useState<ChickensL2>('hatches');
  const [customersSubTab, setCustomersSubTab] = useState<CustomersSubTab>('database');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('config');
  const [deepLinkParsed, setDeepLinkParsed] = useState(false);
  const [deepLinkPigOrderId, setDeepLinkPigOrderId] = useState<string | null>(null);
  const [deepLinkEggOrderId, setDeepLinkEggOrderId] = useState<string | null>(null);
  const [deepLinkChickenOrderId, setDeepLinkChickenOrderId] = useState<string | null>(null);

  // Message badge
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || deepLinkParsed || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rawTab = (params.get('tab') || '').trim().toLowerCase();
    const orderId = (params.get('orderId') || '').trim();
    const hasParams = rawTab.length > 0 || orderId.length > 0;

    if (!hasParams) {
      setDeepLinkParsed(true);
      return;
    }

    const resolveFromOrderId = (): OrdersSubTab => {
      if (/^CHICK/i.test(orderId)) return 'chicken';
      if (/^EGG/i.test(orderId)) return 'egg';
      return 'pig';
    };

    let targetOrdersSubTab: OrdersSubTab | null = null;

    if (rawTab === 'pig' || rawTab === 'orders' || rawTab === 'pig-orders') {
      targetOrdersSubTab = 'pig';
    } else if (rawTab === 'egg' || rawTab === 'egg-orders') {
      targetOrdersSubTab = 'egg';
    } else if (rawTab === 'chicken' || rawTab === 'chicken-orders') {
      targetOrdersSubTab = 'chicken';
    } else if (rawTab === 'unified') {
      targetOrdersSubTab = 'unified';
    } else if (orderId) {
      targetOrdersSubTab = resolveFromOrderId();
    }

    if (targetOrdersSubTab) {
      setActiveTab('orders');
      setOrdersSubTab(targetOrdersSubTab);

      if (orderId) {
        if (targetOrdersSubTab === 'pig') {
          setDeepLinkPigOrderId(orderId);
        } else if (targetOrdersSubTab === 'egg') {
          setDeepLinkEggOrderId(orderId);
        } else if (targetOrdersSubTab === 'chicken') {
          setDeepLinkChickenOrderId(orderId);
        }
      }
    }

    setDeepLinkParsed(true);
  }, [deepLinkParsed, isAuthenticated]);

  // Load message stats for badge
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadMessageStats() {
      try {
        const response = await fetch('/api/admin/messages');
        if (!response.ok) {
          if (response.status === 401) setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data?.stats) {
          setUnresolvedCount(data.stats.open + data.stats.in_progress);
        }
      } catch {
        // Non-critical
      }
    }

    loadMessageStats();
    const interval = setInterval(loadMessageStats, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const returnTo =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('returnTo')
          : null;
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, returnTo }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (typeof window !== 'undefined' && typeof data?.redirectTo === 'string' && data.redirectTo.trim()) {
          const target = data.redirectTo.trim();
          if (target.startsWith('/admin')) {
            window.history.replaceState(null, '', target);
          } else {
            window.location.href = target;
            return;
          }
        }
        setIsAuthenticated(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    } finally {
      setLoading(false);
    }
  }

  // Dashboard navigation handler
  function handleDashboardNavigate(tab: string, subTab?: string) {
    if (tab === 'orders') {
      setActiveTab('orders');
      if (subTab === 'pig' || subTab === 'unified' || subTab === 'egg' || subTab === 'chicken' || subTab === 'calendar') {
        setOrdersSubTab(subTab);
      }
    } else if (tab === 'customers') {
      setActiveTab('customers');
      if (subTab === 'messages' || subTab === 'database' || subTab === 'email') {
        setCustomersSubTab(subTab);
      }
    } else if (tab === 'products') {
      setActiveTab('products');
    } else if (tab === 'settings') {
      setActiveTab('settings');
    }
  }

  // Navigate to a specific order from dashboard
  function handleNavigateToOrder(orderId: string) {
    const resolveSubTab = (): OrdersSubTab => {
      if (/^CHICK/i.test(orderId)) return 'chicken';
      if (/^EGG/i.test(orderId)) return 'egg';
      return 'pig';
    };

    const subTab = resolveSubTab();
    setActiveTab('orders');
    setOrdersSubTab(subTab);

    if (subTab === 'pig') {
      setDeepLinkPigOrderId(orderId);
    } else if (subTab === 'egg') {
      setDeepLinkEggOrderId(orderId);
    } else if (subTab === 'chicken') {
      setDeepLinkChickenOrderId(orderId);
    }

    // Update URL for bookmarkability
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'orders');
    params.set('orderId', orderId);
    window.history.pushState({}, '', `/admin?${params.toString()}`);
  }

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

  const tabs: Array<{ id: TabType; label: string; icon: any; badge?: number }> = [
    { id: 'dashboard', label: lang === 'no' ? 'Oversikt' : 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: lang === 'no' ? 'Bestillinger' : 'Orders', icon: ShoppingCart },
    { id: 'products', label: lang === 'no' ? 'Produkter' : 'Products', icon: Package },
    { id: 'customers', label: lang === 'no' ? 'Kunder' : 'Customers', icon: Users, badge: unresolvedCount || undefined },
    { id: 'settings', label: lang === 'no' ? 'Innstillinger' : 'Settings', icon: Settings },
  ];

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
                setDeepLinkParsed(false);
                setDeepLinkPigOrderId(null);
                setDeepLinkEggOrderId(null);
                setDeepLinkChickenOrderId(null);
              }}
              className="px-6 py-3 border-2 border-neutral-200 text-neutral-900 rounded-xl text-sm font-light hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300"
            >
              {copy.logoutButton}
            </button>
          </div>
        </div>
      </div>

      {/* Top-level tabs (5 tabs) */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-2">
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
                  {tab.badge && tab.badge > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center text-xs font-light bg-red-600 text-white rounded-full px-2 py-0.5 shadow-[0_5px_15px_-5px_rgba(220,38,38,0.4)]">
                      {tab.badge}
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

        {/* ═══════════ TAB 1: DASHBOARD ═══════════ */}
        {activeTab === 'dashboard' && (
          <ActionDashboard onNavigate={handleDashboardNavigate} onNavigateToOrder={handleNavigateToOrder} />
        )}

        {/* ═══════════ TAB 2: ORDERS ═══════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Sub-tab bar */}
            <SubTabBar
              tabs={[
                { id: 'pig', label: lang === 'no' ? 'Gris' : 'Pig', icon: Beef },
                { id: 'unified', label: lang === 'no' ? 'Rugeegg + Kylling' : 'Egg + Chicken', icon: Package },
                { id: 'egg', label: lang === 'no' ? 'Egg' : 'Eggs', icon: Egg },
                { id: 'wishlist', label: lang === 'no' ? 'Ønskeliste' : 'Wishlist', icon: ListChecks },
                { id: 'chicken', label: lang === 'no' ? 'Kylling' : 'Chicken', icon: Bird },
                { id: 'calendar', label: lang === 'no' ? 'Kalender' : 'Calendar', icon: LayoutDashboard },
              ]}
              active={ordersSubTab}
              onChange={(id) => setOrdersSubTab(id as OrdersSubTab)}
            />

            {ordersSubTab === 'pig' && (
              <PigOrdersTable
                initialOrderId={deepLinkPigOrderId}
                onInitialOrderHandled={() => setDeepLinkPigOrderId(null)}
              />
            )}
            {ordersSubTab === 'unified' && <UnifiedEggChickenOrdersManager />}
            {ordersSubTab === 'egg' && (
              <EggOrdersWorkbench
                initialOrderId={deepLinkEggOrderId}
                onInitialOrderHandled={() => setDeepLinkEggOrderId(null)}
              />
            )}
            {ordersSubTab === 'wishlist' && <EggWishlistManager />}
            {ordersSubTab === 'chicken' && (
              <ChickenOrdersManager
                initialOrderId={deepLinkChickenOrderId}
                onInitialOrderHandled={() => setDeepLinkChickenOrderId(null)}
              />
            )}
            {ordersSubTab === 'calendar' && <DeliveryCalendar />}
          </div>
        )}

        {/* ═══════════ TAB 3: PRODUCTS ═══════════ */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* L1 sub-tab bar (pills) */}
            <div className="flex gap-2">
              {([
                { id: 'mangalitsa' as const, label: 'Mangalitsa', icon: Beef },
                { id: 'eggs' as const, label: lang === 'no' ? 'Rugeegg' : 'Eggs', icon: Egg },
                { id: 'chickens' as const, label: lang === 'no' ? 'Kyllinger' : 'Chickens', icon: Bird },
              ]).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setProductsL1(item.id)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-light transition-all',
                      productsL1 === item.id
                        ? 'bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Mangalitsa L2 */}
            {productsL1 === 'mangalitsa' && (
              <div className="space-y-6">
                <SubTabBar
                  tabs={[
                    { id: 'boxes', label: lang === 'no' ? 'Bokser' : 'Boxes' },
                    { id: 'extras', label: lang === 'no' ? 'Ekstra' : 'Extras' },
                    { id: 'cuts', label: lang === 'no' ? 'Stykker' : 'Cuts' },
                    { id: 'recipes', label: lang === 'no' ? 'Oppskrifter' : 'Recipes' },
                    { id: 'inventory', label: lang === 'no' ? 'Lager' : 'Inventory' },
                  ]}
                  active={mangalitsaL2}
                  onChange={(id) => setMangalitsaL2(id as MangalitsaL2)}
                />
                {mangalitsaL2 === 'boxes' && <MangalitsaBoxManager />}
                {mangalitsaL2 === 'extras' && <MangalitsaExtrasManager />}
                {mangalitsaL2 === 'cuts' && <MangalitsaCutsManager />}
                {mangalitsaL2 === 'recipes' && <RecipeManager />}
                {mangalitsaL2 === 'inventory' && <InventoryManagement />}
              </div>
            )}

            {/* Eggs L2 */}
            {productsL1 === 'eggs' && (
              <div className="space-y-6">
                <SubTabBar
                  tabs={[
                    { id: 'daily', label: lang === 'no' ? 'Daglig innsamling' : 'Daily collection' },
                    { id: 'inventory', label: lang === 'no' ? 'Lager' : 'Inventory' },
                    { id: 'breeds', label: lang === 'no' ? 'Raser' : 'Breeds' },
                    { id: 'analytics', label: lang === 'no' ? 'Analyse' : 'Analytics' },
                  ]}
                  active={eggsL2}
                  onChange={(id) => setEggsL2(id as EggsL2)}
                />
                {eggsL2 === 'daily' && <EggOpsDailyCollection embedded />}
                {eggsL2 === 'inventory' && <EggInventoryManagement />}
                {eggsL2 === 'breeds' && <BreedManagement />}
                {eggsL2 === 'analytics' && <EggAnalytics />}
              </div>
            )}

            {/* Chickens L2 */}
            {productsL1 === 'chickens' && (
              <div className="space-y-6">
                <SubTabBar
                  tabs={[
                    { id: 'hatches', label: lang === 'no' ? 'Kull' : 'Hatches' },
                    { id: 'breeds', label: lang === 'no' ? 'Raser' : 'Breeds' },
                  ]}
                  active={chickensL2}
                  onChange={(id) => setChickensL2(id as ChickensL2)}
                />
                {chickensL2 === 'hatches' && <ChickenHatchManager />}
                {chickensL2 === 'breeds' && <ChickenBreedManager />}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 4: CUSTOMERS ═══════════ */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <SubTabBar
              tabs={[
                { id: 'database', label: 'Database' },
                { id: 'messages', label: lang === 'no' ? 'Meldinger' : 'Messages', icon: MessageSquare, badge: unresolvedCount || undefined },
                { id: 'email', label: 'E-post', icon: undefined },
              ]}
              active={customersSubTab}
              onChange={(id) => setCustomersSubTab(id as CustomersSubTab)}
            />

            {customersSubTab === 'database' && <CustomerDatabase />}
            {customersSubTab === 'messages' && <AdminMessagingPanel />}
            {customersSubTab === 'email' && <EmailControlCenter />}
          </div>
        )}

        {/* ═══════════ TAB 5: SETTINGS ═══════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <SubTabBar
              tabs={[
                { id: 'config', label: lang === 'no' ? 'Konfigurasjon' : 'Configuration' },
                { id: 'rebates', label: lang === 'no' ? 'Rabattkoder' : 'Rebate codes' },
                { id: 'health', label: lang === 'no' ? 'Systemhelse' : 'System health' },
              ]}
              active={settingsSubTab}
              onChange={(id) => setSettingsSubTab(id as SettingsSubTab)}
            />

            {settingsSubTab === 'config' && <ConfigurationManagement />}
            {settingsSubTab === 'rebates' && <RebateCodesManager />}
            {settingsSubTab === 'health' && <SystemHealth />}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable underline-style sub-tab bar
function SubTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: any; badge?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-neutral-200">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-5 py-3 text-sm font-light transition-all relative whitespace-nowrap',
              active === tab.id
                ? 'text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="inline-flex items-center justify-center text-xs font-light bg-red-600 text-white rounded-full px-2 py-0.5">
                  {tab.badge}
                </span>
              )}
            </span>
            {active === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
