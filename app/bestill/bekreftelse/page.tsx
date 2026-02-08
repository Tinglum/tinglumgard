"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle, Package, Clock, CreditCard } from "lucide-react";

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [pollCount, setPollCount] = useState(0);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch both order and config in parallel
        const [orderResponse, configResponse] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch('/api/config')
        ]);

        if (orderResponse.ok) {
          const data = await orderResponse.json();
          setOrder(data);

          // Check payment status
          const depositPayment = data.payments?.find(
            (p: any) => p.payment_type === 'deposit'
          );

          if (depositPayment) {
            setPaymentStatus(depositPayment.status);
          }
        }

        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfig(configData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  // Poll for payment status updates (webhooks can be delayed)
  useEffect(() => {
    if (!orderId || paymentStatus === 'completed' || pollCount >= 10) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          const depositPayment = data.payments?.find(
            (p: any) => p.payment_type === 'deposit'
          );

          if (depositPayment && depositPayment.status === 'completed') {
            setPaymentStatus('completed');
            setOrder(data);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling order status:', error);
      }

      setPollCount(prev => prev + 1);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [orderId, paymentStatus, pollCount]);

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
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-4">Ordre ikke funnet</h1>
          <p className="font-light text-neutral-600 mb-8">Vi kunne ikke finne ordren din.</p>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            Tilbake til forsiden
          </Link>
        </div>
      </div>
    );
  }

  // Use actual deposit amount from order (may be customized)
  const depositAmount = order.deposit_amount;

  // Get deposit percentage based on box size
  const depositPercentage = order.box_size === 8
    ? config?.pricing?.box_8kg_deposit_percentage || 50
    : config?.pricing?.box_12kg_deposit_percentage || 50;

  // Get cutoff year for delivery date
  const deliveryYear = config?.cutoff?.year || 2026;

  // Referral percentages (could be added to config later)
  const referralGivePercentage = 20;
  const referralEarnPercentage = 10;

  return (
    <div className="min-h-screen bg-white py-20">
      {/* Subtle parallax background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Success Icon */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] bg-neutral-50 border-2 border-neutral-900">
            <CheckCircle className="w-14 h-14 text-neutral-900" />
          </div>
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-3">
            {paymentStatus === 'completed' ? 'Betaling mottatt!' :
             paymentStatus === 'failed' ? 'Betaling feilet' :
             'Venter på betalingsbekreftelse...'}
          </h1>
          <p className="text-base font-light text-neutral-600">
            Ordrenummer: <span className="font-mono font-normal text-neutral-900">{order.order_number}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] mb-6 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light tracking-tight text-neutral-900 mb-8">Ordredetaljer</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Package className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">Kassestørrelse</p>
                <p className="text-base font-light text-neutral-600">{order.box_size} kg</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CreditCard className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">Forskudd ({depositPercentage}%)</p>
                <p className="text-base font-light text-neutral-600">{depositAmount.toLocaleString('nb-NO')} kr</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 mt-1 text-neutral-500" />
              <div>
                <p className="font-light text-neutral-900 mb-1">Status</p>
                <p className="text-base font-light text-neutral-600">
                  {order.status === 'draft' && 'Venter på forskudd' ||
                   order.status === 'deposit_paid' && 'Forskudd betalt - venter på rest' ||
                   order.status === 'paid' && 'Fullstendig betalt' ||
                   order.status === 'ready_for_pickup' && 'Klar for henting' ||
                   order.status === 'completed' && 'Fullført' ||
                   order.status === 'cancelled' && 'Kansellert' ||
                   'Ukjent status'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] mb-6 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light tracking-tight text-neutral-900 mb-8">Neste steg</h2>

          <div className="space-y-4">
            {paymentStatus === 'pending' && (
              <div className={cn("p-4 rounded-xl border-2 border-yellow-500 bg-yellow-50")}>
                <p className="text-yellow-900 font-semibold mb-2">⏳ Venter på betalingsbekreftelse</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Vi har ikke mottatt bekreftelse på at forskuddsbetalingen på {depositAmount.toLocaleString('nb-NO')} kr er fullført.
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  <strong>Dette kan bety:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-1 ml-4 list-disc">
                  <li>Betalingen er under behandling (vanligvis tar dette noen sekunder)</li>
                  <li>Du avbrøt betalingen i Vipps</li>
                  <li>Banken din blokkerte transaksjonen</li>
                </ul>
                <p className="text-sm text-yellow-800 mt-2">
                  Siden oppdateres automatisk når vi mottar bekreftelse. Hvis betalingen ikke går gjennom innen få minutter,
                  vennligst sjekk Vipps-appen din eller kontakt oss.
                </p>
              </div>
            )}
            {paymentStatus === 'failed' && (
              <div className={cn("p-4 rounded-xl border-2 border-red-500 bg-red-50")}>
                <p className="text-red-900 font-semibold mb-2">❌ Betaling feilet</p>
                <p className="text-sm text-red-800 mt-1">
                  Forskuddsbetalingen på {depositAmount.toLocaleString('nb-NO')} kr kunne ikke gjennomføres.
                </p>
                <p className="text-sm text-red-800 mt-2">
                  Vennligst prøv igjen eller kontakt oss for hjelp.
                </p>
              </div>
            )}
            {order.status === 'draft' && paymentStatus === 'completed' && (
              <div className={cn("p-4 rounded-xl border-2 border-blue-500 bg-blue-50")}>
                <p className="text-blue-900 font-semibold">ℹ️ Oppdaterer ordrestatus...</p>
                <p className="text-sm text-blue-800 mt-1">
                  Betalingen er mottatt, oppdaterer ordredetaljene...
                </p>
              </div>
            )}

            {order.status === 'deposit_paid' && (
              <div className={cn("p-4 rounded-xl border-2 border-neutral-900 bg-neutral-50")}>
                <p className="text-neutral-900 font-semibold">Forskudd bekreftet! ✓</p>
                <p className="text-sm text-neutral-900 mt-1">
                  Vi har mottatt forskudd. Du vil motta en påminnelse om restbetaling ca. 2 uker før henting.
                </p>
              </div>
            )}

            {order.status === 'paid' && (
              <div className={cn("p-4 rounded-xl border-2 border-neutral-900 bg-neutral-50")}>
                <p className="text-neutral-900 font-semibold">Fullstendig betalt! ✓</p>
                <p className="text-sm text-neutral-900 mt-1">
                  Takk for full betaling. Din bestilling vil bli klargjort for henting.
                </p>
              </div>
            )}

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                1
              </div>
              <div>
                <p className="font-light text-neutral-900 mb-1">
                  {order.status !== 'draft' ? 'Forskudd betalt ✓' : 'Betal forskudd'}
                </p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {order.status !== 'draft'
                    ? 'Forskudd mottatt. Du har mottatt en e-postbekreftelse.'
                    : `Betal forskudd på ${order.deposit_amount.toLocaleString('nb-NO')} kr via Vipps.`
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                2
              </div>
              <div>
                <p className="font-light text-neutral-900 mb-1">Del vennerabatt</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  Gi {referralGivePercentage}% rabatt til venner og få {referralEarnPercentage}% kreditt selv. Finn din kode på{' '}
                  <Link href="/min-side" className="underline font-normal hover:text-neutral-900 transition-colors">Min side</Link>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                3
              </div>
              <div>
                <p className="font-light text-neutral-900 mb-1">Grisene vokser opp</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  Grisene lever på gården gjennom {deliveryYear} og blir slaktet lokalt i desember.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-light text-lg bg-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                4
              </div>
              <div>
                <p className="font-light text-neutral-900 mb-1">Betaling av rest og levering</p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  Restbeløpet betales ved levering i desember {deliveryYear}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/"
            className="px-10 py-4 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl text-sm font-light uppercase tracking-wide text-center hover:bg-neutral-100 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Tilbake til forsiden
          </Link>
          <Link
            href="/min-side"
            className="px-10 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            Se mine ordrer
          </Link>
        </div>
      </div>
    </div>
  );
}
