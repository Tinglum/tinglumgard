"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle, Package, Clock, CreditCard, Share2, Copy, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentStatus = "pending" | "completed" | "failed";

type OrderData = {
  id: string;
  order_number: string;
  box_size: number | null;
  effective_box_size?: number;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  mangalitsa_preset?: {
    name_no?: string | null;
    name_en?: string | null;
    target_weight_kg?: number | null;
  } | null;
  deposit_amount: number;
  status: string;
  payments?: Array<{ payment_type: string; status: PaymentStatus }>;
};

type ConfigData = {
  cutoff?: {
    year?: number;
  };
};

export default function ConfirmationPage() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [pollCount, setPollCount] = useState(0);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const copy = t.confirmationPage;

  const formatAmount = (amount: number) => amount.toLocaleString(lang === "no" ? "nb-NO" : "en-US");

  useEffect(() => {
    async function fetchData() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const [orderResponse, configResponse] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch("/api/config"),
        ]);

        if (orderResponse.ok) {
          const data: OrderData = await orderResponse.json();
          setOrder(data);

          const depositPayment = data.payments?.find((payment) => payment.payment_type === "deposit");
          if (depositPayment?.status) {
            setPaymentStatus(depositPayment.status);
          }
        }

        if (configResponse.ok) {
          const configData: ConfigData = await configResponse.json();
          setConfig(configData);
        }
      } catch (error) {
        console.error("Error fetching confirmation data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || paymentStatus === "completed" || pollCount >= 10) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) return;

        const data: OrderData = await response.json();
        const depositPayment = data.payments?.find((payment) => payment.payment_type === "deposit");

        if (depositPayment?.status === "completed") {
          setPaymentStatus("completed");
          setOrder(data);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling order status", error);
      }

      setPollCount((previous) => previous + 1);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId, paymentStatus, pollCount]);

  const depositPercentage = 50;

  const deliveryYear = config?.cutoff?.year || 2026;
  const referralGivePercentage = 20;
  const referralEarnPercentage = 10;
  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/bestill`;
    }
    return "/bestill";
  }, []);
  const shareMessage = copy.shareMessage;
  const boxDisplay = useMemo(() => {
    if (!order) return '';
    const presetName =
      (lang === 'no' ? order.display_box_name_no : order.display_box_name_en) ||
      (lang === 'no' ? order.mangalitsa_preset?.name_no : order.mangalitsa_preset?.name_en) ||
      order.display_box_name_no ||
      order.display_box_name_en;
    if (presetName) return presetName;
    return lang === 'no' ? 'Mangalitsa-boks' : 'Mangalitsa box';
  }, [order, lang]);

  const statusTextByOrder = order
    ? {
        draft: copy.statusDraft,
        deposit_paid: copy.statusDepositPaid,
        paid: copy.statusPaid,
        ready_for_pickup: copy.statusReadyForPickup,
        completed: copy.statusCompleted,
        cancelled: copy.statusCancelled,
      }[order.status] || copy.statusUnknown
    : copy.statusUnknown;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md bg-white border border-neutral-200 rounded-xl p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-4">{copy.orderNotFoundTitle}</h1>
          <p className="font-light text-neutral-600 mb-8">{copy.orderNotFoundDescription}</p>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            {copy.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const depositAmount = order.deposit_amount;

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 1800);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  }

  function shareOnFacebook() {
    const target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function shareOnX() {
    const target = `https://x.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== "undefined" ? window.scrollY * 0.1 : 0}px)`,
            transition: "transform 0.05s linear",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] bg-neutral-50 border-2 border-neutral-900">
            <CheckCircle className="w-14 h-14 text-neutral-900" />
          </div>
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-3">
            {paymentStatus === "completed" ? copy.paymentReceived : paymentStatus === "failed" ? copy.paymentFailed : copy.paymentWaiting}
          </h1>
          <p className="text-base font-light text-neutral-600">
            {copy.orderNumberLabel}: <span className="font-mono font-normal text-neutral-900">{order.order_number}</span>
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] mb-6 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light tracking-tight text-neutral-900 mb-8">{copy.detailsTitle}</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Package className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.boxSizeLabel}</p>
                <p className="text-base font-light text-neutral-600">{boxDisplay}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CreditCard className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.depositLabel} ({depositPercentage}%)</p>
                <p className="text-base font-light text-neutral-600">{formatAmount(depositAmount)} {t.common.currency}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.statusLabel}</p>
                <p className="text-base font-light text-neutral-600">{statusTextByOrder}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] mb-6 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light tracking-tight text-neutral-900 mb-8">{copy.nextStepsTitle}</h2>

          <div className="space-y-4">
            {paymentStatus === "pending" && (
              <div className={cn("p-4 rounded-xl border-2 border-yellow-500 bg-yellow-50")}>
                <p className="text-yellow-900 font-semibold mb-2">{copy.pendingTitle}</p>
                <p className="text-sm text-yellow-800 mt-1">
                  {copy.pendingBody.replace("{amount}", formatAmount(depositAmount))}
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  <strong>{copy.pendingReasonsTitle}</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-1 ml-4 list-disc">
                  <li>{copy.pendingReason1}</li>
                  <li>{copy.pendingReason2}</li>
                  <li>{copy.pendingReason3}</li>
                </ul>
                <p className="text-sm text-yellow-800 mt-2">{copy.pendingFooter}</p>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className={cn("p-4 rounded-xl border-2 border-red-500 bg-red-50")}>
                <p className="text-red-900 font-semibold mb-2">{copy.failedBannerTitle}</p>
                <p className="text-sm text-red-800 mt-1">
                  {copy.failedBannerBody.replace("{amount}", formatAmount(depositAmount))}
                </p>
                <p className="text-sm text-red-800 mt-2">{copy.failedBannerHelp}</p>
              </div>
            )}

            {order.status === "draft" && paymentStatus === "completed" && (
              <div className={cn("p-4 rounded-xl border-2 border-blue-500 bg-blue-50")}>
                <p className="text-blue-900 font-semibold">{copy.syncingTitle}</p>
                <p className="text-sm text-blue-800 mt-1">{copy.syncingBody}</p>
              </div>
            )}

            {order.status === "deposit_paid" && (
              <div className={cn("p-4 rounded-xl border-2 border-neutral-900 bg-neutral-50")}>
                <p className="text-neutral-900 font-semibold">{copy.depositConfirmedTitle}</p>
                <p className="text-sm text-neutral-900 mt-1">{copy.depositConfirmedBody}</p>
              </div>
            )}

            {order.status === "paid" && (
              <div className={cn("p-4 rounded-xl border-2 border-neutral-900 bg-neutral-50")}>
                <p className="text-neutral-900 font-semibold">{copy.fullyPaidTitle}</p>
                <p className="text-sm text-neutral-900 mt-1">{copy.fullyPaidBody}</p>
              </div>
            )}

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">1</div>
              <div>
                <p className="font-light text-neutral-900 mb-1">
                  {order.status !== "draft" ? copy.step1DoneTitle : copy.step1TodoTitle}
                </p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {order.status !== "draft"
                    ? copy.step1DoneBody
                    : copy.step1TodoBody.replace("{amount}", formatAmount(order.deposit_amount))}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">2</div>
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.step2Title}</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {copy.step2Body
                    .replace("{give}", String(referralGivePercentage))
                    .replace("{earn}", String(referralEarnPercentage))
                    .replace("Min side", copy.myPage)}{" "}
                  <Link href="/min-side" className="underline font-normal hover:text-neutral-900 transition-colors">{copy.myPage}</Link>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">3</div>
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.step3Title}</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {copy.step3Body.replace("{year}", String(deliveryYear))}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">4</div>
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.step4Title}</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {copy.step4Body}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">5</div>
              <div>
                <p className="font-light text-neutral-900 mb-1">{copy.step5Title}</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {copy.step5Body}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] mb-6 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-5 h-5 text-neutral-600" />
            <h2 className="text-2xl font-light tracking-tight text-neutral-900">
              {t.checkout.shareTitle}
            </h2>
          </div>
          <p className="text-sm font-light text-neutral-600 mb-6 leading-relaxed">
            {t.checkout.shareBody}
          </p>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-light text-neutral-700 truncate">{shareUrl}</p>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wide"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedShareLink
                ? t.checkout.shareCopied
                : t.checkout.shareCopy}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={shareOnFacebook}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 text-sm font-light text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Facebook
            </button>
            <button
              type="button"
              onClick={shareOnX}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 text-sm font-light text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              X
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/"
            className="px-10 py-4 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl text-sm font-light uppercase tracking-wide text-center hover:bg-neutral-100 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {copy.backHome}
          </Link>
          <Link
            href="/min-side"
            className="px-10 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            {copy.myOrders}
          </Link>
        </div>
      </div>
    </div>
  );
}
