'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, Package } from 'lucide-react';

interface BreedStats {
  breed_name: string;
  total_orders: number;
  total_eggs: number;
  total_revenue: number;
}

interface WeekStats {
  week_number: number;
  year: number;
  orders: number;
  eggs_sold: number;
  revenue: number;
}

interface AnalyticsData {
  breed_stats: BreedStats[];
  week_stats: WeekStats[];
  top_customers: Array<{
    customer_email: string;
    customer_name: string;
    total_orders: number;
    total_spent: number;
  }>;
  summary: {
    avg_order_value: number;
    avg_eggs_per_order: number;
    total_weeks_with_orders: number;
  };
}

export function EggAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/eggs/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600">Ingen analysedata tilgjengelig</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Egg Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Salgsanalyse og trender</p>
        </div>
        <Button onClick={loadAnalytics} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Oppdater
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gj.snitt ordrestørrelse</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.summary.avg_eggs_per_order.toFixed(1)} egg
              </p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gj.snitt ordreverdi</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(data.summary.avg_order_value / 100).toFixed(0)} kr
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uker med salg</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.summary.total_weeks_with_orders}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-purple-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breed Statistics */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Salg per rase</h3>
          <div className="space-y-4">
            {data.breed_stats.map((breed, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{breed.breed_name}</span>
                  <span className="text-sm text-gray-600">
                    {breed.total_orders} ordrer
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{breed.total_eggs} egg</span>
                  <span className="font-semibold">
                    {(breed.total_revenue / 100).toFixed(0)} kr
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        (breed.total_revenue / Math.max(...data.breed_stats.map((b) => b.total_revenue))) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {data.breed_stats.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Ingen salgsdata ennå
              </p>
            )}
          </div>
        </Card>

        {/* Week Statistics */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Ukentlig salg</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.week_stats.map((week, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">
                    Uke {week.week_number}, {week.year}
                  </span>
                  <span className="text-sm text-gray-600">{week.orders} ordrer</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{week.eggs_sold} egg</span>
                  <span className="font-semibold">
                    {(week.revenue / 100).toFixed(0)} kr
                  </span>
                </div>
              </div>
            ))}
            {data.week_stats.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Ingen salgsdata ennå
              </p>
            )}
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Toppkunder (egg)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.top_customers.map((customer, index) => (
              <div key={index} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {customer.customer_name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {customer.customer_email}
                    </p>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-gray-600">{customer.total_orders} ordrer</span>
                  <span className="font-semibold text-gray-900">
                    {(customer.total_spent / 100).toFixed(0)} kr
                  </span>
                </div>
              </div>
            ))}
            {data.top_customers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 col-span-full">
                Ingen kundedata ennå
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
