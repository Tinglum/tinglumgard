export type EmailClassification = 'transactional' | 'support' | 'promotional' | 'system';

export type EmailQueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'dead'
  | 'cancelled';

export type EmailFlowMode = 'shadow' | 'active' | 'disabled';
export type EmailDispatchMode = 'legacy' | 'shadow' | 'active';
export type EmailLocale = 'no' | 'en';

export interface EmailDispatchSettings {
  mode: EmailDispatchMode;
  paused: boolean;
  batchSize: number;
  rateLimitPerMinute: number;
  defaultFrom: string;
  defaultReplyTo: string;
}

export interface EnqueueEmailInput {
  idempotencyKey: string;
  classification: EmailClassification;
  toEmail: string;
  toPhone?: string | null;
  locale?: string;
  templateKey?: string | null;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  sourcePath?: string | null;
  campaignId?: string | null;
  orderId?: string | null;
  eggOrderId?: string | null;
  chickenOrderId?: string | null;
  customerMessageId?: string | null;
  priority?: number;
  status?: EmailQueueStatus;
  nextAttemptAt?: string;
  attempts?: number;
  maxAttempts?: number;
  lockedBy?: string | null;
  lockedAt?: string | null;
  sentAt?: string | null;
  providerMessageId?: string | null;
  lastError?: string | null;
}

export interface EmailQueueRecord {
  id: string;
  idempotency_key: string;
  classification: EmailClassification;
  priority: number;
  status: EmailQueueStatus;
  to_email: string;
  to_phone: string | null;
  locale: string;
  template_key: string | null;
  subject: string;
  html: string;
  metadata: Record<string, unknown>;
  source_path: string | null;
  campaign_id: string | null;
  order_id: string | null;
  egg_order_id: string | null;
  chicken_order_id: string | null;
  customer_message_id: string | null;
  provider: string;
  provider_message_id: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  locked_at: string | null;
  locked_by: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchEmailInput {
  to: string;
  toPhone?: string;
  subject: string;
  html: string;
  classification?: EmailClassification;
  locale?: EmailLocale;
  templateKey?: string;
  metadata?: Record<string, unknown>;
  sourcePath?: string;
  campaignId?: string;
  orderId?: string;
  eggOrderId?: string;
  chickenOrderId?: string;
  customerMessageId?: string;
  entityType?: string;
  entityId?: string;
  flowKey?: string;
  triggerDateKey?: string;
  scheduledFor?: string;
  productScope?: string;
  priority?: number;
  maxAttempts?: number;
  idempotency?: {
    source: string;
    entity: string;
    id: string;
    template?: string;
  };
  /** Send immediately even in active (queue) mode. Use for support messages. */
  sendImmediately?: boolean;
}

export interface DispatchEmailResult {
  success: boolean;
  mode: EmailDispatchMode;
  queueId?: string;
  id?: string;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}
