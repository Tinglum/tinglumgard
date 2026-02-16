'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, Calendar, Eye, AlertTriangle, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface Customer {
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
}

export function CustomerDatabase() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const copy = t.customerDatabase;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/customers?action=list');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function viewCustomerProfile(email: string) {
    try {
      const response = await fetch(`/api/admin/customers?action=profile&customerId=${encodeURIComponent(email)}`);
      const data = await response.json();
      setSelectedCustomer(data.profile);
      setShowProfile(true);
    } catch (error) {
      console.error('Error loading customer profile:', error);
    }
  }

  async function impersonateCustomer(customer: Pick<Customer, 'email' | 'name'>) {
    try {
      const response = await fetch('/api/admin/customers/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customer.email,
          returnTo: '/min-side',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || copy.impersonateErrorDescription);
      }

      toast({
        title: copy.impersonateStartingTitle,
        description: copy.impersonateStartingDescription.replace('{name}', customer.name),
      });

      window.location.href = data?.redirectTo || '/min-side';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : copy.impersonateErrorDescription;
      toast({
        title: copy.impersonateErrorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      (customer.phone && customer.phone.includes(search))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (showProfile && selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowProfile(false)} variant="outline">
              {copy.backToList}
            </Button>
            <Button
              onClick={() => impersonateCustomer({ email: selectedCustomer.email, name: selectedCustomer.name })}
              variant="outline"
            >
              <LogIn className="w-4 h-4 mr-1" />
              {copy.impersonateButton}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">{selectedCustomer.name}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.emailLabel}</p>
                <p className="font-semibold">{selectedCustomer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.phoneLabel}</p>
                <p className="font-semibold">{selectedCustomer.phone || copy.notProvided}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">{copy.firstOrderLabel}</p>
                <p className="font-semibold">{new Date(selectedCustomer.first_order_date).toLocaleDateString(locale)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-blue-50">
              <p className="text-sm text-blue-700 mb-1">{copy.totalOrdersLabel}</p>
              <p className="text-2xl font-bold text-blue-900">{selectedCustomer.total_orders}</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50">
              <p className="text-sm text-green-700 mb-1">{copy.completedLabel}</p>
              <p className="text-2xl font-bold text-green-900">{selectedCustomer.completed_orders}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50">
              <p className="text-sm text-purple-700 mb-1">{copy.totalSpentLabel}</p>
              <p className="text-2xl font-bold text-purple-900">{currency} {selectedCustomer.total_spent.toLocaleString(locale)}</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50">
              <p className="text-sm text-amber-700 mb-1">{copy.averagePerOrderLabel}</p>
              <p className="text-2xl font-bold text-amber-900">{currency} {selectedCustomer.avg_order_value.toLocaleString(locale)}</p>
            </div>
          </div>

          {selectedCustomer.product_preferences && selectedCustomer.product_preferences.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">{copy.productPreferencesTitle}</h3>
              <div className="space-y-2">
                {selectedCustomer.product_preferences.map((pref: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <span className="font-medium">{pref.product}</span>
                    <span className="text-gray-600">{copy.ordersCount.replace('{count}', String(pref.count))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCustomer.favorite_extras && selectedCustomer.favorite_extras.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">{copy.favoriteExtrasTitle}</h3>
              <div className="space-y-2">
                {selectedCustomer.favorite_extras.slice(0, 5).map((extra: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <span className="font-medium">{extra.name}</span>
                    <span className="text-gray-600">
                      {copy.extraCountAndSpend
                        .replace('{count}', String(extra.count))
                        .replace('{amount}', String(extra.total_spent))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-lg mb-3">{copy.orderHistoryTitle}</h3>
            <div className="space-y-2">
              {selectedCustomer.orders.map((order: any) => (
                <div key={order.order_number} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <span className="font-medium">{order.order_number}</span>
                    <span className="text-sm text-gray-600 ml-3">{new Date(order.created_at).toLocaleDateString(locale)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 font-semibold">
                      {currency} {order.total_amount.toLocaleString(locale)}
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {copy.statusLabels[order.status as keyof typeof copy.statusLabels] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="text-gray-600">{copy.totalCustomers.replace('{count}', String(customers.length))}</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.email}
              className="flex items-center justify-between p-4 rounded-xl border hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  {customer.at_risk && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {copy.atRiskTag}
                    </span>
                  )}
                  {customer.total_orders > 1 && (
                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      {copy.repeatTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">{copy.ordersLabel}</p>
                  <p className="font-bold text-lg">{customer.total_orders}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{copy.ltvLabel}</p>
                  <p className="font-bold text-lg text-green-600">{currency} {customer.lifetime_value.toLocaleString(locale)}</p>
                </div>
                <Button onClick={() => viewCustomerProfile(customer.email)} variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  {copy.viewProfileButton}
                </Button>
                <Button onClick={() => impersonateCustomer(customer)} variant="outline" size="sm">
                  <LogIn className="w-4 h-4 mr-1" />
                  {copy.impersonateButton}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-500">{copy.emptyResults}</div>
        )}
      </Card>
    </div>
  );
}
