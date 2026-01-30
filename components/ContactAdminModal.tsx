'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, MessageSquare, Send, Mail, Phone } from 'lucide-react';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderDetails: string;
}

export function ContactAdminModal({ isOpen, onClose, orderNumber, orderDetails }: ContactAdminModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  async function handleSend() {
    if (!message.trim()) {
      alert('Vennligst skriv en melding');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/orders/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          orderDetails,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        alert('Meldingen din er sendt! Vi kontakter deg snart.');
        setMessage('');
        onClose();
      } else {
        alert('Kunne ikke sende melding. Prøv igjen senere.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Kunne ikke sende melding. Prøv igjen senere.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7" />
              Kontakt oss
            </h2>
            <p className="text-gray-600">Angående ordre {orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contact Info */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-3">Andre måter å kontakte oss på:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Mail className="w-4 h-4" />
              <span>E-post: post@tinglum.no</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Phone className="w-4 h-4" />
              <span>Telefon: +47 123 45 678</span>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold mb-2">Din melding</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Skriv din melding her...

Eksempler på henvendelser:
- Jeg ønsker å endre leveringsadresse
- Kan jeg bytte fra 8kg til 12kg boks?
- Når er ordren klar for henting?
- Spørsmål om innhold i boksen"
              className="min-h-[200px] mt-2"
              disabled={sending}
            />
            <p className="text-sm text-gray-500 mt-2">
              Vi svarer vanligvis innen 24 timer
            </p>
          </div>

          {/* Order Details (Read-only info) */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">Ordredetaljer:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{orderDetails}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={sending}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sender...' : 'Send melding'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
