'use client';

import { checkOrderExists } from '@/actions/order-actions';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { PaymentIntent, StripeElementsOptions } from '@stripe/stripe-js';
import { useCallback, useEffect, useState } from 'react';
import { stripePromise } from '../../lib/stripe';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';

// Extended payment intent type to include metadata
interface PaymentIntentWithMetadata extends PaymentIntent {
    metadata?: Record<string, string>;
}

interface StripeCheckoutProps {
    orderId: number; // Required prop - more reliable than metadata
    clientSecret: string;
    onSuccess?: (paymentIntent: { id: string; status: string }, orderId: string) => void;
    onError?: (error: string) => void;
}

const PaymentForm = ({
    orderId,
    clientSecret,
    onSuccess,
    onError
}: {
    orderId: number;
    onSuccess?: (paymentIntent: { id: string; status: string }, orderId: string) => void;
    onError?: (error: string) => void;
    clientSecret: string;
}) => {
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
    const { clearCart } = useCart()
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    // The order is only ever marked paid by the Stripe webhook (server-verified against the
    // real charge amount) — this just waits briefly for that to land so the thank-you page
    // doesn't flash "Pending Payment", then redirects regardless once the wait is up.
    const ORDER_POLL_INTERVAL_MS = 1500;
    const ORDER_POLL_MAX_ATTEMPTS = 6;

    const finalizeSuccess = useCallback(async (paymentIntent: PaymentIntentWithMetadata) => {
        setIsConfirmingOrder(true);
        setMessage('Payment successful! Confirming your order...');
        try {
            const orderIdFromMetadata = paymentIntent.metadata?.woocommerce_order_id;
            const finalOrderId = orderId || (orderIdFromMetadata ? parseInt(orderIdFromMetadata) : undefined);

            if (!finalOrderId) {
                throw new Error('Order ID not available from props or payment intent metadata');
            }

            for (let attempt = 0; attempt < ORDER_POLL_MAX_ATTEMPTS; attempt++) {
                const order = await checkOrderExists(finalOrderId);
                if (order?.is_paid) break;
                await new Promise((resolve) => setTimeout(resolve, ORDER_POLL_INTERVAL_MS));
            }

            clearCart();
            setMessage('Redirecting to thank you page...');
            router.push(`/checkout/thank-you?orderId=${finalOrderId}`);
        } catch (error) {
            console.error('Error confirming order:', error);
            setMessage('Payment successful, but we could not confirm your order. Please contact support.');
        } finally {
            setIsConfirmingOrder(false);
        }
    }, [orderId, router, clearCart]);

    useEffect(() => {
        if (!stripe) {
            return;
        }


        if (!clientSecret) {
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(async ({ paymentIntent }) => {
            if (!paymentIntent) return;

            // Use orderId prop primarily, with metadata as fallback
            const extendedPaymentIntent = paymentIntent as PaymentIntentWithMetadata;
            const orderIdFromMetadata = extendedPaymentIntent.metadata?.woocommerce_order_id;
            const finalOrderId = orderId || orderIdFromMetadata;

            switch (paymentIntent.status) {
                case 'succeeded':
                    await finalizeSuccess(extendedPaymentIntent);
                    if (finalOrderId) {
                        onSuccess?.(paymentIntent, finalOrderId.toString());
                    }
                    break;
                case 'processing':
                    setMessage('Your payment is processing.');
                    break;
                case 'requires_payment_method':
                    onError?.('Payment failed');
                    break;
                default:
                    setMessage('Something went wrong.');
                    onError?.('Unknown error occurred');
                    break;
            }
        });
    }, [stripe, onSuccess, onError, finalizeSuccess, clientSecret, orderId]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!stripe || !elements) {
            setMessage('Stripe has not loaded properly. Please refresh and try again.');
            return;
        }

        setIsProcessing(true);
        setMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/thank-you`,
            },
            redirect: 'if_required'
        });

        if (error) {
            if (error.type === 'card_error' || error.type === 'validation_error') {
                setMessage(error.message || 'Payment failed. Please check your card details.');
            } else {
                setMessage('An unexpected error occurred. Please try again.');
            }
            onError?.(error.message || 'Payment failed');
        } else if (paymentIntent) {
            const extendedPaymentIntent = paymentIntent as PaymentIntentWithMetadata;
            await finalizeSuccess(extendedPaymentIntent);
            // Use orderId prop primarily, with metadata as fallback
            const orderIdFromMetadata = extendedPaymentIntent.metadata?.woocommerce_order_id;
            const finalOrderId = orderId || orderIdFromMetadata;
            if (finalOrderId) {
                onSuccess?.(paymentIntent, finalOrderId.toString());
            }
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6 ">
            <div className="payment-element-container">
                <PaymentElement
                    options={{
                        layout: 'tabs'
                    }}
                />
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing || isConfirmingOrder}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${!stripe || isProcessing || isConfirmingOrder
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'
                    }`}
            >
                {isProcessing || isConfirmingOrder ? (
                    <div className="flex items-center justify-center gap-2">
                        <Icon.CircleNotchIcon className="animate-spin" size={16} />
                        {isProcessing ? 'Processing Payment...' : 'Confirming Order...'}
                    </div>
                ) : (
                    'Complete Payment'
                )}
            </button>

            {message && (
                <div className={`p-3 rounded-lg text-center text-sm ${message.includes('succeeded') || message.includes('successful')
                    ? 'bg-green-200 text-green-800 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                    {message}
                </div>
            )}
        </form>
    );
};

export default function StripeCheckout({
    orderId, // Now required
    clientSecret,
    onSuccess,
    onError
}: StripeCheckoutProps) {
    const options: StripeElementsOptions = {
        clientSecret,
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#000000',
                colorBackground: '#ffffff',
                colorText: '#000000',
                colorDanger: '#df1b41',
                fontFamily: 'system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
            },
        },
    };

    if (!clientSecret) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3">
                    <Icon.CircleNotchIcon className="animate-spin" size={24} />
                    <span className="text-gray-600">Loading payment form...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="stripe-checkout-container bg-white w-fit mx-auto rounded-lg shadow-md">
            <Elements options={options} stripe={stripePromise}>
                <PaymentForm orderId={orderId} onSuccess={onSuccess} onError={onError} clientSecret={clientSecret} />
            </Elements>
        </div>
    );
}