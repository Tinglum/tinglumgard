'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Package, Truck, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeliveryGroup {
  date: string;
  delivery_type: string;
  location?: string;
  orders: Array<{
    order_number: string;
    customer_name: string;
    box_size: number;
    fresh_delivery: boolean;
    marked_collected: boolean;
  }>;
}

export function DeliveryCalendar() {
  const { t, lang } = useLanguage();
  const copy = t.deliveryCalendar;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const [deliveryGroups, setDeliveryGroups] = useState<DeliveryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'pickup' | 'delivery'>('all');

  useEffect(() => {
    loadDeliveryGroups();
  }, []);

  async function loadDeliveryGroups() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/delivery-calendar');
      const data = await response.json();
      setDeliveryGroups(data.groups || []);
    } catch (error) {
      console.error('Error loading delivery calendar:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markCollected(orderNumber: string) {
    try {
      const response = await fetch('/api/admin/delivery-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_collected', order_number: orderNumber }),
      });

      if (response.ok) {
        await loadDeliveryGroups();
      }
    } catch (error) {
      console.error('Error marking collected:', error);
    }
  }

  const filteredGroups = deliveryGroups.filter((group) => {
    if (selectedType === 'all') return true;
    if (selectedType === 'pickup') return group.delivery_type !== 'delivery';
    return group.delivery_type === 'delivery';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="text-gray-600">{copy.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setSelectedType('all')}
          variant={selectedType === 'all' ? 'default' : 'outline'}
          className={selectedType === 'all' ? 'bg-[#2C1810]' : ''}
        >
          {copy.filterAll} ({deliveryGroups.reduce((sum, g) => sum + g.orders.length, 0)})
        </Button>
        <Button
          onClick={() => setSelectedType('pickup')}
          variant={selectedType === 'pickup' ? 'default' : 'outline'}
          className={selectedType === 'pickup' ? 'bg-[#2C1810]' : ''}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {copy.filterPickup} ({deliveryGroups.filter((g) => g.delivery_type !== 'delivery').reduce((sum, g) => sum + g.orders.length, 0)})
        </Button>
        <Button
          onClick={() => setSelectedType('delivery')}
          variant={selectedType === 'delivery' ? 'default' : 'outline'}
          className={selectedType === 'delivery' ? 'bg-[#2C1810]' : ''}
        >
          <Truck className="w-4 h-4 mr-2" />
          {copy.filterDelivery} ({deliveryGroups.filter((g) => g.delivery_type === 'delivery').reduce((sum, g) => sum + g.orders.length, 0)})
        </Button>
      </div>

      {filteredGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">{copy.emptyTitle}</p>
          <p className="text-sm text-gray-500 mt-2">{copy.emptySubtitle}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {group.delivery_type === 'delivery' ? (
                    <Truck className="w-6 h-6 text-blue-600" />
                  ) : (
                    <MapPin className="w-6 h-6 text-green-600" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {group.delivery_type === 'delivery' ? copy.deliveryTypeHome : copy.deliveryTypeFarmPickup}
                    </h3>
                    {group.location && <p className="text-sm text-gray-600">{group.location}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{copy.dateLabel}</p>
                  <p className="font-semibold">{new Date(group.date).toLocaleDateString(locale)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {group.orders.map((order) => (
                  <div
                    key={order.order_number}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border',
                      order.marked_collected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Package className={cn('w-5 h-5', order.marked_collected ? 'text-green-600' : 'text-gray-600')} />
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {copy.orderPrefix}: {order.order_number} - {order.box_size} {t.common.kg}
                          {order.fresh_delivery ? ` - ${copy.freshTag}` : ''}
                        </p>
                      </div>
                    </div>
                    <div>
                      {order.marked_collected ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">{copy.collected}</span>
                        </div>
                      ) : (
                        <Button onClick={() => markCollected(order.order_number)} size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {copy.markCollected}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{copy.ordersCount.replace('{count}', String(group.orders.length))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>
                    {copy.kgTotal.replace('{count}', String(group.orders.reduce((sum, o) => sum + o.box_size, 0)))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {copy.collectedCount.replace('{count}', String(group.orders.filter((o) => o.marked_collected).length))}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">{copy.tipsTitle}</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          {copy.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
