"use client";

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, X, Clock, AlertCircle, CheckCircle, MessageSquare, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReply {
  id: string;
  message_id: string;
  admin_name: string;
  reply_text: string;
  created_at: string;
}

interface CustomerMessage {
  id: string;
  customer_phone: string;
  customer_name?: string;
  subject: string;
  message: string;
  message_type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  message_replies?: MessageReply[];
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';

export function AdminMessagingPanel() {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('support');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [recipientMode, setRecipientMode] = useState<'all' | 'manual' | 'filters'>('all');
  const [clients, setClients] = useState<Array<{ phone: string; name?: string; email?: string }>>([]);
  const [extras, setExtras] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Array<{ phone: string; name?: string; email?: string }>>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [filterAwaitingFinalPayment, setFilterAwaitingFinalPayment] = useState(false);
  const [filterBoxSize, setFilterBoxSize] = useState<'all' | '8' | '12'>('all');
  const [filterHasExtras, setFilterHasExtras] = useState(false);
  const [filterExtraIds, setFilterExtraIds] = useState<string[]>([]);
  const [previewRecipients, setPreviewRecipients] = useState<Array<{ phone: string; name?: string; email?: string }>>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [excludedPhones, setExcludedPhones] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
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
  };

  useEffect(() => {
    loadMessages();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    const loadRecipients = async () => {
      try {
        const response = await fetch('/api/admin/messages/recipients?include=clients,extras');
        const data = await response.json();
        setClients(data.clients || []);
        setExtras(data.extras || []);
      } catch (error) {
        console.error('Failed to load recipients:', error);
      }
    };

    loadRecipients();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessage?.message_replies]);

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
        const updated = updatedMessages.find((m: CustomerMessage) => m.id === selectedMessage.id);
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
        const updated = updatedMessages.find((m: CustomerMessage) => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) return;

