import { getOrder, updateOrderStatus } from '@/actions/order-actions';
import Stripe from 'stripe';

// Stripe's SDK needs Node crypto for signature verification — not available on the Edge runtime.
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const orderId = paymentIntent.metadata?.woocommerce_order_id;
    if (!orderId) {
        console.error('[stripe webhook] payment_intent.succeeded with no woocommerce_order_id metadata', paymentIntent.id);
        return;
    }

    const order = await getOrder(orderId);
    if (!order) {
        console.error(`[stripe webhook] order ${orderId} not found for payment_intent ${paymentIntent.id}`);
        return;
    }

    // Never trust the PaymentIntent's own metadata for the amount — re-derive what the order
    // should cost and compare against what Stripe actually received before marking it paid.
    const expectedAmount = Math.round(parseFloat(order.total) * 100);
    const amountReceived = paymentIntent.amount_received;
    const currencyMatches = paymentIntent.currency === order.currency.toLowerCase();

    if (amountReceived !== expectedAmount || !currencyMatches) {
        console.error(
            `[stripe webhook] amount/currency mismatch for order ${orderId}: expected ${expectedAmount} ${order.currency}, got ${amountReceived} ${paymentIntent.currency}. Order left untouched for manual review.`
        );
        return;
    }

    const result = await updateOrderStatus(order.id, 'processing', paymentIntent.id, true, new Date().toISOString());
    if (!result.success) {
        console.error(`[stripe webhook] failed to mark order ${orderId} paid:`, result.error);
    }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const orderId = paymentIntent.metadata?.woocommerce_order_id;
    if (!orderId) {
        console.error('[stripe webhook] payment_intent.payment_failed with no woocommerce_order_id metadata', paymentIntent.id);
        return;
    }

    const order = await getOrder(orderId);
    if (!order) {
        console.error(`[stripe webhook] order ${orderId} not found for payment_intent ${paymentIntent.id}`);
        return;
    }

    const result = await updateOrderStatus(order.id, 'failed', paymentIntent.id, false, new Date().toISOString());
    if (!result.success) {
        console.error(`[stripe webhook] failed to mark order ${orderId} failed:`, result.error);
    }
}

export async function POST(req: Request) {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        console.error('[stripe webhook] missing signature header or STRIPE_WEBHOOK_SECRET');
        return new Response('Webhook signature verification failed', { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[stripe webhook] signature verification failed:', message);
        return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
            break;
        default:
            break;
    }

    // Acknowledge receipt even for mismatches/unhandled events — Stripe retries on non-2xx,
    // and we've already logged anything that needs manual follow-up.
    return Response.json({ received: true });
}
