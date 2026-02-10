'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  X,
  ShoppingCart,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface OrderTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export function OrderTimelineModal({ isOpen, onClose, order }: OrderTimelineModalProps) {
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const copy = t.orderTimelineModal;

  if (!isOpen) return null;

  const events: TimelineEvent[] = [];

  events.push({
    id: 'created',
    type: 'order_created',
    title: copy.orderCreated,
    description: copy.orderCreatedDesc.replace('{orderNumber}', order.order_number),
    timestamp: order.created_at,
    icon: ShoppingCart,
    color: 'blue',
  });

  const depositPayment = order.payments?.find((payment: any) => payment.payment_type === 'deposit');
  if (depositPayment) {
    events.push({
      id: 'deposit',
      type: 'deposit_paid',
      title: depositPayment.status === 'completed' ? copy.depositPaid : copy.depositPending,
      description: `${t.common.currency} ${depositPayment.amount_nok.toLocaleString(locale)}`,
      timestamp: depositPayment.paid_at || depositPayment.created_at,
      icon: CreditCard,
      color: depositPayment.status === 'completed' ? 'green' : 'yellow',
    });
  }

  if (order.last_modified_at && order.last_modified_at !== order.created_at) {
    events.push({
      id: 'modified',
      type: 'order_modified',
      title: copy.orderModified,
      description: copy.orderModifiedDesc,
      timestamp: order.last_modified_at,
      icon: Edit3,
      color: 'blue',
    });
  }

  if (order.locked_at) {
    events.push({
      id: 'locked',
      type: 'order_locked',
      title: copy.orderLocked,
      description: copy.orderLockedDesc,
      timestamp: order.locked_at,
      icon: Lock,
      color: 'orange',
    });
  }

  const remainderPayment = order.payments?.find((payment: any) => payment.payment_type === 'remainder');
  if (remainderPayment) {
    events.push({
      id: 'remainder',
      type: 'remainder_paid',
      title: remainderPayment.status === 'completed' ? copy.remainderPaid : copy.remainderPending,
      description: `${t.common.currency} ${remainderPayment.amount_nok.toLocaleString(locale)}`,
      timestamp: remainderPayment.paid_at || remainderPayment.created_at,
      icon: CreditCard,
      color: remainderPayment.status === 'completed' ? 'green' : 'yellow',
    });
  }

  if (order.status === 'in_production' || order.status === 'ready_for_pickup' || order.status === 'completed') {
    events.push({
      id: 'production',
      type: 'in_production',
      title: copy.inProduction,
      description: copy.inProductionDesc,
      timestamp: order.locked_at || order.created_at,
      icon: Package,
      color: 'blue',
    });
  }

  if (order.status === 'ready_for_pickup' || order.status === 'completed') {
    events.push({
      id: 'ready',
      type: 'ready',
      title: copy.readyForPickup,
      description: copy.readyForPickupDesc,
      timestamp: order.created_at,
      icon: Truck,
      color: 'green',
    });
  }

  if (order.marked_delivered_at) {
    events.push({
      id: 'delivered',
      type: 'delivered',
      title: copy.delivered,
      description: copy.deliveredDesc,
      timestamp: order.marked_delivered_at,
      icon: CheckCircle2,
      color: 'green',
    });
  }

  if (order.at_risk && !remainderPayment) {
    events.push({
      id: 'at_risk',
      type: 'at_risk',
      title: copy.paymentDeadlinePassed,
      description: copy.paymentDeadlinePassedDesc,
      timestamp: new Date().toISOString(),
      icon: AlertCircle,
      color: 'red',
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'blue':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'yellow':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'orange':
        return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'red':
        return 'bg-red-100 border-red-500 text-red-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{copy.title}</h2>
            <p className="text-gray-600">
              {copy.orderPrefix} {order.order_number}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {events.map((event) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex gap-4">
                  <div
                    className={cn(
                      'relative z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center',
                      getColorClasses(event.color)
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                      <span className="text-sm text-gray-500 ml-4 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Button onClick={onClose} variant="outline" className="w-full">
            {copy.close}
          </Button>
        </div>
      </Card>
    </div>
  );
}