    try {
      setBroadcastLoading(true);
      setBroadcastError(null);
      setBroadcastSuccess(false);

      const response = await fetch('/api/admin/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
          message_type: broadcastType,
          mode: recipientMode,
          recipients: selectedRecipients.map((r) => r.phone),
          excludedPhones,
          filters: {
            awaitingFinalPayment: filterAwaitingFinalPayment,
            boxSize: filterBoxSize !== 'all' ? Number(filterBoxSize) : null,
            hasExtras: filterHasExtras,
            extraIds: filterExtraIds,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send broadcast');
      }

      setBroadcastSubject('');
      setBroadcastMessage('');
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
      await loadMessages();
    } catch (error) {
      setBroadcastError(error instanceof Error ? error.message : 'Failed to send broadcast');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handlePreviewRecipients = async () => {
    try {
      setPreviewLoading(true);
      const params = new URLSearchParams();
      params.set('include', 'preview');
      if (filterAwaitingFinalPayment) params.set('awaitingFinalPayment', 'true');
      if (filterBoxSize !== 'all') params.set('boxSize', filterBoxSize);
      if (filterHasExtras) params.set('hasExtras', 'true');
      if (filterExtraIds.length > 0) params.set('extraIds', filterExtraIds.join(','));
      if (excludedPhones.length > 0) params.set('excludePhones', excludedPhones.join(','));

      const response = await fetch(`/api/admin/messages/recipients?${params.toString()}`);
      const data = await response.json();
      setPreviewRecipients(data.recipients || []);
      setPreviewCount(data.count || 0);
    } catch (error) {
      console.error('Failed to preview recipients:', error);
    } finally {
      setPreviewLoading(false);
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
    return date.toLocaleString('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredMessages = messages.filter(msg => {
    const statusMatch = statusFilter === 'all' || msg.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || msg.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const selectedPhones = new Set(selectedRecipients.map((r) => r.phone));
  const filteredClientOptions = clients
    .filter((c) => !selectedPhones.has(c.phone))
    .filter((c) => {
      const term = recipientSearch.trim().toLowerCase();
      if (!term) return true;
      return (
        c.phone.toLowerCase().includes(term) ||
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    });

  if (!selectedMessage) {
    return (
      <div className="space-y-6">
        {/* Broadcast */}
        <Card className="p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send message</h3>
              <p className="text-sm text-gray-600">Choose recipients and send a message to their inbox.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={recipientMode === 'all' ? 'default' : 'outline'}
              onClick={() => setRecipientMode('all')}
            >
              All clients
            </Button>
            <Button
              variant={recipientMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setRecipientMode('manual')}
            >
              Select clients
            </Button>
            <Button
              variant={recipientMode === 'filters' ? 'default' : 'outline'}
              onClick={() => setRecipientMode('filters')}
            >
              Filters
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="support">Support</option>
                <option value="inquiry">Inquiry</option>
                <option value="complaint">Complaint</option>
                <option value="feedback">Feedback</option>
                <option value="referral_question">Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Write your announcement..."
              />
            </div>

            {recipientMode === 'all' && (
              <div className="text-sm text-gray-600">
                This will send to all clients ({clients.length}).
              </div>
            )}

            {recipientMode === 'manual' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <input
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Search by name, phone, or email"
                  />
                  <select
                    value={selectedClientPhone}
                    onChange={(e) => setSelectedClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select client</option>
                    {filteredClientOptions.map((client) => (
                      <option key={client.phone} value={client.phone}>
                        {client.name || client.phone} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const client = clients.find((c) => c.phone === selectedClientPhone);
                      if (!client || selectedPhones.has(client.phone)) return;
                      setSelectedRecipients((prev) => [...prev, client]);
                      setSelectedClientPhone('');
                    }}
                    disabled={!selectedClientPhone}
                  >
                    Add recipient
                  </Button>
                </div>

                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map((client) => (
                      <span key={client.phone} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-sm">
                        {client.name || client.phone}
                        <button
                          className="text-gray-500 hover:text-gray-900"
                          onClick={() => setSelectedRecipients((prev) => prev.filter((c) => c.phone !== client.phone))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRecipients([])}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}

            {recipientMode === 'filters' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterAwaitingFinalPayment}
                      onChange={(e) => setFilterAwaitingFinalPayment(e.target.checked)}
                    />
                    Waiting for final payment
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Box size</label>
                    <select
                      value={filterBoxSize}
                      onChange={(e) => setFilterBoxSize(e.target.value as 'all' | '8' | '12')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">All</option>
                      <option value="8">8kg</option>
                      <option value="12">12kg</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterHasExtras}
                      onChange={(e) => setFilterHasExtras(e.target.checked)}
                    />
                    Has extras
                  </label>
                </div>

                {extras.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extras filter</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {extras.map((extra) => (
                        <label key={extra.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={filterExtraIds.includes(extra.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterExtraIds((prev) => [...prev, extra.id]);
                              } else {
                                setFilterExtraIds((prev) => prev.filter((id) => id !== extra.id));
                              }
                            }}
                          />
                          {extra.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handlePreviewRecipients}>
                    {previewLoading ? 'Loading...' : 'Preview recipients'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterAwaitingFinalPayment(false);
                      setFilterBoxSize('all');
                      setFilterHasExtras(false);
                      setFilterExtraIds([]);
                      setPreviewRecipients([]);
                      setPreviewCount(0);
                      setExcludedPhones([]);
                    }}
                  >
                    Reset filters
                  </Button>
                  <span className="text-sm text-gray-600">Matched: {previewCount}</span>
                </div>

                {excludedPhones.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {excludedPhones.map((phone) => (
                      <span key={phone} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-50 text-sm text-red-700">
                        {phone}
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => setExcludedPhones((prev) => prev.filter((p) => p !== phone))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {previewRecipients.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 max-h-56 overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-2">Preview (first {previewRecipients.length})</p>
                    <div className="space-y-2">
                      {previewRecipients.map((client) => (
                        <div key={client.phone} className="flex items-center justify-between text-sm">
                          <span>{client.name || client.phone} {client.email ? `(${client.email})` : ''}</span>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (excludedPhones.includes(client.phone)) return;
                              setExcludedPhones((prev) => [...prev, client.phone]);
                            }}
                          >
                            Exclude
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {broadcastError && (
              <p className="text-sm text-red-600">{broadcastError}</p>
            )}
            {broadcastSuccess && (
              <p className="text-sm text-green-600">Broadcast sent</p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleBroadcast}
                disabled={!broadcastSubject.trim() || !broadcastMessage.trim() || broadcastLoading || (recipientMode === 'manual' && selectedRecipients.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {broadcastLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
            <div className="text-sm text-blue-700">Total Messages</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="text-3xl font-bold text-red-900">{stats.open}</div>
            <div className="text-sm text-red-700">Open</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="text-3xl font-bold text-yellow-900">{stats.in_progress}</div>
            <div className="text-sm text-yellow-700">In Progress</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-3xl font-bold text-green-900">{stats.resolved}</div>
            <div className="text-sm text-green-700">Resolved</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Messages List */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Loading messages...</p>
            </Card>
          ) : filteredMessages.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No messages found</p>
            </Card>
          ) : (
            filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className={cn(
                  'p-4 cursor-pointer hover:shadow-lg transition-shadow',
                  getPriorityColor(msg.priority)
                )}
                onClick={() => setSelectedMessage(msg)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                    <p className="text-sm text-gray-600">{msg.customer_name || msg.customer_phone}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', getStatusColor(msg.status))}>
                      {getStatusIcon(msg.status)}
                      {msg.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">{msg.message}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-200 px-2 py-1 rounded">{msg.message_type}</span>
                  <span>{formatDate(msg.created_at)}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={() => setSelectedMessage(null)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
      >
        <X className="w-5 h-5" />
        Back to Messages
      </button>

      {/* Message Detail Card */}
      <Card className={cn('p-6', getPriorityColor(selectedMessage.priority))}>
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedMessage.subject}</h2>
              <p className="text-gray-600">{selectedMessage.customer_name || selectedMessage.customer_phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2', getStatusColor(selectedMessage.status))}>
                {getStatusIcon(selectedMessage.status)}
                {selectedMessage.status.replace('_', ' ')}
              </span>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('resolved')}
                disabled={selectedMessage.status === 'resolved'}
              >
                Mark resolved
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600">Type:</span>
              <p className="font-semibold text-gray-900">{selectedMessage.message_type}</p>
            </div>
            <div>
              <span className="text-gray-600">Priority:</span>
              <p className="font-semibold capitalize text-gray-900">{selectedMessage.priority}</p>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <p className="font-semibold text-gray-900">{formatDate(selectedMessage.created_at)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
          </div>
        </div>
      </Card>

      {/* Conversation Thread */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Conversation</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {/* Original Message */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">C</span>
            </div>
            <div className="flex-1">
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 mb-1">{selectedMessage.customer_name || 'Customer'}</p>
                <p className="text-gray-800">{selectedMessage.message}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatDate(selectedMessage.created_at)}</p>
            </div>
          </div>

          {/* Replies */}
          {selectedMessage.message_replies && selectedMessage.message_replies.length > 0 && (
            <>
              {selectedMessage.message_replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">A</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-600 mb-1">{reply.admin_name}</p>
                      <p className="text-gray-800">{reply.reply_text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(reply.created_at)}</p>
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Reply Form */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Send Reply</h3>
        <div className="space-y-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setSelectedMessage(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyText.trim() || replyLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {replyLoading ? 'Sending...' : 'Send Reply'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
