'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerMessage } from '@/lib/types';

interface MessagingPanelProps {
  className?: string;
}

export function MessagingPanel({ className }: MessagingPanelProps) {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
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
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !messageText.trim()) {
      setError('Subject and message are required');
      return;
    }

    try {
      setIsSubmitting(true);
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
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setSubject('');
      setMessageText('');
      setMessages([data.message, ...messages]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* New Message Form */}
      <div className="glass-mobile rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Send us a message</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Type</label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="support">Support</option>
              <option value="inquiry">Inquiry</option>
              <option value="complaint">Complaint</option>
              <option value="feedback">Feedback</option>
              <option value="referral_question">Referral Question</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Question about order #12345"
              className="bg-white/10 border-white/20 text-white placeholder-white/40"
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Message</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Tell us what's on your mind..."
              className="w-full h-32 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg flex items-center gap-2 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/20 border border-green-400/50 rounded-lg flex items-center gap-2 text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Message sent successfully!</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Your Messages</h3>

        {isLoading ? (
          <div className="text-center py-8 text-white/60">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-white/60">No messages yet</div>
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
                    <p className="text-sm text-gray-600 capitalize">{msg.message_type}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-gray-700 text-sm mb-3">{msg.message}</p>

              {/* Status Badge */}
              <span className={cn(
                'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                msg.status === 'open' && 'bg-yellow-100 text-yellow-800',
                msg.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                msg.status === 'resolved' && 'bg-green-100 text-green-800',
                msg.status === 'closed' && 'bg-gray-100 text-gray-800',
              )}>
                {msg.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
