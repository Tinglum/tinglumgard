"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { lintManagedTemplate } from '@/lib/email/template-lint';

type EmailSubTab =
  | 'overview'
  | 'templates'
  | 'flows'
  | 'lifecycle'
  | 'campaigns'
  | 'queue'
  | 'history'
  | 'setup';

type EmailTemplate = {
  id: string;
  template_key: string;
  classification: string;
  product_scope: string;
  variables?: string[];
  subject_no: string;
  subject_en: string;
  body_no: string;
  body_en: string;
  current_version: number;
  active: boolean;
};

type EmailFlow = {
  id: string;
  flow_key: string;
  event_type: string;
  mode: 'shadow' | 'active' | 'disabled';
  active: boolean;
  send_offset_minutes: number;
  template_key: string;
  email_templates?: {
    template_key?: string;
    classification?: string;
    subject_no?: string;
    subject_en?: string;
    body_no?: string;
    body_en?: string;
  } | null;
};

type EmailCampaign = {
  id: string;
  name: string;
  classification: string;
  status: string;
  recipient_mode: 'all' | 'manual' | 'filters';
  total_recipients: number;
  subject_no?: string;
  subject_en?: string;
  body_no?: string;
  body_en?: string;
};

type QueueEntry = {
  id: string;
  status: string;
  classification: string;
  to_email: string;
  template_key?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  source_path?: string | null;
  sent_at?: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
  next_attempt_at: string;
  last_error?: string | null;
};

type HistoryEntry = QueueEntry & {
  email_delivery_events?: Array<{
    id: string;
    event_type: string;
    recipient: string;
    event_at?: string | null;
    created_at: string;
  }>;
};

type SetupPayload = {
  mode: 'legacy' | 'shadow' | 'active';
  paused: boolean;
  batchSize: number;
  rateLimitPerMinute: number;
  defaultFrom: string;
  defaultReplyTo: string;
};

type SetupDiagnostics = {
  senderAddress?: string;
  generalReplyAddress?: string;
  supportReplyAddress?: string;
  supportReplyUsesDedicatedMailbox?: boolean;
  supportReplyOverridesGeneralReplyTo?: boolean;
  cronUrls?: {
    reconcile?: string;
    flowRunner?: string;
    dispatch?: string;
  };
  primaryCause?: string;
  latestRunState?: 'failed' | 'completed' | 'running' | 'unknown';
  latestRunAgeMinutes?: number | null;
  latestFlowRun?: {
    started_at?: string | null;
    finished_at?: string | null;
    scanned_count?: number | null;
    due_count?: number | null;
    enqueued_count?: number | null;
    skipped_count?: number | null;
    failed_count?: number | null;
    completed_count?: number | null;
    campaigns_queued_count?: number | null;
    missing_email_count?: number | null;
    error?: string | null;
  } | null;
  queue?: {
    pending?: number | null;
    processing?: number | null;
    failed?: number | null;
    dead?: number | null;
    activeLast24h?: number | null;
    sentLast24h?: number | null;
  };
  schemaDetails?: Record<string, string>;
  causes?: string[];
  suggestedFixes?: string[];
};

type LifecycleFlowMatrixRow = {
  flowKey: string;
  productScope: 'pig' | 'eggs' | 'chickens' | 'shared';
  eventType: string;
  templateKey: string;
  triggerRule: string;
  scheduleLocalTime: string;
  stopRules: string[];
};

type EmailPreviewModalState = {
  title: string;
  subtitle?: string;
  subject: string;
  html: string;
};

