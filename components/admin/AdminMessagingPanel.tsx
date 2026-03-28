"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, X, Clock, AlertCircle, CheckCircle, MessageSquare, Filter, Search, Mail, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageReply {
  id: string;
  message_id: string;
  admin_name: string;
  reply_text: string;
  created_at: string;
  is_from_customer?: boolean;
}

interface CustomerMessage {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string | null;
  subject: string;
  message: string;
  message_type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  admin_initiated?: boolean;
  admin_sender?: string | null;
  message_replies?: MessageReply[];
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';
type RecipientMode = 'all' | 'manual' | 'filters';

type ClientRecipient = {
  phone: string;
  name?: string | null;
  email?: string | null;
};

type ExtraRecipientFilter = {
  id: string;
  name: string;
};

type ComposePrefill = {
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
};

type BroadcastPreview = {
  totalResolved: number;
  sendableCount: number;
  optedOutCount: number;
  blockedCount: number;
  sendableRecipients?: ClientRecipient[];
  optedOutRecipients?: Array<ClientRecipient & { reason?: string }>;
  blockedRecipients?: Array<ClientRecipient & { reason?: string }>;
};

const BOX_SIZE_OPTIONS = [
  { value: '', labelNo: 'Alle størrelser', labelEn: 'All sizes' },
  { value: '8', labelNo: '8 kg', labelEn: '8 kg' },
  { value: '12', labelNo: '12 kg', labelEn: '12 kg' },
];

export function AdminMessagingPanel({ prefill }: { prefill?: ComposePrefill }) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const copy = t.adminMessagingPanel;
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [clients, setClients] = useState<ClientRecipient[]>([]);
  const [extras, setExtras] = useState<ExtraRecipientFilter[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<ClientRecipient[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [awaitingFinalPayment, setAwaitingFinalPayment] = useState(false);
  const [boxSize, setBoxSize] = useState('');
  const [hasExtras, setHasExtras] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [overridePhones, setOverridePhones] = useState<string[]>([]);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [pendingSendWithoutOptOut, setPendingSendWithoutOptOut] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prefillKeyRef = useRef<string>('');

  const templateOptions = useMemo(() => {
    const no = lang !== 'en';
    return [
      {
        id: 'general-update',
        label: no ? 'Generell oppdatering' : 'General update',
        subject: no ? 'Oppdatering fra Tinglum Gard' : 'Update from Tinglum Gard',
        body: no
          ? 'Hei,\n\nVi vil dele en oppdatering med deg.\n\nTa kontakt hvis du har spørsmål.'
          : 'Hi,\n\nWe wanted to share an update with you.\n\nLet us know if you have any questions.',
      },
      {
        id: 'order-followup',
        label: no ? 'Oppfølging på bestilling' : 'Order follow-up',
        subject: no ? 'Oppfølging på bestillingen din' : 'Follow-up on your order',
        body: no
          ? 'Hei,\n\nVi følger opp bestillingen din og vil gjerne gi deg en oppdatering.\n\nSvar gjerne direkte på denne meldingen.'
          : 'Hi,\n\nWe are following up on your order and wanted to share an update.\n\nFeel free to reply directly to this message.',
      },
      {
        id: 'practical-info',
        label: no ? 'Praktisk informasjon' : 'Practical information',
        subject: no ? 'Praktisk informasjon fra Tinglum Gard' : 'Practical information from Tinglum Gard',
        body: no
          ? 'Hei,\n\nHer kommer praktisk informasjon fra oss.\n\nGi beskjed hvis noe er uklart.'
          : 'Hi,\n\nHere is some practical information from us.\n\nLet us know if anything is unclear.',
      },
    ];
  }, [lang]);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/admin/messages?${params.toString()}`);
      const data = await response.json();
      setMessages(data.messages || []);
      if (data.stats) {
        setStats(data.stats);
      }
      return data.messages || [];
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, statusFilter]);

  const loadRecipients = useCallback(async () => {
    try {
      setClientsLoading(true);
      const response = await fetch('/api/admin/messages/recipients?include=clients,extras', { cache: 'no-store' });
      const data = await response.json();
      setClients(Array.isArray(data.clients) ? data.clients : []);
      setExtras(Array.isArray(data.extras) ? data.extras : []);
    } catch (error) {
      console.error('Failed to load recipients:', error);
      setClients([]);
      setExtras([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessage?.message_replies]);

  useEffect(() => {
    const phone = String(prefill?.phone || '').trim();
    const email = String(prefill?.email || '').trim().toLowerCase();
    const key = JSON.stringify({
      phone,
      email,
      subject: prefill?.subject || '',
      message: prefill?.message || '',
    });
    if (!key || key === '{}' || prefillKeyRef.current === key || clientsLoading) return;

    const matched = clients.find((client) => {
      const clientPhone = String(client.phone || '').trim();
      const clientEmail = String(client.email || '').trim().toLowerCase();
      return (phone && clientPhone === phone) || (email && clientEmail === email);
    });

    const recipient = matched || (phone ? {
      phone,
      name: prefill?.name || null,
      email: prefill?.email || null,
    } : null);

    if (recipient) {
      setRecipientMode('manual');
      setSelectedRecipients([recipient]);
      setRecipientSearch('');
    }
    if (prefill?.subject) setComposeSubject(String(prefill.subject));
    if (prefill?.message) setComposeBody(String(prefill.message));
    prefillKeyRef.current = key;
  }, [clients, clientsLoading, prefill]);

  const filteredMessages = messages.filter((msg) => {
    const statusMatch = statusFilter === 'all' || msg.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || msg.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const matchedClients = useMemo(() => {
    const term = recipientSearch.trim().toLowerCase();
    if (!term) return clients.slice(0, 12);
    return clients
      .filter((client) => {
        const haystack = [client.name || '', client.email || '', client.phone || '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 20);
  }, [clients, recipientSearch]);

  const selectedPhoneSet = useMemo(
    () => new Set(selectedRecipients.map((recipient) => String(recipient.phone || '').trim())),
    [selectedRecipients]
  );

  const addRecipient = (recipient: ClientRecipient) => {
    const phone = String(recipient.phone || '').trim();
    if (!phone || selectedPhoneSet.has(phone)) return;
    setSelectedRecipients((current) => [...current, recipient]);
  };

  const removeRecipient = (phone: string) => {
    setSelectedRecipients((current) => current.filter((recipient) => recipient.phone !== phone));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templateOptions.find((entry) => entry.id === templateId);
    if (!template) return;
    setComposeSubject(template.subject);
    setComposeBody(template.body);
  };

  const buildPayload = () => ({
    subject: composeSubject.trim(),
    message: composeBody.trim(),
    mode: recipientMode,
    recipients: selectedRecipients.map((recipient) => recipient.phone),
    filters: {
      awaitingFinalPayment,
      boxSize: boxSize ? Number(boxSize) : null,
      hasExtras,
      extraIds: selectedExtraIds,
    },
    overridePhones,
  });

  const validateCompose = () => {
    const subject = composeSubject.trim();
    const message = composeBody.trim();
    if (!subject || !message) {
      toast({
        title: lang === 'en' ? 'Missing content' : 'Mangler innhold',
        description: lang === 'en' ? 'Add both subject and message before continuing.' : 'Legg inn både emne og melding før du fortsetter.',
        variant: 'destructive',
      });
      return false;
    }
    if (recipientMode === 'manual' && selectedRecipients.length === 0) {
      toast({
        title: lang === 'en' ? 'No recipients selected' : 'Ingen mottakere valgt',
        description: lang === 'en' ? 'Search and add at least one client.' : 'Søk opp og legg til minst én kunde.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const previewBroadcast = async () => {
    if (!validateCompose()) return null;
    try {
      setPreviewLoading(true);
      const response = await fetch('/api/admin/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildPayload(),
          dryRun: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to preview recipients');
      }
      setPreview(data);
      return data as BroadcastPreview;
    } catch (error) {
      toast({
        title: lang === 'en' ? 'Preview failed' : 'Forhåndsvisning feilet',
        description: error instanceof Error ? error.message : (lang === 'en' ? 'Could not preview recipients.' : 'Kunne ikke forhåndsvise mottakere.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!validateCompose()) return;

    let currentPreview = preview;
    if (!currentPreview) {
      currentPreview = await previewBroadcast();
    }
    if (!currentPreview) return;

    if (currentPreview.optedOutCount > 0 && !showOptOutModal && !pendingSendWithoutOptOut && overridePhones.length === 0) {
      setShowOptOutModal(true);
      return;
    }

    try {
      setSendLoading(true);
      const response = await fetch('/api/admin/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data?.optedOutRecipients) {
          setPreview(data);
          setShowOptOutModal(true);
          return;
        }
        throw new Error(data?.error || 'Failed to send messages');
      }

      toast({
        title: lang === 'en' ? 'Messages queued' : 'Meldinger sendt',
        description:
          lang === 'en'
            ? `${data.sentCount || 0} customer threads were created and emailed.`
            : `${data.sentCount || 0} kundetråder ble opprettet og sendt på e-post.`,
      });

      setPreview(data);
      setComposeSubject('');
      setComposeBody('');
      setSelectedTemplate('');
      setRecipientSearch('');
      setSelectedRecipients([]);
      setRecipientMode('all');
      setAwaitingFinalPayment(false);
      setBoxSize('');
      setHasExtras(false);
      setSelectedExtraIds([]);
      setOverridePhones([]);
      setShowOptOutModal(false);
      setPendingSendWithoutOptOut(false);
      await loadMessages();
    } catch (error) {
      toast({
        title: lang === 'en' ? 'Send failed' : 'Sending feilet',
        description: error instanceof Error ? error.message : (lang === 'en' ? 'Could not send messages.' : 'Kunne ikke sende meldinger.'),
        variant: 'destructive',
      });
    } finally {
      setSendLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    try {
      setReplyLoading(true);
      const response = await fetch(`/api/admin/messages/${selectedMessage.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText.trim() }),
      });

      if (response.ok) {
        setReplyText('');
        const updatedMessages = await loadMessages();
        const updated = updatedMessages.find((message: CustomerMessage) => message.id === selectedMessage.id);
        if (updated) {
          setSelectedMessage(updated);
        }
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdateStatus = async (status: CustomerMessage['status']) => {
    if (!selectedMessage) return;

    try {
      const response = await fetch(`/api/admin/messages/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedMessages = await loadMessages();
        const updated = updatedMessages.find((message: CustomerMessage) => message.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'resolved':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'closed':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-l-4 border-red-600';
      case 'high':
        return 'bg-orange-50 border-l-4 border-orange-600';
      case 'normal':
        return 'bg-blue-50 border-l-4 border-blue-600';
      case 'low':
        return 'bg-gray-50 border-l-4 border-gray-600';
      default:
        return 'bg-white border-l-4 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(lang === 'en' ? 'en-US' : 'no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!selectedMessage) {
    return (
      <div className="space-y-6">
        <Card className="p-5 border border-gray-200 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {(copy as any).composeTitle || (lang === 'en' ? 'Send message to customers' : 'Send melding til kunder')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {(copy as any).composeSubtitle || (lang === 'en' ? 'Create a customer-visible thread on My Page and send the same message by email.' : 'Opprett en kundesynlig tråd på Min side og send samme melding på e-post.')}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
              <Users className="w-4 h-4" />
              {lang === 'en' ? `${clients.length} clients available` : `${clients.length} kunder tilgjengelig`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(copy as any).audienceModeLabel || (lang === 'en' ? 'Audience' : 'Målgruppe')}
              </label>
              <select
                value={recipientMode}
                onChange={(event) => setRecipientMode(event.target.value as RecipientMode)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              >
                <option value="all">{lang === 'en' ? 'All clients' : 'Alle kunder'}</option>
                <option value="manual">{lang === 'en' ? 'Selected clients' : 'Valgte kunder'}</option>
                <option value="filters">{lang === 'en' ? 'Advanced filter' : 'Avansert filter'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(copy as any).templateLabel || (lang === 'en' ? 'Template' : 'Mal')}
              </label>
              <select
                value={selectedTemplate}
                onChange={(event) => applyTemplate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              >
                <option value="">{lang === 'en' ? 'Choose template' : 'Velg mal'}</option>
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {recipientMode === 'all' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              {copy.sendToAllInfo.replace('{count}', String(clients.length))}
            </div>
          )}

          {recipientMode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(copy as any).recipientSearchLabel || (lang === 'en' ? 'Search client' : 'Søk kunde')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    placeholder={copy.searchRecipientPlaceholder}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRecipients.map((recipient) => (
                  <div key={recipient.phone} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm">
                    <span>{recipient.name || recipient.email || recipient.phone}</span>
                    <button type="button" onClick={() => removeRecipient(recipient.phone)} className="text-gray-500 hover:text-gray-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white max-h-72 overflow-y-auto">
                {clientsLoading ? (
                  <div className="p-4 text-sm text-gray-500">{copy.loading}</div>
                ) : matchedClients.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">{lang === 'en' ? 'No clients match the search.' : 'Ingen kunder matcher søket.'}</div>
                ) : (
                  matchedClients.map((client) => {
                    const selected = selectedPhoneSet.has(String(client.phone || '').trim());
                    return (
                      <div key={client.phone} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name || client.phone}</p>
                          <p className="text-xs text-gray-500">{client.email || client.phone}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => addRecipient(client)} disabled={selected}>
                          {selected ? (lang === 'en' ? 'Selected' : 'Valgt') : copy.addRecipient}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {recipientMode === 'filters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={awaitingFinalPayment} onChange={(event) => setAwaitingFinalPayment(event.target.checked)} />
                <span>{lang === 'en' ? 'Awaiting final payment' : 'Venter restbetaling'}</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(copy as any).boxSizeLabel || (lang === 'en' ? 'Box size' : 'Boksstørrelse')}
                </label>
                <select value={boxSize} onChange={(event) => setBoxSize(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white">
                  {BOX_SIZE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {lang === 'en' ? option.labelEn : option.labelNo}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={hasExtras} onChange={(event) => setHasExtras(event.target.checked)} />
                <span>{lang === 'en' ? 'Has extras' : 'Har tillegg'}</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(copy as any).extraFilterLabel || (lang === 'en' ? 'Specific extras' : 'Spesifikke tillegg')}
                </label>
                <select
                  multiple
                  value={selectedExtraIds}
                  onChange={(event) => setSelectedExtraIds(Array.from(event.target.selectedOptions).map((option) => option.value))}
                  className="w-full min-h-24 px-3 py-2 border border-gray-300 rounded-xl bg-white"
                >
                  {extras.map((extra) => (
                    <option key={extra.id} value={extra.id}>
                      {extra.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(copy as any).composeSubjectLabel || (lang === 'en' ? 'Subject' : 'Emne')}
              </label>
              <Input value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} placeholder={lang === 'en' ? 'Subject line' : 'Emnefelt'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(copy as any).composeBodyLabel || (lang === 'en' ? 'Message' : 'Melding')}
              </label>
              <textarea
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
                rows={7}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none"
                placeholder={lang === 'en' ? 'Write the message the customer should receive by email and on My Page...' : 'Skriv meldingen kunden skal motta på e-post og på Min side...'}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {preview ? (
                <span>
                  {lang === 'en'
                    ? `${preview.sendableCount} sendable, ${preview.optedOutCount} opted out, ${preview.blockedCount} blocked`
                    : `${preview.sendableCount} kan sendes, ${preview.optedOutCount} reservert, ${preview.blockedCount} blokkert`}
                </span>
              ) : (
                <span>{lang === 'en' ? 'Preview recipients before sending if needed.' : 'Forhåndsvis mottakere før sending ved behov.'}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void previewBroadcast()} disabled={previewLoading || sendLoading}>
                {previewLoading ? (lang === 'en' ? 'Previewing...' : 'Forhåndsviser...') : (lang === 'en' ? 'Preview recipients' : 'Forhåndsvis mottakere')}
              </Button>
              <Button type="button" onClick={() => void sendBroadcast()} disabled={previewLoading || sendLoading}>
                <Send className="w-4 h-4 mr-2" />
                {sendLoading ? (lang === 'en' ? 'Sending...' : 'Sender...') : (lang === 'en' ? 'Send message' : 'Send melding')}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
            <div className="text-sm text-blue-700">{copy.totalMessages}</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="text-3xl font-bold text-red-900">{stats.open}</div>
            <div className="text-sm text-red-700">{t.messaging.open}</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="text-3xl font-bold text-yellow-900">{stats.in_progress}</div>
            <div className="text-sm text-yellow-700">{t.messaging.inProgress}</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-3xl font-bold text-green-900">{stats.resolved}</div>
            <div className="text-sm text-green-700">{t.messaging.resolved}</div>
          </Card>
        </div>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">{copy.filters}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.messaging.status}</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              >
                <option value="all">{copy.allStatus}</option>
                <option value="open">{t.messaging.open}</option>
                <option value="in_progress">{t.messaging.inProgress}</option>
                <option value="resolved">{t.messaging.resolved}</option>
                <option value="closed">{t.messaging.closed}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.messaging.priority}</label>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              >
                <option value="all">{copy.allPriorities}</option>
                <option value="low">{t.messaging.low}</option>
                <option value="normal">{t.messaging.normal}</option>
                <option value="high">{t.messaging.high}</option>
                <option value="urgent">{t.messaging.urgent}</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{copy.loadingMessages}</p>
            </Card>
          ) : filteredMessages.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{copy.noMessagesFound}</p>
            </Card>
          ) : (
            filteredMessages.map((message) => (
              <Card
                key={message.id}
                className={cn('p-4 cursor-pointer hover:shadow-lg transition-shadow', getPriorityColor(message.priority))}
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{message.subject}</h3>
                    <p className="text-sm text-gray-600 truncate">
                      {message.customer_name || message.customer_email || message.customer_phone}
                    </p>
                    {message.admin_initiated && (
                      <p className="text-xs text-blue-700 mt-1">
                        <Mail className="w-3 h-3 inline mr-1" />
                        {lang === 'en'
                          ? `Started by ${message.admin_sender || copy.farmSender}`
                          : `Startet av ${message.admin_sender || copy.farmSender}`}
                      </p>
                    )}
                  </div>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', getStatusColor(message.status))}>
                    {getStatusIcon(message.status)}
                    {message.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">{message.message}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-200 px-2 py-1 rounded">{message.message_type}</span>
                  <span>{formatDate(message.created_at)}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {showOptOutModal && preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {lang === 'en' ? 'Some recipients have opted out' : 'Noen mottakere har reservert seg'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {lang === 'en'
                      ? 'You can continue without them or include specific recipients manually for this message.'
                      : 'Du kan fortsette uten dem, eller ta med spesifikke mottakere manuelt for denne meldingen.'}
                  </p>
                </div>
                <button type="button" onClick={() => setShowOptOutModal(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
                {(preview.optedOutRecipients || []).map((recipient) => {
                  const phone = String(recipient.phone || '').trim();
                  const included = overridePhones.includes(phone);
                  return (
                    <div key={phone || recipient.email || recipient.name} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{recipient.name || recipient.email || recipient.phone}</p>
                        <p className="text-xs text-gray-500">{recipient.email || recipient.phone} · {recipient.reason || 'opted_out'}</p>
                      </div>
                      <Button
                        type="button"
                        variant={included ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setOverridePhones((current) =>
                            included ? current.filter((value) => value !== phone) : [...current, phone]
                          );
                        }}
                      >
                        {included ? (lang === 'en' ? 'Included' : 'Tatt med') : (lang === 'en' ? 'Include manually' : 'Ta med manuelt')}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowOptOutModal(false)}>
                  {lang === 'en' ? 'Cancel' : 'Avbryt'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    setPendingSendWithoutOptOut(true);
                    setShowOptOutModal(false);
                    await sendBroadcast();
                    setPendingSendWithoutOptOut(false);
                  }}
                >
                  {lang === 'en' ? 'Continue without them' : 'Fortsett uten dem'}
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    setShowOptOutModal(false);
                    await sendBroadcast();
                  }}
                >
                  {lang === 'en' ? 'Send with manual overrides' : 'Send med manuelle overstyringer'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  const originalSender = selectedMessage.admin_initiated
    ? selectedMessage.admin_sender || copy.farmSender
    : selectedMessage.customer_name || copy.customerFallback;

  return (
    <div className="space-y-4">
      <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4">
        <X className="w-5 h-5" />
        {copy.backToMessages}
      </button>

      <Card className={cn('p-6', getPriorityColor(selectedMessage.priority))}>
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedMessage.subject}</h2>
              <p className="text-gray-600">{selectedMessage.customer_name || selectedMessage.customer_email || selectedMessage.customer_phone}</p>
              {selectedMessage.admin_initiated && (
                <p className="text-xs text-blue-700 mt-1">
                  {lang === 'en' ? `Started by ${originalSender}` : `Startet av ${originalSender}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2', getStatusColor(selectedMessage.status))}>
                {getStatusIcon(selectedMessage.status)}
                {t.messaging[selectedMessage.status as keyof typeof t.messaging]}
              </span>
              <Button variant="outline" onClick={() => handleUpdateStatus('resolved')} disabled={selectedMessage.status === 'resolved'}>
                {copy.markResolved}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600">{copy.typeLabel}</span>
              <p className="font-semibold text-gray-900">{selectedMessage.message_type}</p>
            </div>
            <div>
              <span className="text-gray-600">{copy.priorityLabel}</span>
              <p className="font-semibold capitalize text-gray-900">{selectedMessage.priority}</p>
            </div>
            <div>
              <span className="text-gray-600">{copy.dateLabel}</span>
              <p className="font-semibold text-gray-900">{formatDate(selectedMessage.created_at)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-2">{originalSender}</p>
            <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{copy.conversation}</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          <div className="flex gap-3">
            <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', selectedMessage.admin_initiated ? 'bg-green-100' : 'bg-blue-100')}>
              <span className={cn('text-xs font-bold', selectedMessage.admin_initiated ? 'text-green-600' : 'text-blue-600')}>
                {originalSender.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className={cn('p-3 rounded-xl border', selectedMessage.admin_initiated ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200')}>
                <p className={cn('text-xs font-semibold mb-1', selectedMessage.admin_initiated ? 'text-green-600' : 'text-gray-600')}>{originalSender}</p>
                <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatDate(selectedMessage.created_at)}</p>
            </div>
          </div>

          {selectedMessage.message_replies && selectedMessage.message_replies.length > 0 && (
            <>
              {selectedMessage.message_replies.map((reply) => {
                const isFromCustomer = Boolean((reply as MessageReply & { is_from_customer?: boolean }).is_from_customer);
                return (
                  <div key={reply.id} className="flex gap-3">
                    <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', isFromCustomer ? 'bg-blue-100' : 'bg-green-100')}>
                      <span className={cn('text-xs font-bold', isFromCustomer ? 'text-blue-600' : 'text-green-600')}>
                        {(isFromCustomer ? selectedMessage.customer_name || copy.customerFallback : copy.farmSender).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className={cn('p-3 rounded-xl border', isFromCustomer ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200')}>
                        <p className={cn('text-xs font-semibold mb-1', isFromCustomer ? 'text-blue-600' : 'text-green-600')}>
                          {isFromCustomer ? selectedMessage.customer_name || copy.customerFallback : reply.admin_name || copy.farmSender}
                        </p>
                        <p className="text-gray-800 whitespace-pre-wrap">{reply.reply_text}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(reply.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.messaging.sendReply}</h3>
        <div className="space-y-4">
          <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={t.messaging.replyPlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none" rows={4} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSendReply} disabled={!replyText.trim() || replyLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              {replyLoading ? t.messaging.sendingBroadcast : t.messaging.sendReply}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}