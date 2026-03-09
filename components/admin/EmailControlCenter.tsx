"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
};

type EmailCampaign = {
  id: string;
  name: string;
  classification: string;
  status: string;
  recipient_mode: 'all' | 'manual' | 'filters';
  total_recipients: number;
};

type QueueEntry = {
  id: string;
  status: string;
  classification: string;
  to_email: string;
  subject: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  next_attempt_at: string;
  last_error?: string | null;
};

type HistoryEntry = QueueEntry & {
  sent_at?: string | null;
};

type SetupPayload = {
  mode: 'legacy' | 'shadow' | 'active';
  paused: boolean;
  batchSize: number;
  rateLimitPerMinute: number;
  defaultFrom: string;
  defaultReplyTo: string;
};

export function EmailControlCenter() {
  const [activeTab, setActiveTab] = useState<EmailSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function callApi<T = any>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data as T;
  }

  const loadOverview = useCallback(async () => {
    const data = await callApi('/api/admin/email/overview');
    setOverview(data);
  }, []);

  const loadTemplates = useCallback(async () => {
    const data = await callApi<{ templates: EmailTemplate[] }>('/api/admin/email/templates');
    setTemplates(data.templates || []);
    if (!selectedTemplateId && data.templates?.length) {
      setSelectedTemplateId(data.templates[0].id);
    }
  }, [selectedTemplateId]);

  const loadFlows = useCallback(async () => {
    const data = await callApi<{ flows: EmailFlow[] }>('/api/admin/email/flows');
    setFlows(data.flows || []);
  }, []);

  const loadLifecycle = useCallback(async () => {
    const data = await callApi<any>('/api/admin/email/lifecycle');
    setLifecycle(data);
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
  }, []);

  const loadQueue = useCallback(async () => {
    const data = await callApi<{ queue: QueueEntry[] }>('/api/admin/email/queue?limit=200');
    setQueue(data.queue || []);
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await callApi<{ history: HistoryEntry[] }>('/api/admin/email/history?limit=200');
    setHistory(data.history || []);
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
  }, []);

  async function refreshCurrentTab() {
    setLoading(true);
    setError(null);
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
    if (!selectedTemplate) return;
    setTemplateEditor({
      subjectNo: selectedTemplate.subject_no,
      subjectEn: selectedTemplate.subject_en,
      bodyNo: selectedTemplate.body_no,
      bodyEn: selectedTemplate.body_en,
    });
  }, [selectedTemplate]);

  async function handleCreateTemplate() {
    await callApi('/api/admin/email/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
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
    await callApi(`/api/admin/email/templates/${selectedTemplate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateEditor),
    });
    await loadTemplates();
  }

  async function handleCreateTemplateVersion() {
    if (!selectedTemplate) return;
    await callApi(`/api/admin/email/templates/${selectedTemplate.id}/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...templateEditor,
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

  async function handleCampaignEnqueue(campaignId: string) {
    await callApi(`/api/admin/email/campaigns/${campaignId}/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'no' }),
    });
    await loadCampaigns();
    await loadQueue();
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
                    {template.classification} · v{template.current_version}
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveTemplate}>
                    Save
                  </Button>
                  <Button onClick={handleCreateTemplateVersion}>New Version</Button>
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
                  event={flow.event_type} · template={flow.template_key} · offset={flow.send_offset_minutes}m
                </p>
              </div>
              <div className="flex gap-2">
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
                Scheduled: {lifecycle?.statusCounts?.scheduled || 0} · Enqueued:{' '}
                {lifecycle?.statusCounts?.enqueued || 0} · Failed: {lifecycle?.statusCounts?.failed || 0}
              </p>
              <p className="text-sm text-neutral-600">
                Missing email alerts: {Array.isArray(lifecycle?.missingAlerts) ? lifecycle.missingAlerts.length : 0}
              </p>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="text-lg font-medium">Upcoming Triggers</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {(lifecycle?.instances || []).slice(0, 40).map((instance: any) => (
                  <div key={instance.id} className="border border-neutral-200 rounded-md p-2">
                    <p className="text-sm font-medium">
                      {instance.flow_key} · {instance.status}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {instance.entity_type} {instance.entity_id}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(instance.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                ))}
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
                    {campaign.status} · {campaign.classification} · recipients {campaign.total_recipients}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={() => handleCampaignPreview(campaign.id)}>
                      Preview
                    </Button>
                    {!lifecycleConfig.campaignSendViaApiCronOnly ? (
                      <Button onClick={() => handleCampaignEnqueue(campaign.id)}>Enqueue</Button>
                    ) : (
                      <span className="text-xs text-neutral-500 self-center">Sent by cron when status is ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedCampaignId && campaignPreview && (
              <Card className="p-3 border border-neutral-200">
                <p className="text-sm font-medium">Preview for {selectedCampaignId}</p>
                <p className="text-sm text-neutral-600">
                  Total: {campaignPreview.total} · Sendable: {campaignPreview.sendable} · Skipped: {campaignPreview.skipped}
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
                  {item.to_email} · {item.status}
                </p>
                <p className="text-xs text-neutral-500">
                  attempts {item.attempts}/{item.max_attempts} · next {new Date(item.next_attempt_at).toLocaleString()}
                </p>
                {item.last_error && <p className="text-xs text-red-600">{item.last_error}</p>}
              </div>
              <div className="flex gap-2">
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
              <p className="text-sm font-medium">
                {item.to_email} · {item.status} · {item.classification}
              </p>
              <p className="text-xs text-neutral-500">
                Created {new Date(item.created_at).toLocaleString()}
                {item.sent_at ? ` · Sent ${new Date(item.sent_at).toLocaleString()}` : ''}
              </p>
              <p className="text-xs text-neutral-700">{item.subject}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Dispatch Settings</h3>
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
            <Button onClick={handleSaveSetup}>Save Setup</Button>
          </Card>
          <Card className="p-4 space-y-2">
            <h3 className="text-lg font-medium">Suppression List</h3>
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
                      {item.reason} · {item.source}
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
    </div>
  );
}
