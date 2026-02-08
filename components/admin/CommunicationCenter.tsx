'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Send, FileText, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export function CommunicationCenter() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const response = await fetch('/api/admin/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_templates' }),
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setMessage(template.message);
  }

  function clearForm() {
    setSelectedTemplate(null);
    setSubject('');
    setMessage('');
  }

  async function sendToAllCustomers() {
    if (!confirm('Er du sikker på at du vil sende denne e-posten til ALLE kunder? Dette kan ikke angres.')) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_to_all',
          data: {
            subject,
            message,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'E-post sendt',
          description: `Sendt til ${result.sent} av ${result.total_customers} kunder${result.failed > 0 ? `. ${result.failed} feilet.` : ''}`
        });
        clearForm();
      } else {
        toast({
          title: 'Feil ved sending',
          description: result.error || 'Ukjent feil',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke sende e-poster',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Kundekommunikasjon</h2>
        <p className="text-gray-600">Send e-poster til kunder basert på maler</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Sidebar */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            E-postmaler
          </h3>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
              >
                <p className="font-medium text-sm">{template.name}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Email Composer */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Skriv e-post
          </h3>

          {selectedTemplate && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <p className="text-sm text-blue-900">
                Mal valgt: <strong>{selectedTemplate.name}</strong>
              </p>
              <Button onClick={clearForm} variant="outline" size="sm">
                Nullstill
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Emne</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Skriv inn e-postemne..."
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bruk {'{ORDER_NUMBER}'} for ordrenummer
              </p>
            </div>

            <div>
              <Label>Melding</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Skriv din melding her..."
                rows={12}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variabler: {'{CUSTOMER_NAME}'}, {'{ORDER_NUMBER}'}. HTML støttes.
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">
                Send e-post til alle kunder som har registrert e-postadresse, eller velg ordrer fra &quot;Bestillinger&quot;-fanen for målrettet sending.
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={!subject || !message || sending}
                  onClick={sendToAllCustomers}
                  className="bg-[#2C1810] hover:bg-[#2C1810]/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sender...' : 'Send til alle kunder'}
                </Button>
                <p className="text-xs text-gray-500 self-center ml-2">
                  Dette sender til alle unike e-postadresser
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Email Preview */}
      {(subject || message) && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Forhåndsvisning</h3>
          <div className="border rounded-xl p-6 bg-gray-50">
            <div className="bg-[#2C1810] text-white p-6 rounded-t-lg text-center">
              <h1 className="text-2xl font-bold">Tinglum Gård</h1>
            </div>
            <div className="bg-white p-6 border-x border-b rounded-b-lg">
              {subject && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600">Emne:</p>
                  <p className="font-semibold">{subject}</p>
                </div>
              )}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: message
                    .replace(/{CUSTOMER_NAME}/g, '<span class="bg-yellow-100 px-1">[Kundenavn]</span>')
                    .replace(/{ORDER_NUMBER}/g, '<span class="bg-yellow-100 px-1">[Ordrenummer]</span>'),
                }}
              />
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm">Vennlig hilsen,<br /><strong>Tinglum Gård</strong></p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
