'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, MessageSquare, Send, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber: string;
  orderDetails: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function ContactAdminModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderDetails,
  contactEmail,
  contactPhone,
}: ContactAdminModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  if (!isOpen) return null;

  async function handleSend() {
    if (!message.trim()) {
      toast({
        title: t.common.error,
        description: t.contact.pleaseWriteMessage,
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Henvendelse om ordre ${orderNumber}`,
          message: message.trim(),
          message_type: 'support',
          order_id: orderId || null,
        }),
      });

      if (response.ok) {
        toast({
          title: t.contact.messageSent,
          description: t.contact.responseTime,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('tinglum_message_created'));
        }
        setMessage('');
        onClose();
      } else {
        toast({
          title: t.common.error,
          description: t.contact.couldNotSend,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t.common.error,
        description: t.contact.couldNotSend,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-200 bg-white p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7" />
              {t.contact.contactUs}
            </h2>
            <p className="text-gray-600">{t.contact.regardingOrder.replace('{orderNumber}', orderNumber)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-3">{t.contact.otherWays}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Mail className="w-4 h-4" />
              <span>{contactEmail || t.contact.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Phone className="w-4 h-4" />
              <span>{contactPhone || t.contact.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold mb-2">{t.contact.yourMessage}</Label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t.contact.messagePlaceholder}
              className="min-h-[200px] mt-2"
              disabled={sending}
            />
            <p className="text-sm text-gray-500 mt-2">
              {t.contact.responseTime}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t.contact.orderDetails}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{orderDetails}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={sending}
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? t.contact.sending : t.contact.sendMessage}
          </Button>
        </div>
      </Card>
    </div>
  );
}