export function EmailControlCenter() {
  const [activeTab, setActiveTab] = useState<EmailSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [flows, setFlows] = useState<EmailFlow[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [lifecycleConfig, setLifecycleConfig] = useState({
    timezone: 'Europe/Oslo',
    pigRemainderDueDate: '2026-11-16',
    pigRemainderReminderDays: '30,21,14,7,3,1',
    pigPostOrderExplainerDelayDays: 10,
    eggRemainderReminderDays: '11,9,7,6',
    eggOverdueGraceHours: 48,
    chickenPickupReminderDays: '3,1',
    chickenAutoReadyDaysBefore: 4,
    campaignSendViaApiCronOnly: true,
  });
  const [setup, setSetup] = useState<SetupPayload>({
    mode: 'legacy',
    paused: false,
    batchSize: 50,
    rateLimitPerMinute: 60,
    defaultFrom: 'post@tinglum.com',
    defaultReplyTo: 'post@tinglum.com',
  });
  const [suppressionList, setSuppressionList] = useState<Array<{ email: string; reason: string; source: string }>>(
    []
  );
  const [schemaStatus, setSchemaStatus] = useState<{
    ready: boolean;
    checkedTables: string[];
    missingTables: string[];
  } | null>(null);
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null);
  const [setupDiagnostics, setSetupDiagnostics] = useState<SetupDiagnostics | null>(null);
  const [suppressionUnavailable, setSuppressionUnavailable] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    templateKey: '',
    classification: 'system',
    productScope: 'shared',
    subjectNo: '',
    subjectEn: '',
    bodyNo: '',
    bodyEn: '',
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );
  const [templateEditor, setTemplateEditor] = useState({
    subjectNo: '',
    subjectEn: '',
    bodyNo: '',
    bodyEn: '',
  });
  const [templateChangeNote, setTemplateChangeNote] = useState('');
  const templateEditorLint = useMemo(() => {
    const variables = Array.isArray(selectedTemplate?.variables) ? selectedTemplate?.variables : undefined;
    return lintManagedTemplate({
      templateKey: selectedTemplate?.template_key || '',
      classification: selectedTemplate?.classification || '',
      subjectNo: templateEditor.subjectNo,
      subjectEn: templateEditor.subjectEn,
      bodyNo: templateEditor.bodyNo,
      bodyEn: templateEditor.bodyEn,
      variables,
    });
  }, [
    selectedTemplate?.variables,
    templateEditor.subjectNo,
    templateEditor.subjectEn,
    templateEditor.bodyNo,
    templateEditor.bodyEn,
  ]);
  const newTemplateLint = useMemo(
    () =>
      lintManagedTemplate({
        templateKey: newTemplate.templateKey,
        classification: newTemplate.classification,
        subjectNo: newTemplate.subjectNo,
        subjectEn: newTemplate.subjectEn,
        bodyNo: newTemplate.bodyNo,
        bodyEn: newTemplate.bodyEn,
        variables: undefined,
      }),
    [newTemplate.bodyEn, newTemplate.bodyNo, newTemplate.subjectEn, newTemplate.subjectNo]
  );

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    classification: 'promotional',
    recipientMode: 'all' as 'all' | 'manual' | 'filters',
    manualEmails: '',
    subjectNo: '',
    subjectEn: '',
    bodyNo: '',
    bodyEn: '',
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [campaignPreview, setCampaignPreview] = useState<any>(null);

  const [suppressionEmail, setSuppressionEmail] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('manual_unsubscribe');
  const [emailPreviewModal, setEmailPreviewModal] = useState<EmailPreviewModalState | null>(null);
  const [lifecyclePreviewLoadingId, setLifecyclePreviewLoadingId] = useState<string | null>(null);

  const upcomingLifecycleInstances = useMemo(() => {
    const nowIso = new Date().toISOString();
    return (lifecycle?.instances || []).filter((instance: any) => {
      const status = String(instance?.status || '');
      const scheduledFor = String(instance?.scheduled_for || '');
      return status === 'scheduled' && scheduledFor && scheduledFor > nowIso;
    });
  }, [lifecycle?.instances]);

  async function callApi<T = any>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const missingTables = Array.isArray(data?.missingTables) ? data.missingTables.join(', ') : '';
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      const details = Array.isArray(data?.details)
        ? data.details
            .map((entry: unknown) => String(entry || '').trim())
            .filter(Boolean)
            .join('; ')
        : '';
      const hint = typeof data?.hint === 'string' ? data.hint : '';
      const message = [
        data?.error || `Request failed (${response.status})`,
        missingTables ? `Missing tables: ${missingTables}` : '',
        detail,
        details,
        hint,
      ]
        .filter(Boolean)
        .join(' | ');
      throw new Error(message);
    }
    return data as T;
  }

  const loadOverview = useCallback(async () => {
    const data = await callApi('/api/admin/email/overview');
    setOverview(data);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
  }, []);

  const loadTemplates = useCallback(async () => {
    const data = await callApi<{ templates: EmailTemplate[] }>('/api/admin/email/templates');
    setTemplates(data.templates || []);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
    if (!selectedTemplateId && data.templates?.length) {
      setSelectedTemplateId(data.templates[0].id);
    }
  }, [selectedTemplateId]);

  const loadFlows = useCallback(async () => {
    const data = await callApi<{ flows: EmailFlow[] }>('/api/admin/email/flows');
    setFlows(data.flows || []);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
  }, []);

  const loadLifecycle = useCallback(async () => {
    const data = await callApi<any>('/api/admin/email/lifecycle');
    setLifecycle(data);
    if (typeof data?.materializeError === 'string' && data.materializeError.trim()) {
      setWarning(data.materializeError);
    } else {
      setWarning(typeof data?.warning === 'string' ? data.warning : null);
    }
    if (data?.config) {
      setLifecycleConfig({
        timezone: String(data.config.timezone || 'Europe/Oslo'),
        pigRemainderDueDate: String(data.config.pigRemainderDueDate || '2026-11-16'),
        pigRemainderReminderDays: Array.isArray(data.config.pigRemainderReminderDays)
          ? data.config.pigRemainderReminderDays.join(',')
          : '30,21,14,7,3,1',
        pigPostOrderExplainerDelayDays: Number(data.config.pigPostOrderExplainerDelayDays || 10),
        eggRemainderReminderDays: Array.isArray(data.config.eggRemainderReminderDays)
          ? data.config.eggRemainderReminderDays.join(',')
          : '11,9,7,6',
        eggOverdueGraceHours: Number(data.config.eggOverdueGraceHours || 48),
        chickenPickupReminderDays: Array.isArray(data.config.chickenPickupReminderDays)
          ? data.config.chickenPickupReminderDays.join(',')
          : '3,1',
        chickenAutoReadyDaysBefore: Number(data.config.chickenAutoReadyDaysBefore || 4),
        campaignSendViaApiCronOnly: Boolean(data.config.campaignSendViaApiCronOnly),
      });
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    const data = await callApi<{ campaigns: EmailCampaign[] }>('/api/admin/email/campaigns');
    setCampaigns(data.campaigns || []);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
  }, []);

  const loadQueue = useCallback(async () => {
    const data = await callApi<{ queue: QueueEntry[] }>('/api/admin/email/queue?limit=200');
    setQueue(data.queue || []);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await callApi<{ history: HistoryEntry[] }>('/api/admin/email/history?limit=200');
    setHistory(data.history || []);
    setWarning(typeof (data as any)?.warning === 'string' ? (data as any).warning : null);
  }, []);

  const loadSetup = useCallback(async () => {
    const data = await callApi<any>('/api/admin/email/setup');
    if (data?.settings) {
      setSetup({
        mode: data.settings.mode || 'legacy',
        paused: Boolean(data.settings.paused),
        batchSize: Number(data.settings.batchSize || 50),
        rateLimitPerMinute: Number(data.settings.rateLimitPerMinute || 60),
        defaultFrom: String(data.settings.defaultFrom || 'post@tinglum.com'),
        defaultReplyTo: String(data.settings.defaultReplyTo || 'post@tinglum.com'),
      });
    }
    setSuppressionList(data?.suppressionList || []);
    setSchemaStatus(data?.schemaStatus || null);
    setEnvStatus(data?.envStatus || null);
    setSetupDiagnostics((data?.diagnostics || null) as SetupDiagnostics | null);
    setSuppressionUnavailable(Boolean(data?.suppressionUnavailable));
    if (Array.isArray(data?.diagnostics?.causes) && data.diagnostics.causes.length > 0) {
      setWarning(data.diagnostics.causes.join(' | '));
    } else {
      setWarning(typeof data?.warning === 'string' ? data.warning : null);
    }
  }, []);

  async function refreshCurrentTab() {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      if (activeTab === 'overview') await loadOverview();
      if (activeTab === 'templates') await loadTemplates();
      if (activeTab === 'flows') await loadFlows();
      if (activeTab === 'lifecycle') await loadLifecycle();
      if (activeTab === 'campaigns') await loadCampaigns();
      if (activeTab === 'queue') await loadQueue();
      if (activeTab === 'history') await loadHistory();
      if (activeTab === 'setup') await loadSetup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    setWarning(null);
    const run = async () => {
      try {
        if (activeTab === 'overview') await loadOverview();
        if (activeTab === 'templates') await loadTemplates();
        if (activeTab === 'flows') await loadFlows();
        if (activeTab === 'lifecycle') await loadLifecycle();
        if (activeTab === 'campaigns') await loadCampaigns();
        if (activeTab === 'queue') await loadQueue();
        if (activeTab === 'history') await loadHistory();
        if (activeTab === 'setup') await loadSetup();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [activeTab, loadCampaigns, loadFlows, loadHistory, loadLifecycle, loadOverview, loadQueue, loadSetup, loadTemplates]);

  useEffect(() => {
    loadSetup().catch(() => {
      // setup endpoint errors are surfaced in tab loads where relevant
    });
  }, [loadSetup]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateEditor({
      subjectNo: selectedTemplate.subject_no,
      subjectEn: selectedTemplate.subject_en,
      bodyNo: selectedTemplate.body_no,
      bodyEn: selectedTemplate.body_en,
    });
  }, [selectedTemplate]);

  async function handleCreateTemplate() {
    if (!newTemplateLint.ok) {
      setError(`Template validation failed: ${newTemplateLint.errors.join('; ')}`);
      return;
    }
    await callApi('/api/admin/email/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTemplate,
        variables: newTemplateLint.normalizedVariables,
      }),
    });
    setNewTemplate({
      templateKey: '',
      classification: 'system',
      productScope: 'shared',
      subjectNo: '',
      subjectEn: '',
      bodyNo: '',
      bodyEn: '',
    });
    await loadTemplates();
  }

  async function handleSaveTemplate() {
    if (!selectedTemplate) return;
    if (!templateEditorLint.ok) {
      setError(`Template validation failed: ${templateEditorLint.errors.join('; ')}`);
      return;
    }
    await callApi(`/api/admin/email/templates/${selectedTemplate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...templateEditor,
        variables: templateEditorLint.normalizedVariables,
      }),
    });
    await loadTemplates();
  }

  async function handleCreateTemplateVersion() {
    if (!selectedTemplate) return;
    if (!templateEditorLint.ok) {
      setError(`Template validation failed: ${templateEditorLint.errors.join('; ')}`);
      return;
    }
    await callApi(`/api/admin/email/templates/${selectedTemplate.id}/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...templateEditor,
        variables: templateEditorLint.normalizedVariables,
        changeNote: templateChangeNote,
      }),
    });
    setTemplateChangeNote('');
    await loadTemplates();
  }

  async function handleFlowModeChange(flow: EmailFlow, mode: EmailFlow['mode']) {
    await callApi(`/api/admin/email/flows/${flow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    await loadFlows();
  }

  async function handleFlowToggle(flow: EmailFlow) {
    await callApi(`/api/admin/email/flows/${flow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !flow.active }),
    });
    await loadFlows();
  }

  async function handleCreateCampaign(status: 'draft' | 'ready' = 'draft') {
    const manualRecipients = campaignForm.manualEmails
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    await callApi('/api/admin/email/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignForm.name,
        classification: campaignForm.classification,
        recipientMode: campaignForm.recipientMode,
        subjectNo: campaignForm.subjectNo,
        subjectEn: campaignForm.subjectEn,
        bodyNo: campaignForm.bodyNo,
        bodyEn: campaignForm.bodyEn,
        manualRecipients,
        status,
      }),
    });

    setCampaignForm({
      name: '',
      classification: 'promotional',
      recipientMode: 'all',
      manualEmails: '',
      subjectNo: '',
      subjectEn: '',
      bodyNo: '',
      bodyEn: '',
    });

    await loadCampaigns();
  }

  async function handleCampaignPreview(campaignId: string) {
    const data = await callApi(`/api/admin/email/campaigns/${campaignId}/preview`, {
      method: 'POST',
    });
    setSelectedCampaignId(campaignId);
    setCampaignPreview(data);
  }

  async function handleCampaignEnqueue(campaignId: string, force = false) {
    await callApi(`/api/admin/email/campaigns/${campaignId}/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'no', force }),
    });
    await loadCampaigns();
    await loadQueue();
    await loadHistory();
  }

  async function handleRetryQueue(id: string) {
    await callApi(`/api/admin/email/queue/${id}/retry`, { method: 'POST' });
    await loadQueue();
  }

  async function handleCancelQueue(id: string) {
    await callApi(`/api/admin/email/queue/${id}/cancel`, { method: 'POST' });
    await loadQueue();
  }

  async function handleSaveSetup() {
    await callApi('/api/admin/email/setup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dispatchMode: setup.mode,
        dispatchPaused: setup.paused,
        batchSize: setup.batchSize,
        rateLimitPerMinute: setup.rateLimitPerMinute,
        defaultFrom: setup.defaultFrom,
        defaultReplyTo: setup.defaultReplyTo,
      }),
    });
    await loadSetup();
    await loadOverview();
  }

  function parseDaysCsv(value: string): number[] {
    return value
      .split(',')
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((entry) => Number.isFinite(entry));
  }

  async function handleSaveLifecycle() {
    await callApi('/api/admin/email/lifecycle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timezone: lifecycleConfig.timezone,
        pigRemainderDueDate: lifecycleConfig.pigRemainderDueDate,
        pigRemainderReminderDays: parseDaysCsv(lifecycleConfig.pigRemainderReminderDays),
        pigPostOrderExplainerDelayDays: lifecycleConfig.pigPostOrderExplainerDelayDays,
        eggRemainderReminderDays: parseDaysCsv(lifecycleConfig.eggRemainderReminderDays),
        eggOverdueGraceHours: lifecycleConfig.eggOverdueGraceHours,
        chickenPickupReminderDays: parseDaysCsv(lifecycleConfig.chickenPickupReminderDays),
        chickenAutoReadyDaysBefore: lifecycleConfig.chickenAutoReadyDaysBefore,
        campaignSendViaApiCronOnly: lifecycleConfig.campaignSendViaApiCronOnly,
      }),
    });

    await loadLifecycle();
  }

  async function handleAddSuppression() {
    if (!suppressionEmail.trim()) return;
    await callApi('/api/admin/email/setup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addSuppressionEmail: suppressionEmail,
        suppressionReason,
      }),
    });
    setSuppressionEmail('');
    await loadSetup();
  }

  async function handleRemoveSuppression(email: string) {
    await callApi('/api/admin/email/setup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        removeSuppressionEmail: email,
      }),
    });
    await loadSetup();
  }

  function buildFallbackPreviewHtml(entry: QueueEntry | HistoryEntry): string {
    return `
      <html>
        <body style="font-family:Arial,sans-serif;padding:24px;color:#111827;">
          <h2 style="margin:0 0 12px 0;">${entry.subject || 'Email'}</h2>
          <p style="margin:0 0 8px 0;"><strong>To:</strong> ${entry.to_email || '-'}</p>
          <p style="margin:0 0 8px 0;"><strong>Status:</strong> ${entry.status || '-'}</p>
          <p style="margin:0 0 8px 0;"><strong>Template:</strong> ${entry.template_key || '-'}</p>
          <p style="margin:0 0 8px 0;"><strong>Created:</strong> ${entry.created_at ? new Date(entry.created_at).toLocaleString() : '-'}</p>
          ${entry.sent_at ? `<p style="margin:0 0 8px 0;"><strong>Sent:</strong> ${new Date(entry.sent_at).toLocaleString()}</p>` : ''}
          ${entry.last_error ? `<p style="margin:12px 0 0 0;color:#b91c1c;"><strong>Error:</strong> ${entry.last_error}</p>` : ''}
          <hr style="margin:16px 0;border:0;border-top:1px solid #e5e7eb;" />
          <p style="margin:0;color:#6b7280;">No stored HTML body was found for this entry. Metadata preview shown.</p>
        </body>
      </html>
    `.trim();
  }

  function openEmailPreviewFromQueueLike(entry: QueueEntry | HistoryEntry, titlePrefix: string) {
    setEmailPreviewModal({
      title: `${titlePrefix} - ${entry.to_email}`,
      subtitle: `${entry.template_key || 'template:unknown'} - ${entry.status}`,
      subject: entry.subject || 'Email',
      html: entry.html || buildFallbackPreviewHtml(entry),
    });
  }

  function openTemplatePreview(template: EmailTemplate, locale: 'no' | 'en' = 'no') {
    // Use current editor content so you can preview unsaved edits
    const subjectNo = templateEditor.subjectNo || template.subject_no;
    const subjectEn = templateEditor.subjectEn || template.subject_en;
    const bodyNo = templateEditor.bodyNo || template.body_no;
    const bodyEn = templateEditor.bodyEn || template.body_en;

    const subject =
      locale === 'en' ? subjectEn || subjectNo || template.template_key : subjectNo || subjectEn || template.template_key;
    const body = locale === 'en' ? bodyEn || bodyNo || '' : bodyNo || bodyEn || '';
    const html = body
      ? body
      : `<p style="font-family:Arial,sans-serif;color:#374151;">No template body found.</p>`;

    setEmailPreviewModal({
      title: `Template - ${template.template_key}`,
      subtitle: `${template.classification} - v${template.current_version} - ${locale.toUpperCase()}`,
      subject,
      html,
    });
  }

  function openFlowTemplatePreview(flow: EmailFlow, locale: 'no' | 'en' = 'no') {
    const tpl = flow.email_templates;
    const subject =
      locale === 'en' ? tpl?.subject_en || tpl?.subject_no || flow.template_key : tpl?.subject_no || tpl?.subject_en || flow.template_key;
    const body =
      locale === 'en' ? tpl?.body_en || tpl?.body_no || '' : tpl?.body_no || tpl?.body_en || '';

    const html = body
      ? body
      : `<p style="font-family:Arial,sans-serif;color:#374151;">No stored template body found for this flow.</p>`;

    setEmailPreviewModal({
      title: `Flow template - ${flow.flow_key}`,
      subtitle: `${flow.template_key} - ${flow.event_type} - ${locale.toUpperCase()}`,
      subject,
      html,
    });
  }

  function openCampaignTemplatePreview(campaign: EmailCampaign, locale: 'no' | 'en' = 'no') {
    const subject =
      locale === 'en'
        ? campaign.subject_en || campaign.subject_no || campaign.name
        : campaign.subject_no || campaign.subject_en || campaign.name;
    const body = locale === 'en' ? campaign.body_en || campaign.body_no || '' : campaign.body_no || campaign.body_en || '';
    const html = body
      ? body
      : `<p style="font-family:Arial,sans-serif;color:#374151;">No campaign body found.</p>`;

    setEmailPreviewModal({
      title: `Campaign email - ${campaign.name}`,
      subtitle: `${campaign.classification} - ${campaign.status} - ${locale.toUpperCase()}`,
      subject,
      html,
    });
  }

  async function openLifecyclePreview(instance: {
    id: string;
    flow_key: string;
    status: string;
    entity_type: string;
    entity_id: string;
    scheduled_for: string;
  }) {
    setLifecyclePreviewLoadingId(instance.id);
    try {
      const data = await callApi<{
        preview?: {
          flowKey: string;
          templateKey: string;
          toEmail: string | null;
          status: string;
          scheduledFor: string;
          subject: string;
          html: string;
        };
      }>(`/api/admin/email/lifecycle/preview?instanceId=${encodeURIComponent(instance.id)}`);

      if (!data?.preview?.html || !data?.preview?.subject) {
        setError('Could not load lifecycle email preview.');
        return;
      }

      setEmailPreviewModal({
        title: `Planned - ${data.preview.flowKey}`,
        subtitle: `${data.preview.templateKey} - ${data.preview.status} - ${new Date(data.preview.scheduledFor).toLocaleString()}`,
        subject: data.preview.subject,
        html: data.preview.html,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lifecycle preview');
    } finally {
      setLifecyclePreviewLoadingId(null);
    }
  }

  const templateQualityChecks = useMemo(() => {
    if (!selectedTemplate) return [];

    const noText = `${templateEditor.subjectNo}\n${templateEditor.bodyNo}`;
    const enText = `${templateEditor.subjectEn}\n${templateEditor.bodyEn}`;
    const noHasNextStep = /hva skjer nå\?/i.test(noText);
    const enHasNextStep = /what happens next\?/i.test(enText);
    const noHasMinSide = /min side/i.test(noText);
    const enHasMyPage = /my page/i.test(enText);
    const hasLinks = /href\s*=\s*['"]/i.test(noText) && /href\s*=\s*['"]/i.test(enText);
    const noHasDateOrDeadline = /(\{\{\s*(due_date|delivery_date|pickup_date)\s*\}\}|forfall|dato|uke|hentedato)/i.test(noText);
    const enHasDateOrDeadline = /(\{\{\s*(due_date|delivery_date|pickup_date)\s*\}\}|due date|date|week|pickup)/i.test(enText);
    const noHasPaymentSnapshot =
      /(\{\{\s*(total_amount_nok|deposit_amount_nok|remainder_amount_nok)\s*\}\}|forskudd|restbetaling|betalingsoversikt|total)/i.test(
        noText
      );
    const enHasPaymentSnapshot =
      /(\{\{\s*(total_amount_nok|deposit_amount_nok|remainder_amount_nok)\s*\}\}|payment snapshot|deposit|remaining|total)/i.test(
        enText
      );

    return [
      {
        label: 'NO quality and terminology',
        pass: !templateEditorLint.errors.some((entry) => entry.toLowerCase().includes('subjectno') || entry.toLowerCase().includes('bodyno')),
      },
      {
        label: 'EN parity with NO',
        pass: !templateEditorLint.errors.some((entry) => entry.toLowerCase().includes('placeholder')),
      },
      {
        label: 'Includes "What happens next" block',
        pass: noHasNextStep && enHasNextStep,
      },
      {
        label: 'Includes Min side / My Page reference',
        pass: noHasMinSide && enHasMyPage,
      },
      {
        label: 'Contains at least one link in both locales',
        pass: hasLinks,
      },
      {
        label: 'Includes explicit date/deadline context (Oslo timeline)',
        pass: noHasDateOrDeadline && enHasDateOrDeadline,
      },
      {
        label: 'Includes payment snapshot for transactional clarity',
        pass: noHasPaymentSnapshot && enHasPaymentSnapshot,
      },
    ];
  }, [selectedTemplate, templateEditor.subjectNo, templateEditor.bodyNo, templateEditor.subjectEn, templateEditor.bodyEn, templateEditorLint.errors]);

  const tabs: Array<{ id: EmailSubTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'templates', label: 'Templates' },
    { id: 'flows', label: 'Flows' },
    { id: 'lifecycle', label: 'Lifecycle' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'queue', label: 'Queue' },
    { id: 'history', label: 'History' },
    { id: 'setup', label: 'Setup' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-neutral-900">Email Control Center</h2>
          <p className="text-sm text-neutral-600">Unified templates, flows, campaigns, queue and setup.</p>
        </div>
        <Button variant="outline" onClick={refreshCurrentTab} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="border-b border-neutral-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-light transition-all relative whitespace-nowrap',
                activeTab === tab.id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
              )}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="p-4 border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {!error && warning && (
        <Card className="p-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">{warning}</p>
        </Card>
      )}

      {schemaStatus && !schemaStatus.ready && (
        <Card className="p-4 border border-amber-300 bg-amber-50">
          <p className="text-sm font-medium text-amber-900">Email schema is incomplete in this environment.</p>
          <p className="text-xs text-amber-800 mt-1">
            Missing tables: {schemaStatus.missingTables.join(', ')}
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Run the unified email migrations in Supabase before using all features.
          </p>
        </Card>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-neutral-600">Dispatch Mode</p>
            <p className="text-2xl font-semibold text-neutral-900">{overview?.dispatch?.mode || setup.mode}</p>
            <p className="text-sm text-neutral-500">{overview?.dispatch?.paused ? 'Paused' : 'Running'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-600">Queue Active</p>
            <p className="text-2xl font-semibold text-neutral-900">{overview?.queue?.active || 0}</p>
            <p className="text-sm text-neutral-500">Pending + processing + failed</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-600">Sent Last 24h</p>
            <p className="text-2xl font-semibold text-neutral-900">{overview?.queue?.sentLast24h || 0}</p>
            <p className="text-sm text-neutral-500">Successful deliveries</p>
          </Card>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Create Template</h3>
            <Input
              placeholder="template-key"
              value={newTemplate.templateKey}
              onChange={(event) => setNewTemplate((prev) => ({ ...prev, templateKey: event.target.value }))}
            />
            <Input
              placeholder="Subject (NO)"
              value={newTemplate.subjectNo}
              onChange={(event) => setNewTemplate((prev) => ({ ...prev, subjectNo: event.target.value }))}
            />
            <Input
              placeholder="Subject (EN)"
              value={newTemplate.subjectEn}
              onChange={(event) => setNewTemplate((prev) => ({ ...prev, subjectEn: event.target.value }))}
            />
            <Textarea
              rows={4}
              placeholder="Body (NO)"
              value={newTemplate.bodyNo}
              onChange={(event) => setNewTemplate((prev) => ({ ...prev, bodyNo: event.target.value }))}
            />
            <Textarea
              rows={4}
              placeholder="Body (EN)"
              value={newTemplate.bodyEn}
              onChange={(event) => setNewTemplate((prev) => ({ ...prev, bodyEn: event.target.value }))}
            />
            <Button onClick={handleCreateTemplate}>Create</Button>
            <div
              className={cn(
                'rounded-md border p-3 text-xs',
                newTemplateLint.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
              )}
            >
              <p className="font-medium text-neutral-900">Create validation</p>
              {newTemplateLint.ok ? (
                <p>Ready to create.</p>
              ) : (
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  {newTemplateLint.errors.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Templates</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={cn(
                    'w-full text-left border rounded-md p-3 transition-colors',
                    selectedTemplateId === template.id
                      ? 'border-neutral-800 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-400'
                  )}
                >
                  <p className="text-sm font-medium">{template.template_key}</p>
                  <p className="text-xs text-neutral-500">
                    {template.classification} - v{template.current_version}
                  </p>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Edit Selected</h3>
            {!selectedTemplate ? (
              <p className="text-sm text-neutral-500">Select a template.</p>
            ) : (
              <>
                <Input
                  value={templateEditor.subjectNo}
                  onChange={(event) => setTemplateEditor((prev) => ({ ...prev, subjectNo: event.target.value }))}
                />
                <Input
                  value={templateEditor.subjectEn}
                  onChange={(event) => setTemplateEditor((prev) => ({ ...prev, subjectEn: event.target.value }))}
                />
                <Textarea
                  rows={4}
                  value={templateEditor.bodyNo}
                  onChange={(event) => setTemplateEditor((prev) => ({ ...prev, bodyNo: event.target.value }))}
                />
                <Textarea
                  rows={4}
                  value={templateEditor.bodyEn}
                  onChange={(event) => setTemplateEditor((prev) => ({ ...prev, bodyEn: event.target.value }))}
                />
                <Input
                  placeholder="Change note"
                  value={templateChangeNote}
                  onChange={(event) => setTemplateChangeNote(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleSaveTemplate}>
                    Save
                  </Button>
                  <Button onClick={handleCreateTemplateVersion}>New Version</Button>
                  <Button variant="outline" onClick={() => openTemplatePreview(selectedTemplate, 'no')}>
                    Preview NO
                  </Button>
                  <Button variant="outline" onClick={() => openTemplatePreview(selectedTemplate, 'en')}>
                    Preview EN
                  </Button>
                </div>
                <div
                  className={cn(
                    'rounded-md border p-3 text-xs',
                    templateEditorLint.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
                  )}
                >
                  <p className="font-medium text-neutral-900">Template lint</p>
                  {templateEditorLint.ok ? (
                    <p>Template lint passed.</p>
                  ) : (
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {templateEditorLint.errors.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  )}
                  {templateEditorLint.warnings.length > 0 ? (
                    <div className="mt-2">
                      <p className="font-medium text-neutral-900">Warnings</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        {templateEditorLint.warnings.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                  <p className="font-medium text-neutral-900">Copy QA checklist</p>
                  <ul className="mt-1 space-y-1">
                    {templateQualityChecks.map((item) => (
                      <li key={item.label} className={item.pass ? 'text-emerald-700' : 'text-amber-700'}>
                        {item.pass ? 'OK' : 'Needs work'} - {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'flows' && (
        <div className="space-y-2">
          {flows.map((flow) => (
            <Card key={flow.id} className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="font-medium">{flow.flow_key}</p>
                <p className="text-xs text-neutral-500">
                  event={flow.event_type} - template={flow.template_key} - offset={flow.send_offset_minutes}m
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openFlowTemplatePreview(flow, 'no')}>
                  Preview NO
                </Button>
                <Button variant="outline" onClick={() => openFlowTemplatePreview(flow, 'en')}>
                  Preview EN
                </Button>
                <select
                  value={flow.mode}
                  onChange={(event) => handleFlowModeChange(flow, event.target.value as EmailFlow['mode'])}
                  className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="shadow">shadow</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
                <Button variant="outline" onClick={() => handleFlowToggle(flow)}>
                  {flow.active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'lifecycle' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-3">
            <h3 className="text-lg font-medium">Trigger Configuration</h3>
            <Label>Timezone</Label>
            <Input
              value={lifecycleConfig.timezone}
              onChange={(event) => setLifecycleConfig((prev) => ({ ...prev, timezone: event.target.value }))}
            />
            <Label>Pig remainder due date (ISO)</Label>
            <Input
              value={lifecycleConfig.pigRemainderDueDate}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({ ...prev, pigRemainderDueDate: event.target.value }))
              }
            />
            <Label>Pig reminder days</Label>
            <Input
              value={lifecycleConfig.pigRemainderReminderDays}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({ ...prev, pigRemainderReminderDays: event.target.value }))
              }
              placeholder="30,21,14,7,3,1"
            />
            <Label>Pig explainer delay days</Label>
            <Input
              type="number"
              value={lifecycleConfig.pigPostOrderExplainerDelayDays}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({
                  ...prev,
                  pigPostOrderExplainerDelayDays: Number(event.target.value || 0),
                }))
              }
            />
            <Label>Egg reminder days</Label>
            <Input
              value={lifecycleConfig.eggRemainderReminderDays}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({ ...prev, eggRemainderReminderDays: event.target.value }))
              }
              placeholder="11,9,7,6"
            />
            <Label>Egg overdue grace (hours)</Label>
            <Input
              type="number"
              value={lifecycleConfig.eggOverdueGraceHours}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({
                  ...prev,
                  eggOverdueGraceHours: Number(event.target.value || 0),
                }))
              }
            />
            <Label>Chicken pickup reminder days</Label>
            <Input
              value={lifecycleConfig.chickenPickupReminderDays}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({ ...prev, chickenPickupReminderDays: event.target.value }))
              }
              placeholder="3,1"
            />
            <Label>Chicken auto-ready days before pickup</Label>
            <Input
              type="number"
              value={lifecycleConfig.chickenAutoReadyDaysBefore}
              onChange={(event) =>
                setLifecycleConfig((prev) => ({
                  ...prev,
                  chickenAutoReadyDaysBefore: Number(event.target.value || 0),
                }))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lifecycleConfig.campaignSendViaApiCronOnly}
                onChange={(event) =>
                  setLifecycleConfig((prev) => ({
                    ...prev,
                    campaignSendViaApiCronOnly: event.target.checked,
                  }))
                }
              />
              Campaign sending via API/cron only
            </label>
            <Button onClick={handleSaveLifecycle}>Save Lifecycle</Button>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-medium">Flow Health</h3>
              <p className="text-sm text-neutral-600">
                Scheduled: {lifecycle?.statusCounts?.scheduled || 0} - Enqueued:{' '}
                {lifecycle?.statusCounts?.enqueued || 0} - Failed: {lifecycle?.statusCounts?.failed || 0}
              </p>
              <p className="text-sm text-neutral-600">
                Materialized this refresh: {Number(lifecycle?.materializedInserted || 0)}
              </p>
              <p className="text-sm text-neutral-600">
                Missing email alerts: {Array.isArray(lifecycle?.missingAlerts) ? lifecycle.missingAlerts.length : 0}
              </p>
              <p className="text-sm text-neutral-600">
                Stale scheduled: {Number(lifecycle?.consistency?.staleScheduled || 0)} - Failed instances:{' '}
                {Number(lifecycle?.consistency?.failedInstances || 0)} - Enqueued w/o queue id:{' '}
                {Number(lifecycle?.consistency?.enqueuedWithoutQueue || 0)}
              </p>
              <p
                className={cn(
                  'text-sm font-medium',
                  lifecycle?.consistency?.ok ? 'text-emerald-700' : 'text-amber-700'
                )}
              >
                {lifecycle?.consistency?.ok
                  ? 'Lifecycle consistency looks good.'
                  : 'Lifecycle consistency has issues that need attention.'}
              </p>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="text-lg font-medium">Canonical Flow Matrix</h3>
              <div className="max-h-[260px] overflow-y-auto space-y-2">
                {((lifecycle?.flowMatrix || []) as LifecycleFlowMatrixRow[]).map((row) => (
                  <div key={row.flowKey} className="rounded-md border border-neutral-200 p-2">
                    <p className="text-sm font-medium">{row.flowKey}</p>
                    <p className="text-xs text-neutral-600">
                      scope={row.productScope} - event={row.eventType} - template={row.templateKey}
                    </p>
                    <p className="text-xs text-neutral-600">trigger={row.triggerRule}</p>
                    <p className="text-xs text-neutral-600">schedule={row.scheduleLocalTime}</p>
                    <p className="text-xs text-neutral-500">stop rules: {row.stopRules.join(', ')}</p>
                  </div>
                ))}
                {(lifecycle?.flowMatrix || []).length === 0 ? (
                  <p className="text-sm text-neutral-500">No flow matrix loaded.</p>
                ) : null}
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="text-lg font-medium">Upcoming Triggers</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {upcomingLifecycleInstances.slice(0, 40).map((instance: any) => (
                  <div key={instance.id} className="border border-neutral-200 rounded-md p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {instance.flow_key} - {instance.status}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {instance.entity_type} {instance.entity_id}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(instance.scheduled_for).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => openLifecyclePreview(instance)}
                        disabled={lifecyclePreviewLoadingId === instance.id}
                      >
                        {lifecyclePreviewLoadingId === instance.id ? 'Loading...' : 'Preview'}
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingLifecycleInstances.length === 0 ? (
                  <p className="text-sm text-neutral-500">No upcoming scheduled triggers.</p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Create Campaign</h3>
            <Input
              placeholder="Campaign name"
              value={campaignForm.name}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Textarea
              rows={3}
              placeholder="manual emails, one per line (optional)"
              value={campaignForm.manualEmails}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, manualEmails: event.target.value }))}
            />
            <Input
              placeholder="Subject (NO)"
              value={campaignForm.subjectNo}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, subjectNo: event.target.value }))}
            />
            <Input
              placeholder="Subject (EN)"
              value={campaignForm.subjectEn}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, subjectEn: event.target.value }))}
            />
            <Textarea
              rows={4}
              placeholder="Body (NO)"
              value={campaignForm.bodyNo}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, bodyNo: event.target.value }))}
            />
            <Textarea
              rows={4}
              placeholder="Body (EN)"
              value={campaignForm.bodyEn}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, bodyEn: event.target.value }))}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleCreateCampaign('draft')}>
                Save Draft
              </Button>
              <Button onClick={() => handleCreateCampaign('ready')}>Set Ready</Button>
            </div>
          </Card>
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Campaigns</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border border-neutral-200 rounded-md p-3">
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-xs text-neutral-500">
                    {campaign.status} - {campaign.classification} - recipients {campaign.total_recipients}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={() => openCampaignTemplatePreview(campaign, 'no')}>
                      Preview NO
                    </Button>
                    <Button variant="outline" onClick={() => openCampaignTemplatePreview(campaign, 'en')}>
                      Preview EN
                    </Button>
                    <Button variant="outline" onClick={() => handleCampaignPreview(campaign.id)}>
                      Recipients
                    </Button>
                    {!lifecycleConfig.campaignSendViaApiCronOnly ? (
                      <Button onClick={() => handleCampaignEnqueue(campaign.id)}>Enqueue</Button>
                    ) : null}
                    <Button
                      variant={lifecycleConfig.campaignSendViaApiCronOnly ? 'outline' : 'default'}
                      onClick={() => handleCampaignEnqueue(campaign.id, true)}
                    >
                      {lifecycleConfig.campaignSendViaApiCronOnly ? 'Send now (admin override)' : 'Send now'}
                    </Button>
                    {lifecycleConfig.campaignSendViaApiCronOnly && (
                      <span className="text-xs text-neutral-500 self-center">Policy: cron/API-only enabled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedCampaignId && campaignPreview && (
              <Card className="p-3 border border-neutral-200">
                <p className="text-sm font-medium">Preview for {selectedCampaignId}</p>
                <p className="text-sm text-neutral-600">
                  Total: {campaignPreview.total} - Sendable: {campaignPreview.sendable} - Skipped: {campaignPreview.skipped}
                </p>
              </Card>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-2">
          {queue.map((item) => (
            <Card key={item.id} className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {item.to_email} - {item.status}
                </p>
                <p className="text-xs text-neutral-500">
                  attempts {item.attempts}/{item.max_attempts} - next {new Date(item.next_attempt_at).toLocaleString()}
                </p>
                {item.last_error && <p className="text-xs text-red-600">{item.last_error}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => openEmailPreviewFromQueueLike(item, 'Queue email')}
                >
                  Preview
                </Button>
                <Button variant="outline" onClick={() => handleRetryQueue(item.id)}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => handleCancelQueue(item.id)}>
                  Cancel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {item.to_email} - {item.status} - {item.classification}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Created {new Date(item.created_at).toLocaleString()}
                    {item.sent_at ? ` - Sent ${new Date(item.sent_at).toLocaleString()}` : ''}
                  </p>
                  <p className="text-xs text-neutral-700">{item.subject}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openEmailPreviewFromQueueLike(item, 'History email')}
                >
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-3 xl:col-span-2">
            <h3 className="text-lg font-medium">Diagnostics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">Support reply inbox</p>
                <p className="font-medium">{setupDiagnostics?.supportReplyAddress || 'Unknown'}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {setupDiagnostics?.supportReplyUsesDedicatedMailbox
                    ? 'Dedicated inbox for support threads'
                    : 'Not using a dedicated support inbox'}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">General Reply-To</p>
                <p className="font-medium">{setupDiagnostics?.generalReplyAddress || setup.defaultReplyTo || 'Unknown'}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  sender: {setupDiagnostics?.senderAddress || setup.defaultFrom || 'Unknown'}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">Cron: reconcile</p>
                <p className="font-medium">{setupDiagnostics?.cronUrls?.reconcile || '/api/cron/email-flow-reconcile'}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">Cron: flow runner</p>
                <p className="font-medium">{setupDiagnostics?.cronUrls?.flowRunner || '/api/cron/email-flow-runner'}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">Cron: dispatch</p>
                <p className="font-medium">{setupDiagnostics?.cronUrls?.dispatch || '/api/cron/email-dispatch'}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-neutral-500">Latest flow run</p>
                <p className="font-medium">
                  {setupDiagnostics?.latestFlowRun?.started_at
                    ? new Date(String(setupDiagnostics.latestFlowRun.started_at)).toLocaleString()
                    : 'No run recorded'}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  state: {setupDiagnostics?.latestRunState || 'unknown'}
                  {typeof setupDiagnostics?.latestRunAgeMinutes === 'number'
                    ? ` - ${setupDiagnostics.latestRunAgeMinutes} min ago`
                    : ''}
                </p>
              </div>
            </div>

            {typeof setupDiagnostics?.primaryCause === 'string' && setupDiagnostics.primaryCause.trim() ? (
              <div className="rounded-md border border-neutral-300 bg-neutral-100 p-3 text-sm text-neutral-800">
                <p className="font-medium">Primary cause</p>
                <p className="mt-1">{setupDiagnostics.primaryCause}</p>
              </div>
            ) : null}

            {setupDiagnostics?.supportReplyOverridesGeneralReplyTo ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Support threads are overriding the general Reply-To so customer replies go to
                {' '}
                <span className="font-medium">{setupDiagnostics.supportReplyAddress}</span>
                {' '}
                instead of
                {' '}
                <span className="font-medium">{setupDiagnostics.generalReplyAddress}</span>.
              </div>
            ) : null}

            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <div className="rounded border border-neutral-200 p-2">
                pending: {Number(setupDiagnostics?.queue?.pending || 0)}
              </div>
              <div className="rounded border border-neutral-200 p-2">
                processing: {Number(setupDiagnostics?.queue?.processing || 0)}
              </div>
              <div className="rounded border border-neutral-200 p-2">
                failed: {Number(setupDiagnostics?.queue?.failed || 0)}
              </div>
              <div className="rounded border border-neutral-200 p-2">
                dead: {Number(setupDiagnostics?.queue?.dead || 0)}
              </div>
              <div className="rounded border border-neutral-200 p-2">
                active 24h: {Number(setupDiagnostics?.queue?.activeLast24h || 0)}
              </div>
              <div className="rounded border border-neutral-200 p-2">
                sent 24h: {Number(setupDiagnostics?.queue?.sentLast24h || 0)}
              </div>
            </div>

            {setupDiagnostics?.latestFlowRun?.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Latest flow error: {String(setupDiagnostics.latestFlowRun.error)}
              </div>
            ) : null}

            {Array.isArray(setupDiagnostics?.causes) && (setupDiagnostics?.causes?.length || 0) > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Detected causes</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {(setupDiagnostics?.causes || []).map((cause) => (
                    <li key={cause}>{cause}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                No blocking diagnostics detected.
              </div>
            )}

            {Array.isArray(setupDiagnostics?.suggestedFixes) &&
            (setupDiagnostics?.suggestedFixes?.length || 0) > 0 ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-medium">Suggested fixes</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {(setupDiagnostics?.suggestedFixes || []).map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {setupDiagnostics?.schemaDetails && Object.keys(setupDiagnostics.schemaDetails).length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-medium">Schema details</p>
                <div className="mt-2 space-y-1 text-xs">
                  {Object.entries(setupDiagnostics.schemaDetails).map(([table, detail]) => (
                    <p key={table}>
                      <span className="font-semibold">{table}</span>: {detail}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Dispatch Settings</h3>
            {envStatus && (
              <div className="text-xs text-neutral-600 rounded-md border border-neutral-200 bg-neutral-50 p-2 space-y-1">
                <p>MAILGUN_API_KEY: {envStatus.mailgunApiKey ? 'ok' : 'missing'}</p>
                <p>MAILGUN_DOMAIN: {envStatus.mailgunDomain ? 'ok' : 'missing'}</p>
                <p>MAILGUN_WEBHOOK_SIGNING_KEY: {envStatus.mailgunWebhookSigningKey ? 'ok' : 'missing'}</p>
                <p>EMAIL_REPLY_TO: {envStatus.emailReplyTo ? 'ok' : 'missing'}</p>
                <p>CRON_SECRET: {envStatus.cronSecret ? 'ok' : 'missing'}</p>
                <p>NEXT_PUBLIC_APP_URL: {envStatus.nextPublicAppUrl ? 'ok' : 'missing'}</p>
              </div>
            )}
            <Label>Mode</Label>
            <select
              value={setup.mode}
              onChange={(event) => setSetup((prev) => ({ ...prev, mode: event.target.value as SetupPayload['mode'] }))}
              className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="legacy">legacy</option>
              <option value="shadow">shadow</option>
              <option value="active">active</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setup.paused}
                onChange={(event) => setSetup((prev) => ({ ...prev, paused: event.target.checked }))}
              />
              Pause dispatch worker
            </label>
            <Input
              type="number"
              value={setup.batchSize}
              onChange={(event) => setSetup((prev) => ({ ...prev, batchSize: Number(event.target.value || 0) }))}
            />
            <Input
              type="number"
              value={setup.rateLimitPerMinute}
              onChange={(event) =>
                setSetup((prev) => ({ ...prev, rateLimitPerMinute: Number(event.target.value || 0) }))
              }
            />
            <Input
              value={setup.defaultFrom}
              onChange={(event) => setSetup((prev) => ({ ...prev, defaultFrom: event.target.value }))}
            />
            <Input
              value={setup.defaultReplyTo}
              onChange={(event) => setSetup((prev) => ({ ...prev, defaultReplyTo: event.target.value }))}
            />
            <p className="text-xs text-neutral-500">
              Support threads currently reply to
              {' '}
              <span className="font-medium">{setupDiagnostics?.supportReplyAddress || 'unknown'}</span>
              .
            </p>
            <Button onClick={handleSaveSetup}>Save Setup</Button>
          </Card>
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Suppression List</h3>
            {suppressionUnavailable && (
              <p className="text-xs text-amber-700">
                Suppression list table is unavailable in this environment.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="email@example.com"
                value={suppressionEmail}
                onChange={(event) => setSuppressionEmail(event.target.value)}
              />
              <select
                value={suppressionReason}
                onChange={(event) => setSuppressionReason(event.target.value)}
                className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="manual_unsubscribe">manual_unsubscribe</option>
                <option value="bounced">bounced</option>
                <option value="complaint">complaint</option>
              </select>
              <Button onClick={handleAddSuppression}>Add</Button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {suppressionList.map((item) => (
                <div key={item.email} className="flex items-center justify-between border border-neutral-200 rounded-md p-2">
                  <div>
                    <p className="text-sm font-medium">{item.email}</p>
                    <p className="text-xs text-neutral-500">
                      {item.reason} - {item.source}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => handleRemoveSuppression(item.email)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {emailPreviewModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 p-4 md:p-8">
          <div className="mx-auto h-full max-w-5xl rounded-xl border border-neutral-300 bg-white shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <div>
                <p className="text-lg font-medium text-neutral-900">{emailPreviewModal.title}</p>
                {emailPreviewModal.subtitle ? (
                  <p className="text-xs text-neutral-500 mt-1">{emailPreviewModal.subtitle}</p>
                ) : null}
                <p className="text-sm text-neutral-700 mt-2">
                  <span className="font-medium">Subject:</span> {emailPreviewModal.subject}
                </p>
              </div>
              <Button variant="outline" onClick={() => setEmailPreviewModal(null)}>
                Close
              </Button>
            </div>
            <div className="flex-1 p-3 md:p-4">
              <iframe
                title="Email preview"
                srcDoc={emailPreviewModal.html}
                className="h-full w-full rounded-md border border-neutral-200 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
