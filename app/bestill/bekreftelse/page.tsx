"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { CheckCircle, Package, Clock, CreditCard } from "lucide-react";

export default function ConfirmationPage() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
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
      <div className={cn("min-h-screen flex items-center justify-center", theme.bgGradientHero)}>
        <div className={cn("text-lg", theme.textPrimary)}>Laster...</div>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center px-6", theme.bgGradientHero)}>
        <div className={cn("text-center max-w-md rounded-3xl p-8 border shadow-2xl", theme.bgCard, theme.glassBorder)}>
          <h1 className={cn("text-2xl font-bold mb-4", theme.textPrimary)}>Ordre ikke funnet</h1>
          <p className={cn("mb-6", theme.textMuted)}>Vi kunne ikke finne ordren din.</p>
          <Link
            href="/"
            className={cn("inline-block px-6 py-3 rounded-xl font-semibold transition-all duration-300", theme.buttonPrimary, theme.textOnDark)}
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
    <div className={cn("min-h-screen", theme.bgGradientHero)}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className={cn("inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
            paymentStatus === 'completed' ? "bg-green-100" :
            paymentStatus === 'failed' ? "bg-red-100" :
            "bg-yellow-100")}>
            <CheckCircle className={cn("w-12 h-12",
              paymentStatus === 'completed' ? "text-green-600" :
              paymentStatus === 'failed' ? "text-red-600" :
              "text-yellow-600")} />
          </div>
          <h1 className={cn("text-4xl font-bold mb-2", theme.textPrimary)}>
            {paymentStatus === 'completed' ? 'Betaling mottatt!' :
             paymentStatus === 'failed' ? 'Betaling feilet' :
             'Venter på betalingsbekreftelse...'}
          </h1>
          <p className={cn("text-lg", theme.textMuted)}>
            Ordrenummer: <span className={cn("font-mono font-semibold", theme.textPrimary)}>{order.order_number}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <div className={cn("rounded-3xl p-8 border shadow-2xl mb-6", theme.bgCard, theme.glassBorder)}>
          <h2 className={cn("text-2xl font-bold mb-6", theme.textPrimary)}>Ordredetaljer</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Package className={cn("w-5 h-5 mt-1", theme.iconColor)} />
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Kassestørrelse</p>
                <p className={cn(theme.textMuted)}>{order.box_size} kg</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CreditCard className={cn("w-5 h-5 mt-1", theme.iconColor)} />
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Forskudd ({depositPercentage}%)</p>
                <p className={cn(theme.textMuted)}>{depositAmount.toLocaleString('nb-NO')} kr</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className={cn("w-5 h-5 mt-1", theme.iconColor)} />
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Status</p>
                <p className={cn(theme.textMuted)}>
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
        <div className={cn("rounded-3xl p-8 border shadow-2xl mb-6", theme.bgCard, theme.glassBorder)}>
          <h2 className={cn("text-2xl font-bold mb-6", theme.textPrimary)}>Neste steg</h2>

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
              <div className={cn("p-4 rounded-xl border-2 border-green-500 bg-green-50")}>
                <p className="text-green-900 font-semibold">Forskudd bekreftet! ✓</p>
                <p className="text-sm text-green-800 mt-1">
                  Vi har mottatt forskudd. Du vil motta en påminnelse om restbetaling ca. 2 uker før henting.
                </p>
              </div>
            )}

            {order.status === 'paid' && (
              <div className={cn("p-4 rounded-xl border-2 border-green-500 bg-green-50")}>
                <p className="text-green-900 font-semibold">Fullstendig betalt! ✓</p>
                <p className="text-sm text-green-800 mt-1">
                  Takk for full betaling. Din bestilling vil bli klargjort for henting.
                </p>
              </div>
            )}

            <div className={cn("flex gap-4 p-4 rounded-xl", theme.bgSecondary)}>
              <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold", theme.bgDark, theme.textOnDark)}>
                1
              </div>
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>
                  {order.status !== 'draft' ? 'Forskudd betalt ✓' : 'Betal forskudd'}
                </p>
                <p className={cn("text-sm", theme.textMuted)}>
                  {order.status !== 'draft'
                    ? 'Forskudd mottatt. Du har mottatt en e-postbekreftelse.'
                    : `Betal forskudd på ${order.deposit_amount.toLocaleString('nb-NO')} kr via Vipps.`
                  }
                </p>
              </div>
            </div>

            <div className={cn("flex gap-4 p-4 rounded-xl", theme.bgSecondary)}>
              <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold", theme.bgDark, theme.textOnDark)}>
                2
              </div>
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Del vennerabatt</p>
                <p className={cn("text-sm", theme.textMuted)}>
                  Gi {referralGivePercentage}% rabatt til venner og få {referralEarnPercentage}% kreditt selv. Finn din kode på{' '}
                  <Link href="/min-side" className="underline font-medium">Min side</Link>.
                </p>
              </div>
            </div>

            <div className={cn("flex gap-4 p-4 rounded-xl", theme.bgSecondary)}>
              <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold", theme.bgDark, theme.textOnDark)}>
                3
              </div>
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Grisene vokser opp</p>
                <p className={cn("text-sm", theme.textMuted)}>
                  Grisene lever på gården gjennom {deliveryYear} og blir slaktet lokalt i desember.
                </p>
              </div>
            </div>

            <div className={cn("flex gap-4 p-4 rounded-xl", theme.bgSecondary)}>
              <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold", theme.bgDark, theme.textOnDark)}>
                4
              </div>
              <div>
                <p className={cn("font-semibold", theme.textPrimary)}>Betaling av rest og levering</p>
                <p className={cn("text-sm", theme.textMuted)}>
                  Restbeløpet betales ved levering i desember {deliveryYear}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className={cn("px-8 py-4 rounded-2xl font-semibold text-center transition-all duration-300", theme.buttonSecondary, theme.textPrimary, theme.buttonSecondaryHover)}
          >
            Tilbake til forsiden
          </Link>
          <Link
            href="/min-side"
            className={cn("px-8 py-4 rounded-2xl font-semibold text-center transition-all duration-300", theme.buttonPrimary, theme.textOnDark, theme.buttonPrimaryHover)}
          >
            Se mine ordrer
          </Link>
        </div>
      </div>
    </div>
  );
}
