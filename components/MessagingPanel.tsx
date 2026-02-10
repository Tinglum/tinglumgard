'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomerMessage, MessageReply } from '@/lib/types';

interface MessagingPanelProps {
  className?: string;
  variant?: 'light' | 'dark';
}

type CustomerMessageWithReplies = CustomerMessage & { message_replies?: MessageReply[] };

export function MessagingPanel({ className, variant = 'light' }: MessagingPanelProps) {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const copy = {
    loadError: t.customerMessagingPanel.loadError,
    emptyReplyTitle: t.customerMessagingPanel.emptyReplyTitle,
    emptyReplyDescription: t.customerMessagingPanel.emptyReplyDescription,
    replySentTitle: t.customerMessagingPanel.replySentTitle,
    replySentDescription: t.customerMessagingPanel.replySentDescription,
    errorTitle: t.customerMessagingPanel.errorTitle,
    sendReplyFailed: t.customerMessagingPanel.sendReplyFailed,
    missingInfoTitle: t.customerMessagingPanel.missingInfoTitle,
    missingInfoDescription: t.customerMessagingPanel.missingInfoDescription,
    messageSentTitle: t.customerMessagingPanel.messageSentTitle,
    messageSentDescription: t.customerMessagingPanel.messageSentDescription,
    sendFailedTitle: t.customerMessagingPanel.sendFailedTitle,
    sendFailedDescription: t.customerMessagingPanel.sendFailedDescription,
    panelTitle: t.customerMessagingPanel.panelTitle,
    category: t.customerMessagingPanel.category,
    subject: t.customerMessagingPanel.subject,
    message: t.customerMessagingPanel.message,
    subjectPlaceholder: t.customerMessagingPanel.subjectPlaceholder,
    messagePlaceholder: t.customerMessagingPanel.messagePlaceholder,
    successMessage: t.customerMessagingPanel.successMessage,
    sending: t.customerMessagingPanel.sending,
    sendMessage: t.customerMessagingPanel.sendMessage,
    yourMessages: t.customerMessagingPanel.yourMessages,
    loadingMessages: t.customerMessagingPanel.loadingMessages,
    noMessages: t.customerMessagingPanel.noMessages,
    fromYou: t.customerMessagingPanel.fromYou,
    fromFarm: t.customerMessagingPanel.fromFarm,
    replyPlaceholder: t.customerMessagingPanel.replyPlaceholder,
    categories: {
      support: t.customerMessagingPanel.categorySupport,
      inquiry: t.customerMessagingPanel.categoryInquiry,
      complaint: t.customerMessagingPanel.categoryComplaint,
      feedback: t.customerMessagingPanel.categoryFeedback,
      referral_question: t.customerMessagingPanel.categoryReferralQuestion,
    },
    statuses: {
      open: t.customerMessagingPanel.statusOpen,
      in_progress: t.customerMessagingPanel.statusInProgress,
      resolved: t.customerMessagingPanel.statusResolved,
      closed: t.customerMessagingPanel.statusClosed,
    },
  };

  const [messages, setMessages] = useState<CustomerMessageWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'support' | 'inquiry' | 'complaint' | 'feedback' | 'referral_question'>('support');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const markMessagesAsViewed = useCallback(async (messageIds: string[]) => {
    try {
      await fetch('/api/messages/unread-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
    } catch (markError) {
      console.error('Failed to mark messages as viewed:', markError);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const loadedMessages = data.messages || [];
      setMessages(loadedMessages);

      if (loadedMessages.length > 0) {
        markMessagesAsViewed(loadedMessages.map((message: CustomerMessageWithReplies) => message.id));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, markMessagesAsViewed]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function handleReply(messageId: string) {
    const replyText = replyTexts[messageId];
    if (!replyText?.trim()) {
      toast({
        title: copy.emptyReplyTitle,
        description: copy.emptyReplyDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      setReplyingTo(messageId);

      const res = await fetch(`/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      toast({
        title: copy.replySentTitle,
        description: copy.replySentDescription,
      });

      setReplyTexts((prev) => ({ ...prev, [messageId]: '' }));
      await loadMessages();
    } catch (replyError) {
      toast({
        title: copy.errorTitle,
        description: replyError instanceof Error ? replyError.message : copy.sendReplyFailed,
        variant: 'destructive',
      });
    } finally {
      setReplyingTo(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!subject.trim() || !messageText.trim()) {
      toast({
        title: copy.missingInfoTitle,
        description: copy.missingInfoDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccess(false);
      setError(null);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: messageText.trim(),
          message_type: messageType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error);
      }

      toast({
        title: copy.messageSentTitle,
        description: copy.messageSentDescription,
      });

      setSubject('');
      setMessageText('');
      setSuccess(true);
      setMessages((prev) => [data.message, ...prev]);
    } catch (submitError) {
      toast({
        title: copy.sendFailedTitle,
        description: submitError instanceof Error ? submitError.message : copy.sendFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusColors = {
    open: 'bg-yellow-50 border-yellow-200',
    in_progress: 'bg-blue-50 border-blue-200',
    resolved: 'bg-green-50 border-green-200',
    closed: 'bg-gray-50 border-gray-200',
  };

  const statusIcons = {
    open: <AlertCircle className="h-4 w-4 text-yellow-600" />,
    in_progress: <MessageSquare className="h-4 w-4 text-blue-600" />,
    resolved: <CheckCircle className="h-4 w-4 text-green-600" />,
    closed: <CheckCircle className="h-4 w-4 text-gray-600" />,
  };

  const isDark = variant === 'dark';

  return (
    <div className={cn('space-y-6', className)}>
      <div
        className={cn(
          'rounded-2xl p-6 border',
          isDark ? 'glass-mobile border-white/20' : 'bg-white border-gray-200'
        )}
      >
        <h3 className={cn('text-xl font-semibold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
          {copy.panelTitle}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              {copy.category}
            </label>
            <select
              value={messageType}
              onChange={(event) => setMessageType(event.target.value as typeof messageType)}
              className={cn(
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400',
                isDark
                  ? 'bg-white/10 border border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
            >
              <option value="support">{copy.categories.support}</option>
              <option value="inquiry">{copy.categories.inquiry}</option>
              <option value="complaint">{copy.categories.complaint}</option>
              <option value="feedback">{copy.categories.feedback}</option>
              <option value="referral_question">{copy.categories.referral_question}</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              {copy.subject}
            </label>
            <Input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={copy.subjectPlaceholder}
              className={cn(
                isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              {copy.message}
            </label>
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={copy.messagePlaceholder}
              className={cn(
                'w-full h-32 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none',
                isDark
                  ? 'bg-white/10 border border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div
              className={cn(
                'p-3 rounded-lg flex items-center gap-2',
                isDark
                  ? 'bg-red-500/20 border border-red-400/50 text-red-200'
                  : 'bg-red-50 border border-red-200 text-red-700'
              )}
            >
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div
              className={cn(
                'p-3 rounded-lg flex items-center gap-2',
                isDark
                  ? 'bg-green-500/20 border border-green-400/50 text-green-200'
                  : 'bg-green-50 border border-green-200 text-green-700'
              )}
            >
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{copy.successMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {copy.sending}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {copy.sendMessage}
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
          {copy.yourMessages}
        </h3>

        {isLoading ? (
          <div className={cn('text-center py-8', isDark ? 'text-white/60' : 'text-gray-500')}>
            {copy.loadingMessages}
          </div>
        ) : messages.length === 0 ? (
          <div className={cn('text-center py-8', isDark ? 'text-white/60' : 'text-gray-500')}>
            {copy.noMessages}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('rounded-lg p-4 border', statusColors[msg.status as keyof typeof statusColors])}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {statusIcons[msg.status as keyof typeof statusIcons]}
                  <div>
                    <h4 className="font-semibold text-gray-900">{msg.subject}</h4>
                    <p className="text-sm text-gray-600">
                      {copy.categories[msg.message_type as keyof typeof copy.categories]}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString(locale)}
                </span>
              </div>

              <p className="text-gray-700 text-sm mb-3">{msg.message}</p>

              {msg.message_replies && msg.message_replies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.message_replies
                    .filter((reply) => !reply.is_internal)
                    .map((reply) => {
                      const isFromCustomer = (reply as any).is_from_customer;
                      return (
                        <div
                          key={reply.id}
                          className={cn(
                            'rounded-lg border p-3',
                            isFromCustomer
                              ? isDark
                                ? 'bg-blue-900/30 border-blue-500/30 text-white ml-4'
                                : 'bg-blue-50 border-blue-200 ml-4'
                              : isDark
                                ? 'bg-white/10 border-white/20 text-white mr-4'
                                : 'bg-white border-gray-200 mr-4'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className={cn('text-xs font-semibold', isDark ? 'text-white/80' : 'text-gray-700')}>
                              {isFromCustomer ? copy.fromYou : copy.fromFarm}
                            </p>
                            <span className="text-xs text-gray-500">
                              {new Date(reply.created_at).toLocaleDateString(locale, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className={cn('text-sm whitespace-pre-wrap', isDark ? 'text-white/90' : 'text-gray-700')}>
                            {reply.reply_text}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}

              {msg.status !== 'closed' && (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={copy.replyPlaceholder}
                      value={replyTexts[msg.id] || ''}
                      onChange={(event) => setReplyTexts((prev) => ({ ...prev, [msg.id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleReply(msg.id);
                        }
                      }}
                      disabled={replyingTo === msg.id}
                      className={cn(
                        'flex-1',
                        isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                      )}
                    />
                    <Button
                      onClick={() => handleReply(msg.id)}
                      disabled={replyingTo === msg.id || !replyTexts[msg.id]?.trim()}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {replyingTo === msg.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <span
                className={cn(
                  'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                  msg.status === 'open' && 'bg-yellow-100 text-yellow-800',
                  msg.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                  msg.status === 'resolved' && 'bg-green-100 text-green-800',
                  msg.status === 'closed' && 'bg-gray-100 text-gray-800'
                )}
              >
                {copy.statuses[msg.status as keyof typeof copy.statuses]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
