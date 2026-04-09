'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Mail,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomerMessage, MessageReply } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/eggs/utils';

type RelatedOrderSource = 'pig' | 'egg' | 'chicken';

type MessagingPigOrder = {
  id: string;
  order_number: string;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  box_size?: number | null;
  status: string;
  delivery_type: string;
  extra_products?: Array<Record<string, unknown>>;
  notes?: string | null;
  total_amount: number;
  created_at: string;
};

type MessagingEggOrder = {
  id: string;
  order_number: string;
  status: string;
  quantity: number;
  total_amount: number;
  week_number: number;
  delivery_monday: string;
  delivery_method: string;
  created_at?: string | null;
  egg_breeds?: { name?: string } | null;
  egg_order_additions?: Array<{ quantity: number }>;
};

type MessagingChickenOrder = {
  id: string;
  order_number: string;
  status: string;
  quantity_hens: number;
  quantity_roosters: number;
  pickup_year: number;
  pickup_week: number;
  pickup_date?: string | null;
  delivery_method: string;
  total_amount_nok: number;
  created_at: string;
  chicken_breeds?: { name?: string } | null;
  chicken_order_additions?: Array<{ quantity_hens: number; quantity_roosters: number }>;
};

type RelatedOrderOption = {
  key: string;
  source: RelatedOrderSource;
  id: string;
  orderNumber: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  totalLabel: string;
  createdLabel: string;
  deliveryLabel: string;
  contentLines: string[];
  note?: string | null;
};

interface MessagingPanelProps {
  className?: string;
  variant?: 'light' | 'dark';
  pigOrders?: MessagingPigOrder[];
  eggOrders?: MessagingEggOrder[];
  chickenOrders?: MessagingChickenOrder[];
  initialMessageId?: string;
  initialReplyId?: string;
}

type CustomerMessageWithReplies = CustomerMessage & { message_replies?: MessageReply[] };
type CommunicationHistoryItem = {
  id: string;
  source: 'email_dispatch_queue' | 'legacy_email_log';
  channel: 'email';
  classification: string;
  status: string;
  subject: string;
  templateKey: string | null;
  toEmail: string | null;
  sentAt: string | null;
  createdAt: string | null;
  sourcePath: string | null;
  providerMessageId: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  orderRefs: {
    orderId: string | null;
    eggOrderId: string | null;
    chickenOrderId: string | null;
    campaignId: string | null;
    customerMessageId: string | null;
  };
};

