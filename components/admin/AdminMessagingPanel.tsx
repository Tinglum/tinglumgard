"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, X, Clock, AlertCircle, CheckCircle, MessageSquare, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageReply {
  id: string;
  message_id: string;
  admin_name: string | null;
  reply_text: string;
  is_internal?: boolean;
  is_from_customer?: boolean;
  source?: string | null;
  email_message_id?: string | null;
  created_at: string;
}

interface MessageEmailDebugEvent {
  id: string;
  direction: 'inbound' | 'outbound';
  event_type: string;
  match_status?: 'matched' | 'unmatched' | 'error' | null;
  match_strategy?: string | null;
  sender_email?: string | null;
  recipient_email?: string | null;
  email_subject?: string | null;
  provider_message_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

interface CustomerMessage {
  id: string;
  customer_phone?: string | null;
  customer_name?: string;
  customer_email?: string | null;
  subject: string;
  message: string;
  message_type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  initiated_by?: 'customer' | 'admin';
  initiated_by_admin_name?: string | null;
  email_thread_id?: string | null;
  created_at: string;
  updated_at?: string;
  message_replies?: MessageReply[];
  email_debug_events?: MessageEmailDebugEvent[];
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';

interface AdminMessagingPanelProps {
  initialMessageId?: string | null;
  onStatsChange?: (stats: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    attention_required?: number;
  }) => void;
  onNavigateToCustomer?: (customerId: string) => void;
}

export function AdminMessagingPanel({
  initialMessageId = null,
  onStatsChange,
  onNavigateToCustomer,
}: AdminMessagingPanelProps) {
  const { t, lang } = useLanguage();
  const copy = t.adminMessagingPanel;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessageDetail = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`);
      const data = await response.json();
      if (response.ok && data.message) {
        setSelectedMessage(data.message);
        return data.message as CustomerMessage;
      }
    } catch (error) {
      console.error('Failed to load message detail:', error);
    }
    return null;
  }, []);

  const loadMessages = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (initialMessageId) params.append('messageId', initialMessageId);

      const response = await fetch(`/api/admin/messages?${params.toString()}`);
      const data = await response.json();
      setMessages(data.messages || []);
      if (data.stats) {
        setStats(data.stats);
        onStatsChange?.(data.stats);
      }
      return data.messages || [];
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [initialMessageId, onStatsChange, priorityFilter, statusFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (selectedMessage) {
        await loadMessageDetail(selectedMessage.id);
        await loadMessages(false);
      } else {
        await loadMessages(false);
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadMessageDetail, loadMessages, selectedMessage]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessage?.message_replies]);

  const openMessage = useCallback(async (message: CustomerMessage) => {
    setSelectedMessage(message);
    setDebugOpen(false);
    await loadMessageDetail(message.id);
    await loadMessages(false);
  }, [loadMessageDetail, loadMessages]);

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
        await loadMessages();
        await loadMessageDetail(selectedMessage.id);
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
        await loadMessages();
        await loadMessageDetail(selectedMessage.id);
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
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerDisplayName = (message: CustomerMessage) =>
    message.customer_name || message.customer_email || message.customer_phone || copy.customerFallback;

  const resolveCustomerId = (message: CustomerMessage): string | null => {
    if (message.customer_email) return `email:${message.customer_email}`;
    if (message.customer_phone) {
      const digits = message.customer_phone.replace(/\D/g, '').replace(/^47/, '');
      if (digits) return `phone:${digits}`;
    }
    return null;
  };

  const handleCustomerClick = (message: CustomerMessage) => {
    const customerId = resolveCustomerId(message);
    if (customerId && onNavigateToCustomer) {
      onNavigateToCustomer(customerId);
    }
  };

  const getRootSenderName = (message: CustomerMessage) =>
    message.initiated_by === 'admin'
      ? message.initiated_by_admin_name || copy.farmSender
      : getCustomerDisplayName(message);

  const getRootSenderInitial = (message: CustomerMessage) =>
    getRootSenderName(message).trim().charAt(0).toUpperCase() || copy.customerFallback.charAt(0).toUpperCase();

  const getSortedReplies = (message: CustomerMessage) =>
    [...(message.message_replies || [])]
      .filter((reply) => !reply.is_internal)
      .sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );

  const getLatestReply = (message: CustomerMessage) => {
    const replies = getSortedReplies(message);
    return replies.length > 0 ? replies[replies.length - 1] : null;
  };

  const getLatestPreviewText = (message: CustomerMessage) => {
    const latestReply = getLatestReply(message);
    return latestReply?.reply_text || message.message;
  };

  const getLatestPreviewSender = (message: CustomerMessage) => {
    const latestReply = getLatestReply(message);
    if (!latestReply) {
      return getRootSenderName(message);
    }

    if (latestReply.is_from_customer) {
      return latestReply.admin_name || getCustomerDisplayName(message);
    }

    return copy.farmSender;
  };

  const getLatestPreviewDate = (message: CustomerMessage) => {
    const latestReply = getLatestReply(message);
    return latestReply?.created_at || message.updated_at || message.created_at;
  };

  const formatDebugLabel = (value: string) =>
    value
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

  const getEmailDebugStatusClasses = (status?: string | null) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'unmatched':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const formatDebugDetails = (details?: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) {
      return '';
    }

    return JSON.stringify(details, null, 2);
  };

  const filteredMessages = messages.filter(msg => {
    const statusMatch = statusFilter === 'all' || msg.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || msg.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  useEffect(() => {
    if (!initialMessageId || !messages.length) return;
    if (selectedMessage?.id === initialMessageId) return;
    const deepLinkedMessage = messages.find((message) => message.id === initialMessageId);
    if (deepLinkedMessage) {
      void openMessage(deepLinkedMessage);
    }
  }, [initialMessageId, messages, openMessage, selectedMessage?.id]);

  if (!selectedMessage) {
    return (
      <div className="space-y-6">
        {/* Stats */}
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

        {/* Filters */}
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
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Messages List */}
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
            filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className={cn(
                  'p-4 cursor-pointer hover:shadow-lg transition-shadow',
                  getPriorityColor(msg.priority)
                )}
                onClick={() => void openMessage(msg)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                    <p className="text-sm text-gray-600">
                      {onNavigateToCustomer && resolveCustomerId(msg) ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          onClick={(e) => { e.stopPropagation(); handleCustomerClick(msg); }}
                        >
                          {getCustomerDisplayName(msg)}
                        </button>
                      ) : (
                        getCustomerDisplayName(msg)
                      )}
                    </p>
                    {(msg.customer_email || msg.customer_phone) && (
                      <p className="text-xs text-gray-500">
                        {[msg.customer_email, msg.customer_phone].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', getStatusColor(msg.status))}>
                      {getStatusIcon(msg.status)}
                      {t.messaging[msg.status as keyof typeof t.messaging]}
                    </span>
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">{getLatestPreviewSender(msg)}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{getLatestPreviewText(msg)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-200 px-2 py-1 rounded">{msg.message_type}</span>
                  <span>{formatDate(getLatestPreviewDate(msg))}</span>
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
        {copy.backToMessages}
      </button>

      {/* Message Detail Card */}
      <Card className={cn('p-6', getPriorityColor(selectedMessage.priority))}>
        <div className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedMessage.subject}</h2>
              <p className="text-gray-600">
                {onNavigateToCustomer && resolveCustomerId(selectedMessage) ? (
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    onClick={() => handleCustomerClick(selectedMessage)}
                  >
                    {getCustomerDisplayName(selectedMessage)}
                  </button>
                ) : (
                  getCustomerDisplayName(selectedMessage)
                )}
              </p>
              {(selectedMessage.customer_email || selectedMessage.customer_phone) && (
                <p className="text-xs text-gray-500">
                  {[selectedMessage.customer_email, selectedMessage.customer_phone].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2', getStatusColor(selectedMessage.status))}>
                {getStatusIcon(selectedMessage.status)}
                {t.messaging[selectedMessage.status as keyof typeof t.messaging]}
              </span>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('resolved')}
                disabled={selectedMessage.status === 'resolved'}
              >
                {copy.markResolved}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
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
            <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
          </div>
        </div>
      </Card>

      {/* Conversation Thread */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{copy.conversation}</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {/* Original Message */}
          <div className="flex gap-3">
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                selectedMessage.initiated_by === 'admin' ? 'bg-green-100' : 'bg-blue-100'
              )}
            >
              <span
                className={cn(
                  'text-xs font-bold',
                  selectedMessage.initiated_by === 'admin' ? 'text-green-600' : 'text-blue-600'
                )}
              >
                {getRootSenderInitial(selectedMessage)}
              </span>
            </div>
            <div className="flex-1">
              <div
                className={cn(
                  'p-3 rounded-xl border',
                  selectedMessage.initiated_by === 'admin'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-semibold mb-1',
                    selectedMessage.initiated_by === 'admin' ? 'text-green-600' : 'text-blue-600'
                  )}
                >
                  {getRootSenderName(selectedMessage)}
                </p>
                <p className="text-gray-800">{selectedMessage.message}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatDate(selectedMessage.created_at)}</p>
            </div>
          </div>

          {/* Replies */}
          {selectedMessage.message_replies && selectedMessage.message_replies.length > 0 && (
            <>
              {getSortedReplies(selectedMessage).map((reply) => {
                const isFromCustomer = (reply as any).is_from_customer;
                return (
                  <div key={reply.id} className="flex gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      isFromCustomer ? "bg-blue-100" : "bg-green-100"
                    )}>
                      <span className={cn(
                        "text-xs font-bold",
                        isFromCustomer ? "text-blue-600" : "text-green-600"
                      )}>
                        {isFromCustomer
                          ? getCustomerDisplayName(selectedMessage).charAt(0).toUpperCase()
                          : copy.farmSender.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        "p-3 rounded-xl border",
                        isFromCustomer ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
                      )}>
                        <p className={cn(
                          "text-xs font-semibold mb-1",
                          isFromCustomer ? "text-blue-600" : "text-green-600"
                        )}>
                          {isFromCustomer ? reply.admin_name || getCustomerDisplayName(selectedMessage) : copy.farmSender}
                        </p>
                        <p className="text-gray-800">{reply.reply_text}</p>
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

      {/* Email Debug Trail */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setDebugOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-500">{copy.emailDebugTitle}</span>
          {debugOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          )}
        </button>
        {debugOpen && <div className="px-6 pb-6 border-t border-gray-100 pt-4">
        {selectedMessage.email_debug_events && selectedMessage.email_debug_events.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {selectedMessage.email_debug_events.map((event) => {
              const detailText = formatDebugDetails(event.details);
              return (
                <div key={event.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{formatDebugLabel(event.event_type)}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700">
                        {event.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                      </span>
                      {event.match_status && (
                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getEmailDebugStatusClasses(event.match_status))}>
                          {formatDebugLabel(event.match_status)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {event.match_strategy && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">{copy.emailDebugStrategyLabel}</p>
                        <p className="text-gray-800">{formatDebugLabel(event.match_strategy)}</p>
                      </div>
                    )}
                    {event.sender_email && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">{copy.emailDebugSenderLabel}</p>
                        <p className="text-gray-800 break-all">{event.sender_email}</p>
                      </div>
                    )}
                    {event.recipient_email && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">{copy.emailDebugRecipientLabel}</p>
                        <p className="text-gray-800 break-all">{event.recipient_email}</p>
                      </div>
                    )}
                    {event.email_subject && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">{copy.emailDebugSubjectLabel}</p>
                        <p className="text-gray-800">{event.email_subject}</p>
                      </div>
                    )}
                    {event.provider_message_id && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">{copy.emailDebugProviderIdLabel}</p>
                        <p className="text-gray-800 break-all">{event.provider_message_id}</p>
                      </div>
                    )}
                  </div>
                  {detailText && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">{copy.emailDebugDetailsLabel}</p>
                      <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-gray-700 border border-gray-200 whitespace-pre-wrap break-words">
                        {detailText}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{copy.emailDebugEmpty}</p>
        )}
        </div>}
      </Card>

      {/* Reply Form */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.messaging.sendReply}</h3>
        <div className="space-y-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t.messaging.replyPlaceholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setSelectedMessage(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyText.trim() || replyLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {replyLoading ? t.messaging.sendingBroadcast : t.messaging.sendReply}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
