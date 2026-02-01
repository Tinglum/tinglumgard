'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerMessage, MessageReply } from '@/lib/types';

interface MessagingPanelProps {
  className?: string;
  variant?: 'light' | 'dark';
}

type CustomerMessageWithReplies = CustomerMessage & { message_replies?: MessageReply[] };

export function MessagingPanel({ className, variant = 'light' }: MessagingPanelProps) {
  const [messages, setMessages] = useState<CustomerMessageWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'support' | 'inquiry' | 'complaint' | 'feedback' | 'referral_question'>('support');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const loadedMessages = data.messages || [];
      setMessages(loadedMessages);

      // Mark all messages as viewed
      if (loadedMessages.length > 0) {
        markMessagesAsViewed(loadedMessages.map((m: CustomerMessageWithReplies) => m.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste meldinger');
    } finally {
      setIsLoading(false);
    }
  }

  async function markMessagesAsViewed(messageIds: string[]) {
    try {
      await fetch('/api/messages/unread-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
    } catch (error) {
      console.error('Failed to mark messages as viewed:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !messageText.trim()) {
      setError('Emne og melding må fylles ut');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        subject: subject.trim(),
        message: messageText.trim(),
        message_type: messageType,
      };

      console.log('Sending message:', JSON.stringify(payload, null, 2));

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', JSON.stringify(data, null, 2));

      if (!res.ok) {
        console.error('API Error:', data.error, data.details);
        throw new Error(data.details || data.error);
      }

      setSuccess(true);
      setSubject('');
      setMessageText('');
      setMessages((prev) => [data.message, ...prev]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Full error:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke sende melding');
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeLabels = {
    support: 'Support',
    inquiry: 'Spørsmål',
    complaint: 'Klage',
    feedback: 'Tilbakemelding',
    referral_question: 'Vennerabatt',
  };

  const statusLabels = {
    open: 'Åpen',
    in_progress: 'Under behandling',
    resolved: 'Løst',
    closed: 'Lukket',
  };

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
      {/* New Message Form */}
      <div
        className={cn(
          'rounded-2xl p-6 border',
          isDark ? 'glass-mobile border-white/20' : 'bg-white border-gray-200'
        )}
      >
        <h3 className={cn('text-xl font-semibold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
          Send oss en melding
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message Type */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              Kategori
            </label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as any)}
              className={cn(
                'w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400',
                isDark
                  ? 'bg-white/10 border border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
            >
              <option value="support">Support</option>
              <option value="inquiry">Spørsmål</option>
              <option value="complaint">Klage</option>
              <option value="feedback">Tilbakemelding</option>
              <option value="referral_question">Vennerabatt</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              Emne
            </label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="f.eks. Spørsmål om ordre #12345"
              className={cn(
                isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white/80' : 'text-gray-700')}>
              Melding
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Hva kan vi hjelpe deg med?"
              className={cn(
                'w-full h-32 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none',
                isDark
                  ? 'bg-white/10 border border-white/20 text-white placeholder-white/40'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              )}
              disabled={isSubmitting}
            />
          </div>

          {/* Error/Success Messages */}
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
              <span className="text-sm">Meldingen er sendt!</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Sender...' : 'Send melding'}
          </Button>
        </form>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
          Dine meldinger
        </h3>

        {isLoading ? (
          <div className={cn('text-center py-8', isDark ? 'text-white/60' : 'text-gray-500')}>
            Laster meldinger...
          </div>
        ) : messages.length === 0 ? (
          <div className={cn('text-center py-8', isDark ? 'text-white/60' : 'text-gray-500')}>
            Ingen meldinger ennå
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
                    <p className="text-sm text-gray-600">{typeLabels[msg.message_type]}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-gray-700 text-sm mb-3">{msg.message}</p>

              {msg.message_replies && msg.message_replies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.message_replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={cn(
                        'rounded-lg border p-3',
                        isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className={cn('text-xs font-semibold', isDark ? 'text-white/80' : 'text-gray-700')}>
                          Svar fra Tinglum Gård
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.created_at).toLocaleDateString('nb-NO', {
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
                  ))}
                </div>
              )}

              {/* Status Badge */}
              <span className={cn(
                'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                msg.status === 'open' && 'bg-yellow-100 text-yellow-800',
                msg.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                msg.status === 'resolved' && 'bg-green-100 text-green-800',
                msg.status === 'closed' && 'bg-gray-100 text-gray-800',
              )}>
                {statusLabels[msg.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
