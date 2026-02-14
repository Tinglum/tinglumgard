'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Send, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

interface FlowTemplate {
  id?: string;
  slug: string;
  product_type: 'mangalitsa' | 'eggs';
  flow_stage: string;
  name_no: string;
  name_en: string;
  subject_no: string;
  subject_en: string;
  body_no: string;
  body_en: string;
  active: boolean;
  trigger_event?: string | null;
  send_offset_days?: number;
  display_order?: number;
}

export function CommunicationCenter() {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const copy = t.communicationCenter;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
  const [selectedFlowTemplate, setSelectedFlowTemplate] = useState<FlowTemplate | null>(null);
  const [savingFlowTemplate, setSavingFlowTemplate] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const [response, flowResponse] = await Promise.all([
        fetch('/api/admin/communication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_templates' }),
        }),
        fetch('/api/admin/communication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_flow_templates' }),
        }),
      ]);

      const data = await response.json();
      const flowData = await flowResponse.json();

      setTemplates(data.templates || []);
      const flows = flowData.templates || [];
      setFlowTemplates(flows);
      if (flows.length > 0) {
        setSelectedFlowTemplate(flows[0]);
      }
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

  function selectFlowTemplate(template: FlowTemplate) {
    setSelectedFlowTemplate(template);
  }

  function applyFlowToComposer() {
    if (!selectedFlowTemplate) return;
    setSubject(lang === 'no' ? selectedFlowTemplate.subject_no : selectedFlowTemplate.subject_en);
    setMessage(lang === 'no' ? selectedFlowTemplate.body_no : selectedFlowTemplate.body_en);
    setSelectedTemplate({
      id: selectedFlowTemplate.slug,
      name: lang === 'no' ? selectedFlowTemplate.name_no : selectedFlowTemplate.name_en,
      subject: lang === 'no' ? selectedFlowTemplate.subject_no : selectedFlowTemplate.subject_en,
      message: lang === 'no' ? selectedFlowTemplate.body_no : selectedFlowTemplate.body_en,
    });
  }

  async function saveSelectedFlowTemplate() {
    if (!selectedFlowTemplate) return;
    setSavingFlowTemplate(true);
    try {
      const response = await fetch('/api/admin/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_flow_template',
          data: { template: selectedFlowTemplate },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || copy.unknownError);
      }

      toast({
        title: lang === 'no' ? 'Mal lagret' : 'Template saved',
        description: lang === 'no'
          ? 'Flytmalen ble oppdatert.'
          : 'The flow template was updated.',
      });

      await loadTemplates();
    } catch (error: any) {
      toast({
        title: copy.genericErrorTitle,
        description: error?.message || copy.genericErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSavingFlowTemplate(false);
    }
  }

  async function sendToAllCustomers() {
    if (!window.confirm(copy.confirmSendToAll)) {
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
        const base = copy.successDescription
          .replace('{sent}', String(result.sent))
          .replace('{total}', String(result.total_customers));
        const failedSuffix = result.failed > 0
          ? copy.successFailedSuffix.replace('{failed}', String(result.failed))
          : '';

        toast({
          title: copy.successTitle,
          description: `${base}${failedSuffix}`,
        });
        clearForm();
      } else {
        toast({
          title: copy.sendErrorTitle,
          description: result.error || copy.unknownError,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: copy.genericErrorTitle,
        description: copy.genericErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{copy.title}</h2>
        <p className="text-gray-600">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {copy.templatesTitle}
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

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {copy.composeTitle}
          </h3>

          {selectedTemplate && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <p className="text-sm text-blue-900">
                {copy.templateSelectedLabel} <strong>{selectedTemplate.name}</strong>
              </p>
              <Button onClick={clearForm} variant="outline" size="sm">
                {copy.resetButton}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>{copy.subjectLabel}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={copy.subjectPlaceholder}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {copy.subjectHint}
              </p>
            </div>

            <div>
              <Label>{copy.messageLabel}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copy.messagePlaceholder}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {copy.variablesHint}
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">{copy.sendDescription}</p>
              <div className="flex gap-2">
                <Button
                  disabled={!subject || !message || sending}
                  onClick={sendToAllCustomers}
                  className="bg-[#2C1810] hover:bg-[#2C1810]/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? copy.sendingButton : copy.sendAllButton}
                </Button>
                <p className="text-xs text-gray-500 self-center ml-2">{copy.sendAllHint}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {(subject || message) && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">{copy.previewTitle}</h3>
          <div className="border rounded-xl p-6 bg-gray-50">
            <div className="bg-[#2C1810] text-white p-6 rounded-t-lg text-center">
              <h1 className="text-2xl font-bold">{copy.previewBrand}</h1>
            </div>
            <div className="bg-white p-6 border-x border-b rounded-b-lg">
              {subject && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600">{copy.previewSubjectLabel}</p>
                  <p className="font-semibold">{subject}</p>
                </div>
              )}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: message
                    .replace(/{CUSTOMER_NAME}/g, `<span class="bg-yellow-100 px-1">[${copy.previewCustomerName}]</span>`)
                    .replace(/{ORDER_NUMBER}/g, `<span class="bg-yellow-100 px-1">[${copy.previewOrderNumber}]</span>`),
                }}
              />
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm">
                  {copy.previewRegards}
                  <br />
                  <strong>{copy.previewBrand}</strong>
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-lg">
              {lang === 'no' ? 'Ordre-flyt maler (egg + Mangalitsa)' : 'Order flow templates (eggs + Mangalitsa)'}
            </h3>
            <p className="text-sm text-gray-600">
              {lang === 'no'
                ? 'Brukes til ordrebekreftelse, sesongoppdatering, slakte-/pakkeuke, levering og tilbakemelding.'
                : 'Used for confirmation, season updates, slaughter/packing week, delivery, and feedback.'}
            </p>
          </div>
          <Button variant="outline" onClick={applyFlowToComposer} disabled={!selectedFlowTemplate}>
            {lang === 'no' ? 'Bruk i utsendelse' : 'Use in composer'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {flowTemplates.map((template) => {
              const isSelected = selectedFlowTemplate?.slug === template.slug;
              return (
                <button
                  key={template.slug}
                  onClick={() => selectFlowTemplate(template)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {template.product_type} · {template.flow_stage}
                  </p>
                  <p className="font-medium text-sm mt-1">
                    {lang === 'no' ? template.name_no : template.name_en}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.active
                      ? (lang === 'no' ? 'Aktiv' : 'Active')
                      : (lang === 'no' ? 'Inaktiv' : 'Inactive')}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedFlowTemplate && (
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Navn (NO)</Label>
                  <Input
                    value={selectedFlowTemplate.name_no}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        name_no: event.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Name (EN)</Label>
                  <Input
                    value={selectedFlowTemplate.name_en}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        name_en: event.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Emne (NO)</Label>
                  <Input
                    value={selectedFlowTemplate.subject_no}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        subject_no: event.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Subject (EN)</Label>
                  <Input
                    value={selectedFlowTemplate.subject_en}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        subject_en: event.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Melding (NO)</Label>
                  <Textarea
                    rows={8}
                    value={selectedFlowTemplate.body_no}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        body_no: event.target.value,
                      })
                    }
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Message (EN)</Label>
                  <Textarea
                    rows={8}
                    value={selectedFlowTemplate.body_en}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        body_en: event.target.value,
                      })
                    }
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedFlowTemplate.active}
                    onChange={(event) =>
                      setSelectedFlowTemplate({
                        ...selectedFlowTemplate,
                        active: event.target.checked,
                      })
                    }
                  />
                  {lang === 'no' ? 'Aktiv mal' : 'Template active'}
                </label>
                <Button onClick={saveSelectedFlowTemplate} disabled={savingFlowTemplate}>
                  {savingFlowTemplate
                    ? (lang === 'no' ? 'Lagrer...' : 'Saving...')
                    : (lang === 'no' ? 'Lagre flytmal' : 'Save flow template')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
