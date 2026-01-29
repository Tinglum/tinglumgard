'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Package, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoxItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
}

interface BoxConfig {
  box_size: number;
  price: number;
  items: BoxItem[];
  description: string;
}

interface BoxContentsProps {
  boxSize: number;
  className?: string;
}

export function BoxContents({ boxSize, className }: BoxContentsProps) {
  const [boxConfig, setBoxConfig] = useState<BoxConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoxConfig();
  }, [boxSize]);

  async function loadBoxConfig() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/box-config');
      const data = await response.json();
      const config = data.boxes?.find((b: BoxConfig) => b.box_size === boxSize);
      setBoxConfig(config || null);
    } catch (error) {
      console.error('Error loading box config:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (!boxConfig) {
    return null;
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Package className="w-6 h-6 text-[#2C1810]" />
        <div>
          <h3 className="text-lg font-bold">Innhold i {boxSize} kg boksen</h3>
          {boxConfig.description && (
            <p className="text-sm text-gray-600 mt-1">{boxConfig.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {boxConfig.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
          >
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm font-semibold text-[#2C1810]">
                  {item.quantity} {item.unit}
                </p>
              </div>
              {item.description && (
                <p className="text-xs text-gray-600 mt-1">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-600">
          Totalt: {boxConfig.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(1)} kg kjøtt
        </p>
      </div>
    </Card>
  );
}