export function MessagingPanel({
  className,
  variant = 'light',
  pigOrders = [],
  eggOrders = [],
  chickenOrders = [],
  initialMessageId,
  initialReplyId,
}: MessagingPanelProps) {
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
    attachOrderLabel: t.customerMessagingPanel.attachOrderLabel,
    attachOrderOptional: t.customerMessagingPanel.attachOrderOptional,
    attachOrderHelp: t.customerMessagingPanel.attachOrderHelp,
    attachOrderPlaceholder: t.customerMessagingPanel.attachOrderPlaceholder,
    attachOrderNone: t.customerMessagingPanel.attachOrderNone,
    attachOrderEmpty: t.customerMessagingPanel.attachOrderEmpty,
    attachedOrderTitle: t.customerMessagingPanel.attachedOrderTitle,
    orderPreviewTitle: t.customerMessagingPanel.orderPreviewTitle,
    orderPreviewHint: t.customerMessagingPanel.orderPreviewHint,
    orderPreviewStatus: t.customerMessagingPanel.orderPreviewStatus,
    orderPreviewTotal: t.customerMessagingPanel.orderPreviewTotal,
    orderPreviewDelivery: t.customerMessagingPanel.orderPreviewDelivery,
    orderPreviewCreated: t.customerMessagingPanel.orderPreviewCreated,
    orderPreviewContents: t.customerMessagingPanel.orderPreviewContents,
    orderPreviewNotes: t.customerMessagingPanel.orderPreviewNotes,
    orderTypePig: t.customerMessagingPanel.orderTypePig,
    orderTypeEgg: t.customerMessagingPanel.orderTypeEgg,
    orderTypeChicken: t.customerMessagingPanel.orderTypeChicken,
    deliveryPosten: t.customerMessagingPanel.deliveryPosten,
    deliveryFarmPickup: t.customerMessagingPanel.deliveryFarmPickup,
    deliveryE6Pickup: t.customerMessagingPanel.deliveryE6Pickup,
    deliveryTrondheimPickup: t.customerMessagingPanel.deliveryTrondheimPickup,
    deliveryPickup: t.customerMessagingPanel.deliveryPickup,
    yourMessages: t.customerMessagingPanel.yourMessages,
    loadingMessages: t.customerMessagingPanel.loadingMessages,
    noMessages: t.customerMessagingPanel.noMessages,
    fromYou: t.customerMessagingPanel.fromYou,
    fromFarm: t.customerMessagingPanel.fromFarm,
    replyPlaceholder: t.customerMessagingPanel.replyPlaceholder,
    communicationsTitle: t.customerMessagingPanel.communicationsTitle,
    communicationsSubtitle:
      t.customerMessagingPanel.communicationsSubtitle,
    communicationsLoading: t.customerMessagingPanel.communicationsLoading,
    communicationsEmpty: t.customerMessagingPanel.communicationsEmpty,
    communicationsLoadError:
      t.customerMessagingPanel.communicationsLoadError,
    communicationsSentAt: t.customerMessagingPanel.communicationsSentAt,
    communicationsCreatedAt: t.customerMessagingPanel.communicationsCreatedAt,
    communicationsClassification: t.customerMessagingPanel.communicationsClassification,
    communicationsTemplate: t.customerMessagingPanel.communicationsTemplate,
    communicationsNoSubject: t.customerMessagingPanel.communicationsNoSubject,
    communicationStatus: {
      sent: t.customerMessagingPanel.communicationStatusSent,
      pending: t.customerMessagingPanel.communicationStatusPending,
      processing: t.customerMessagingPanel.communicationStatusProcessing,
      failed: t.customerMessagingPanel.communicationStatusFailed,
      dead: t.customerMessagingPanel.communicationStatusDead,
      cancelled: t.customerMessagingPanel.communicationStatusCancelled,
      unknown: t.customerMessagingPanel.communicationStatusUnknown,
    },
    communicationClassification: {
      transactional: t.customerMessagingPanel.communicationClassificationTransactional,
      support: t.customerMessagingPanel.communicationClassificationSupport,
      promotional: t.customerMessagingPanel.communicationClassificationPromotional,
      system: t.customerMessagingPanel.communicationClassificationSystem,
      unknown: t.customerMessagingPanel.communicationClassificationUnknown,
    },
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
  const [selectedRelatedOrderKey, setSelectedRelatedOrderKey] = useState('');
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [hoveredRelatedOrderKey, setHoveredRelatedOrderKey] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'support' | 'inquiry' | 'complaint' | 'feedback' | 'referral_question'>('support');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [communications, setCommunications] = useState<CommunicationHistoryItem[]>([]);
  const [communicationsLoading, setCommunicationsLoading] = useState(true);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
    sentAt: string | null;
  } | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState<string | null>(null);
  const isDark = variant === 'dark';

  const formatPlainCurrency = useCallback(
    (amount: number) => `${Math.round(amount).toLocaleString(locale)} ${t.common.currency}`,
    [locale, t.common.currency]
  );

  const humanizeStatus = useCallback((value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';

    const lower = raw.toLowerCase();
    const mapped: Record<string, string> = {
      pending: locale === 'en-US' ? 'Pending' : 'Venter',
      deposit_paid: locale === 'en-US' ? 'Deposit paid' : 'Forskudd betalt',
      fully_paid: locale === 'en-US' ? 'Fully paid' : 'Fullt betalt',
      preparing: locale === 'en-US' ? 'Preparing' : 'Klargjores',
      shipped: locale === 'en-US' ? 'Shipped' : 'Sendt',
      delivered: locale === 'en-US' ? 'Delivered' : 'Levert',
      ready_for_pickup: locale === 'en-US' ? 'Ready for pickup' : 'Klar for henting',
      picked_up: locale === 'en-US' ? 'Picked up' : 'Hentet',
      paid: locale === 'en-US' ? 'Paid' : 'Betalt',
      completed: locale === 'en-US' ? 'Completed' : 'Fullfort',
      cancelled: locale === 'en-US' ? 'Cancelled' : 'Kansellert',
      forfeited: locale === 'en-US' ? 'Forfeited' : 'Forfalt',
    };

    if (mapped[lower]) return mapped[lower];

    return raw
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [locale]);

  const formatDeliveryLabel = useCallback(
    (method?: string | null, source?: RelatedOrderSource) => {
      const raw = String(method || '').trim().toLowerCase();
      if (!raw) return '-';
      if (raw === 'posten') return copy.deliveryPosten;
      if (raw === 'farm_pickup' || raw === 'pickup_farm') return copy.deliveryFarmPickup;
      if (raw === 'e6_pickup' || raw === 'pickup_e6') return copy.deliveryE6Pickup;
      if (raw === 'delivery_trondheim') return copy.deliveryTrondheimPickup;
      if (raw === 'pickup') return copy.deliveryPickup;
      if (source === 'chicken' && raw.includes('pickup')) return copy.deliveryPickup;
      return raw.replace(/_/g, ' ');
    },
    [copy.deliveryE6Pickup, copy.deliveryFarmPickup, copy.deliveryPickup, copy.deliveryPosten, copy.deliveryTrondheimPickup]
  );

  const extractPigExtraLabel = useCallback(
    (extra: Record<string, unknown>) => {
      const localizedName = lang === 'en'
        ? (extra.name_en as string | undefined)
        : (extra.name_no as string | undefined);
      return (
        localizedName ||
        (extra.name as string | undefined) ||
        (extra.cut_name_en as string | undefined) ||
        (extra.cut_name_no as string | undefined) ||
        (extra.slug as string | undefined) ||
        null
      );
    },
    [lang]
  );

  const relatedOrders = useMemo<RelatedOrderOption[]>(() => {
    const pigOptions = pigOrders.map((order) => {
      const boxName =
        (lang === 'en' ? order.display_box_name_en : order.display_box_name_no) ||
        (order.box_size ? `${order.box_size} kg` : copy.orderTypePig);
      const extraNames = (order.extra_products || [])
        .map((extra) => extractPigExtraLabel(extra))
        .filter((value): value is string => Boolean(value))
        .slice(0, 3);

      return {
        key: `pig-${order.id}`,
        source: 'pig' as const,
        id: order.id,
        orderNumber: order.order_number,
        typeLabel: copy.orderTypePig,
        title: boxName,
        subtitle: extraNames.length > 0 ? extraNames.join(' - ') : boxName,
        statusLabel: humanizeStatus(order.status),
        totalLabel: formatPlainCurrency(order.total_amount || 0),
        createdLabel: order.created_at ? formatDate(new Date(order.created_at), lang) : '-',
        deliveryLabel: formatDeliveryLabel(order.delivery_type, 'pig'),
        contentLines:
          extraNames.length > 0
            ? extraNames
            : [boxName],
        note: order.notes || null,
      };
    });

    const eggOptions = eggOrders.map((order) => {
      const addedEggs = (order.egg_order_additions || []).reduce(
        (sum, addition) => sum + Number(addition.quantity || 0),
        0
      );
      const totalEggs = Number(order.quantity || 0) + addedEggs;
      const breedName = order.egg_breeds?.name || copy.orderTypeEgg;
      const contentLines = [
        `${totalEggs} ${lang === 'en' ? 'eggs' : 'egg'}`,
        `${t.eggs.common.week} ${order.week_number} - ${formatDate(new Date(order.delivery_monday), lang)}`,
      ];

      if (addedEggs > 0) {
        contentLines.push(
          lang === 'en'
            ? `${addedEggs} added later`
            : `${addedEggs} lagt til senere`
        );
      }

      return {
        key: `egg-${order.id}`,
        source: 'egg' as const,
        id: order.id,
        orderNumber: order.order_number,
        typeLabel: copy.orderTypeEgg,
        title: breedName,
        subtitle: `${totalEggs} ${lang === 'en' ? 'eggs' : 'egg'}`,
        statusLabel: humanizeStatus(order.status),
        totalLabel: formatPrice(order.total_amount || 0, lang),
        createdLabel: order.created_at ? formatDate(new Date(order.created_at), lang) : '-',
        deliveryLabel: formatDeliveryLabel(order.delivery_method, 'egg'),
        contentLines,
      };
    });

    const chickenOptions = chickenOrders.map((order) => {
      const addedHens = (order.chicken_order_additions || []).reduce(
        (sum, addition) => sum + Number(addition.quantity_hens || 0),
        0
      );
      const addedRoosters = (order.chicken_order_additions || []).reduce(
        (sum, addition) => sum + Number(addition.quantity_roosters || 0),
        0
      );
      const totalHens = Number(order.quantity_hens || 0) + addedHens;
      const totalRoosters = Number(order.quantity_roosters || 0) + addedRoosters;
      const breedName = order.chicken_breeds?.name || copy.orderTypeChicken;
      const contentLines = [
        lang === 'en'
          ? `${totalHens} hens - ${totalRoosters} roosters`
          : `${totalHens} høner - ${totalRoosters} haner`,
        order.pickup_date
          ? formatDate(new Date(order.pickup_date), lang)
          : `${t.eggs.common.week} ${order.pickup_week} / ${order.pickup_year}`,
      ];

      return {
        key: `chicken-${order.id}`,
        source: 'chicken' as const,
        id: order.id,
        orderNumber: order.order_number,
        typeLabel: copy.orderTypeChicken,
        title: breedName,
        subtitle: lang === 'en'
          ? `${totalHens} hens - ${totalRoosters} roosters`
          : `${totalHens} høner - ${totalRoosters} haner`,
        statusLabel: humanizeStatus(order.status),
        totalLabel: formatPlainCurrency(order.total_amount_nok || 0),
        createdLabel: order.created_at ? formatDate(new Date(order.created_at), lang) : '-',
        deliveryLabel: formatDeliveryLabel(order.delivery_method, 'chicken'),
        contentLines,
      };
    });

    return [...eggOptions, ...chickenOptions, ...pigOptions].sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
  }, [
    chickenOrders,
    copy.orderTypeChicken,
    copy.orderTypeEgg,
    copy.orderTypePig,
    eggOrders,
    extractPigExtraLabel,
    formatDeliveryLabel,
    formatPlainCurrency,
    humanizeStatus,
    lang,
    pigOrders,
    t.eggs.common.week,
  ]);

  const selectedRelatedOrder = useMemo(
    () => relatedOrders.find((order) => order.key === selectedRelatedOrderKey) || null,
    [relatedOrders, selectedRelatedOrderKey]
  );

  const focusedMessage = useMemo(
    () => messages.find((message) => message.id === initialMessageId) || null,
    [initialMessageId, messages]
  );

  const highlightedReplyId = useMemo(() => {
    if (!focusedMessage) {
      return null;
    }

    if (initialReplyId) {
      return initialReplyId;
    }

    const visibleReplies = (focusedMessage.message_replies || [])
      .filter((reply) => !reply.is_internal)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    const latestFarmReply = [...visibleReplies]
      .reverse()
      .find((reply) => !(reply as any).is_from_customer);

    return latestFarmReply?.id || null;
  }, [focusedMessage, initialReplyId]);

  const previewedRelatedOrder = useMemo(
    () =>
      relatedOrders.find((order) => order.key === hoveredRelatedOrderKey) ||
      selectedRelatedOrder ||
      null,
    [hoveredRelatedOrderKey, relatedOrders, selectedRelatedOrder]
  );

  useEffect(() => {
    if (!selectedRelatedOrderKey) return;
    if (relatedOrders.some((order) => order.key === selectedRelatedOrderKey)) return;
    setSelectedRelatedOrderKey('');
  }, [relatedOrders, selectedRelatedOrderKey]);

  const renderOrderPreview = useCallback(
    (order: RelatedOrderOption | null, compact = false) => {
      if (!order) {
        return (
          <div
            className={cn(
              'rounded-xl border border-dashed p-4 text-sm',
              isDark ? 'border-white/20 text-white/60' : 'border-gray-200 text-gray-500'
            )}
          >
            {copy.orderPreviewHint}
          </div>
        );
      }

      return (
        <div
          className={cn(
            'rounded-xl border p-4',
            isDark ? 'border-white/20 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('text-xs uppercase tracking-[0.2em]', isDark ? 'text-white/60' : 'text-gray-500')}>
                {compact ? copy.attachedOrderTitle : copy.orderPreviewTitle}
              </p>
              <p className="text-base font-semibold truncate">{order.orderNumber}</p>
              <p className={cn('text-sm mt-1', isDark ? 'text-white/80' : 'text-gray-700')}>{order.title}</p>
              <p className={cn('text-xs mt-1', isDark ? 'text-white/60' : 'text-gray-500')}>{order.typeLabel}</p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                isDark ? 'bg-white/10 text-white/80' : 'bg-white text-gray-600 border border-gray-200'
              )}
            >
              {order.typeLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className={cn(isDark ? 'text-white/60' : 'text-gray-500')}>{copy.orderPreviewStatus}</p>
              <p className="mt-1 font-medium">{order.statusLabel}</p>
            </div>
            <div>
              <p className={cn(isDark ? 'text-white/60' : 'text-gray-500')}>{copy.orderPreviewTotal}</p>
              <p className="mt-1 font-medium">{order.totalLabel}</p>
            </div>
            <div>
              <p className={cn(isDark ? 'text-white/60' : 'text-gray-500')}>{copy.orderPreviewDelivery}</p>
              <p className="mt-1 font-medium">{order.deliveryLabel}</p>
            </div>
            <div>
              <p className={cn(isDark ? 'text-white/60' : 'text-gray-500')}>{copy.orderPreviewCreated}</p>
              <p className="mt-1 font-medium">{order.createdLabel}</p>
            </div>
          </div>

          {order.contentLines.length > 0 && (
            <div className="mt-4">
              <p className={cn('text-xs uppercase tracking-[0.16em]', isDark ? 'text-white/60' : 'text-gray-500')}>
                {copy.orderPreviewContents}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {order.contentLines.map((line) => (
                  <li key={`${order.key}-${line}`} className={cn(isDark ? 'text-white/85' : 'text-gray-700')}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.note && (
            <div className="mt-4">
              <p className={cn('text-xs uppercase tracking-[0.16em]', isDark ? 'text-white/60' : 'text-gray-500')}>
                {copy.orderPreviewNotes}
              </p>
              <p className={cn('mt-2 text-sm', isDark ? 'text-white/85' : 'text-gray-700')}>{order.note}</p>
            </div>
          )}
        </div>
      );
    },
    [copy.attachedOrderTitle, copy.orderPreviewContents, copy.orderPreviewCreated, copy.orderPreviewDelivery, copy.orderPreviewHint, copy.orderPreviewNotes, copy.orderPreviewStatus, copy.orderPreviewTitle, copy.orderPreviewTotal, isDark]
  );

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

  const loadCommunicationHistory = useCallback(async () => {
    try {
      setCommunicationsLoading(true);
      const res = await fetch('/api/messages/history', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || copy.communicationsLoadError);
      }
      setCommunications(Array.isArray(data.communications) ? data.communications : []);
    } catch (historyError) {
      console.error('Failed to load communication history:', historyError);
      setCommunications([]);
    } finally {
      setCommunicationsLoading(false);
    }
  }, [copy.communicationsLoadError]);

  async function openEmailPreview(entry: CommunicationHistoryItem) {
    const key = `${entry.source}-${entry.id}`;
    setEmailPreviewLoading(key);
    try {
      const res = await fetch(
        `/api/messages/history/preview?source=${encodeURIComponent(entry.source)}&id=${encodeURIComponent(entry.id)}`,
        { cache: 'no-store' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load preview');
      setEmailPreview({
        subject: data.preview?.subject || entry.subject || '',
        html: data.preview?.html || '',
        sentAt: data.preview?.sentAt || entry.sentAt || null,
      });
    } catch (previewError) {
      toast({
        title: copy.errorTitle,
        description: previewError instanceof Error ? previewError.message : 'Kunne ikke laste forhåndsvisning',
        variant: 'destructive',
      });
    } finally {
      setEmailPreviewLoading(null);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    loadCommunicationHistory();
  }, [loadCommunicationHistory]);

  useEffect(() => {
    const handleMessageCreated = () => {
      loadMessages();
    };

    window.addEventListener('tinglum_message_created', handleMessageCreated);
    return () => window.removeEventListener('tinglum_message_created', handleMessageCreated);
  }, [loadMessages]);

  useEffect(() => {
    if (isLoading || !initialMessageId) {
      return;
    }

    const targetId = highlightedReplyId
      ? `message-reply-${highlightedReplyId}`
      : `message-thread-${initialMessageId}`;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [highlightedReplyId, initialMessageId, isLoading]);

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
          related_order_source: selectedRelatedOrder?.source || null,
          related_order_id: selectedRelatedOrder?.id || null,
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
      setSelectedRelatedOrderKey('');
      setHoveredRelatedOrderKey(null);
      setOrderPickerOpen(false);
      setSuccess(true);
      setMessages((prev) => [data.message, ...prev]);
      loadCommunicationHistory();
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

  const getRootSenderLabel = (message: CustomerMessageWithReplies) =>
    message.initiated_by === 'admin' ? copy.fromFarm : copy.fromYou;

  const getRootBubbleClass = (message: CustomerMessageWithReplies) => {
    if (message.initiated_by === 'admin') {
      return isDark
        ? 'bg-white/10 border-white/20 text-white mr-4'
        : 'bg-white border-gray-200 mr-4';
    }

    return isDark
      ? 'bg-blue-900/30 border-blue-500/30 text-white ml-4'
      : 'bg-blue-50 border-blue-200 ml-4';
  };

  const communicationStatusClass: Record<string, string> = {
    sent: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    dead: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
    unknown: 'bg-gray-100 text-gray-700',
  };

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
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className={cn('block text-sm font-medium', isDark ? 'text-white/80' : 'text-gray-700')}>
                {copy.attachOrderLabel}
              </label>
              <span className={cn('text-xs', isDark ? 'text-white/50' : 'text-gray-500')}>
                {copy.attachOrderOptional}
              </span>
            </div>

            <Popover
              open={orderPickerOpen}
              onOpenChange={(open) => {
                setOrderPickerOpen(open);
                if (open) {
                  setHoveredRelatedOrderKey(selectedRelatedOrderKey || relatedOrders[0]?.key || null);
                } else {
                  setHoveredRelatedOrderKey(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-between rounded-lg px-4 py-3 h-auto',
                    isDark
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/15 hover:text-white'
                      : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <Link2 className={cn('h-4 w-4 shrink-0', isDark ? 'text-white/60' : 'text-gray-400')} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {selectedRelatedOrder ? selectedRelatedOrder.orderNumber : copy.attachOrderNone}
                      </p>
                      <p className={cn('truncate text-xs', isDark ? 'text-white/60' : 'text-gray-500')}>
                        {selectedRelatedOrder ? `${selectedRelatedOrder.typeLabel} - ${selectedRelatedOrder.title}` : copy.attachOrderPlaceholder}
                      </p>
                    </div>
                  </div>
                  <ChevronsUpDown className={cn('h-4 w-4 shrink-0', isDark ? 'text-white/60' : 'text-gray-400')} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className={cn(
                  'w-[min(92vw,720px)] p-3',
                  isDark ? 'border-white/20 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
                )}
              >
                {relatedOrders.length === 0 ? (
                  <div className={cn('rounded-xl border border-dashed p-4 text-sm', isDark ? 'border-white/20 text-white/60' : 'border-gray-200 text-gray-500')}>
                    {copy.attachOrderEmpty}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-1 max-h-[320px] overflow-auto pr-1">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredRelatedOrderKey(null)}
                        onFocus={() => setHoveredRelatedOrderKey(null)}
                        onClick={() => {
                          setSelectedRelatedOrderKey('');
                          setHoveredRelatedOrderKey(null);
                          setOrderPickerOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-start justify-between rounded-lg px-3 py-3 text-left transition-colors',
                          !selectedRelatedOrderKey
                            ? isDark
                              ? 'bg-white/10 text-white'
                              : 'bg-gray-100 text-gray-900'
                            : isDark
                              ? 'hover:bg-white/5 text-white/80'
                              : 'hover:bg-gray-50 text-gray-700'
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium">{copy.attachOrderNone}</p>
                          <p className={cn('text-xs mt-1', isDark ? 'text-white/60' : 'text-gray-500')}>
                            {copy.attachOrderHelp}
                          </p>
                        </div>
                        {!selectedRelatedOrderKey && <Check className="h-4 w-4 shrink-0" />}
                      </button>

                      {relatedOrders.map((order) => (
                        <button
                          key={order.key}
                          type="button"
                          onMouseEnter={() => setHoveredRelatedOrderKey(order.key)}
                          onFocus={() => setHoveredRelatedOrderKey(order.key)}
                          onClick={() => {
                            setSelectedRelatedOrderKey(order.key);
                            setHoveredRelatedOrderKey(order.key);
                            setOrderPickerOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-start justify-between rounded-lg px-3 py-3 text-left transition-colors',
                            selectedRelatedOrderKey === order.key
                              ? isDark
                                ? 'bg-white/10 text-white'
                                : 'bg-gray-100 text-gray-900'
                              : isDark
                                ? 'hover:bg-white/5 text-white/80'
                                : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{order.orderNumber}</p>
                            <p className={cn('mt-1 truncate text-xs', isDark ? 'text-white/60' : 'text-gray-500')}>
                              {order.typeLabel} - {order.title}
                            </p>
                          </div>
                          {selectedRelatedOrderKey === order.key && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <div className="lg:block">
                      {renderOrderPreview(previewedRelatedOrder)}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <p className={cn('mt-2 text-xs', isDark ? 'text-white/50' : 'text-gray-500')}>
              {copy.attachOrderHelp}
            </p>

            {selectedRelatedOrder && (
              <div className="mt-3">
                {renderOrderPreview(selectedRelatedOrder, true)}
              </div>
            )}
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

      <div
        className={cn(
          'rounded-2xl p-6 border',
          isDark ? 'glass-mobile border-white/20' : 'bg-white border-gray-200'
        )}
      >
        <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
          {copy.communicationsTitle}
        </h3>
        <p className={cn('text-sm mt-1 mb-4', isDark ? 'text-white/70' : 'text-gray-600')}>
          {copy.communicationsSubtitle}
        </p>

        {communicationsLoading ? (
          <div className={cn('text-sm py-4', isDark ? 'text-white/70' : 'text-gray-600')}>
            {copy.communicationsLoading}
          </div>
        ) : communications.length === 0 ? (
          <div className={cn('text-sm py-4', isDark ? 'text-white/70' : 'text-gray-600')}>
            {copy.communicationsEmpty}
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {communications.map((entry) => {
              const status = String(entry.status || 'unknown').toLowerCase();
              const statusLabel =
                copy.communicationStatus[status as keyof typeof copy.communicationStatus] ||
                copy.communicationStatus.unknown;
              const classification = String(entry.classification || 'unknown').toLowerCase();
              const classificationLabel =
                copy.communicationClassification[
                  classification as keyof typeof copy.communicationClassification
                ] || copy.communicationClassification.unknown;
              const eventTs = entry.sentAt || entry.createdAt;
              const eventLabel = eventTs ? new Date(eventTs).toLocaleString(locale) : '-';

              const entryKey = `${entry.source}-${entry.id}`;
              const isLoadingPreview = emailPreviewLoading === entryKey;

              return (
                <button
                  type="button"
                  key={entryKey}
                  onClick={() => openEmailPreview(entry)}
                  disabled={isLoadingPreview}
                  className={cn(
                    'rounded-lg border p-3 w-full text-left transition-colors cursor-pointer',
                    isDark
                      ? 'border-white/20 bg-white/5 hover:bg-white/10'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
                    isLoadingPreview && 'opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isLoadingPreview ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" />
                      ) : (
                        <Mail className={cn('h-4 w-4 shrink-0', isDark ? 'text-white/50' : 'text-gray-400')} />
                      )}
                      <p className={cn('font-medium text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
                        {entry.subject || copy.communicationsNoSubject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          communicationStatusClass[status] || communicationStatusClass.unknown
                        )}
                      >
                        {statusLabel}
                      </span>
                      <ChevronRight className={cn('h-4 w-4', isDark ? 'text-white/40' : 'text-gray-400')} />
                    </div>
                  </div>

                  <div className={cn('text-xs mt-2 flex flex-wrap gap-x-4 gap-y-1', isDark ? 'text-white/70' : 'text-gray-600')}>
                    <span>
                      {copy.communicationsClassification}: {classificationLabel}
                    </span>
                    {entry.templateKey && (
                      <span>
                        {copy.communicationsTemplate}: {entry.templateKey}
                      </span>
                    )}
                    <span>
                      {(entry.sentAt ? copy.communicationsSentAt : copy.communicationsCreatedAt)}:{' '}
                      {eventLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Email preview modal */}
      {emailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={cn(
              'relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-xl overflow-hidden',
              isDark ? 'bg-gray-900 border border-white/20' : 'bg-white border border-gray-200'
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0',
                isDark ? 'border-white/20' : 'border-gray-200'
              )}
            >
              <div className="min-w-0">
                <h3 className={cn('font-semibold text-base truncate', isDark ? 'text-white' : 'text-gray-900')}>
                  {emailPreview.subject || copy.communicationsNoSubject}
                </h3>
                {emailPreview.sentAt && (
                  <p className={cn('text-xs mt-0.5', isDark ? 'text-white/60' : 'text-gray-500')}>
                    {copy.communicationsSentAt}: {new Date(emailPreview.sentAt).toLocaleString(locale)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEmailPreview(null)}
                className={cn(
                  'shrink-0 p-1.5 rounded-lg transition-colors',
                  isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={emailPreview.html}
                sandbox="allow-same-origin"
                className="w-full h-full border-0"
                style={{ minHeight: '400px' }}
                title={emailPreview.subject || 'Email preview'}
              />
            </div>
          </div>
        </div>
      )}

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
          messages.map((msg) => {
            const isFocusedThread = msg.id === initialMessageId;
            const visibleReplies = (msg.message_replies || [])
              .filter((reply) => !reply.is_internal)
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );

            return (
            <div
              key={msg.id}
              id={`message-thread-${msg.id}`}
              className={cn(
                'rounded-lg p-4 border transition-all',
                statusColors[msg.status as keyof typeof statusColors],
                isFocusedThread && 'ring-2 ring-amber-300 ring-offset-2 shadow-[0_12px_30px_-18px_rgba(180,83,9,0.55)]'
              )}
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

              <div className="mb-3">
                <div className={cn('rounded-lg border p-3', getRootBubbleClass(msg))}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn('text-xs font-semibold', isDark ? 'text-white/80' : 'text-gray-700')}>
                      {getRootSenderLabel(msg)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className={cn('text-sm whitespace-pre-wrap', isDark ? 'text-white/90' : 'text-gray-700')}>
                    {msg.message}
                  </p>
                </div>
              </div>

              {visibleReplies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {visibleReplies.map((reply) => {
                      const isFromCustomer = (reply as any).is_from_customer;
                      const isHighlightedReply = reply.id === highlightedReplyId;
                      return (
                        <div
                          key={reply.id}
                          id={`message-reply-${reply.id}`}
                          className={cn(
                            'rounded-lg border p-3 transition-all',
                            isHighlightedReply
                              ? isDark
                                ? 'bg-amber-500/10 border-amber-300/40 text-white mr-2 ring-2 ring-amber-300/50 shadow-[0_10px_24px_-14px_rgba(245,158,11,0.7)]'
                                : 'bg-amber-50 border-amber-300 mr-2 ring-2 ring-amber-200 shadow-[0_10px_24px_-16px_rgba(217,119,6,0.45)]'
                              : isFromCustomer
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
          )})
        )}
      </div>
    </div>
  );
}


