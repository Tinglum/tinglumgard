'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Mail, RefreshCw } from 'lucide-react';

interface EmailHistoryItem {
  id: string;
  recipient: string;
  subject: string;
  message: string;
  sent_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
    status: string;
  };
}

export function CommunicationHistory() {
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_all_history' }),
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading email history:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">E-posthistorikk</h2>
          <p className="text-gray-600">Oversikt over alle sendte e-poster</p>
        </div>
        <Button onClick={loadHistory} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Oppdater
        </Button>
      </div>

      {history.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Ingen e-poster sendt ennå</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {item.subject}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {new Date(item.sent_at).toLocaleString('nb-NO')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Til:</span> {item.recipient}
                      {item.orders && (
                        <span className="ml-2 text-gray-500">
                          ({item.orders.customer_name} - {item.orders.order_number})
                        </span>
                      )}
                    </p>
                    <p className="line-clamp-2 text-gray-500">
                      {item.message.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
