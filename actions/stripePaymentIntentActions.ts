'use server';

import Stripe from 'stripe';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { OrderType } from '@/types/order-type';
import { getOrder } from './order-actions';

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function createPaymentIntent(orderId: number) {
    if (!orderId) {
        return { error: 'Order ID is required.' };
    }

    try {
        // 1. Retrieve the order to get the final amount
        const order = await getOrder(orderId.toString())
        if (!order) {
            return { error: "Order not Found" }
        }


        // Convert the total amount to the smallest currency unit (e.g., cents)
        const amountInCents = Math.round(parseFloat(order.total) * 100);

        // 2. Create a PaymentIntent on the server
        const paymentIntent = await stripe.paymentIntents.create(
            {
                payment_method_types: ['card'],
                amount: amountInCents,
                currency: order.currency.toLowerCase(),
                // automatic_payment_methods: {
                //     enabled: true,
                // },
                // Link the Stripe payment to your WooCommerce order
                metadata: {
                    woocommerce_order_id: order.id.toString(),
                },
            },
            // Retrying create-intent for the same order (e.g. a flaky network response) reuses
            // the same PaymentIntent instead of spawning a duplicate.
            { idempotencyKey: `pi_create_${order.id}` }
        );

        // 3. Return only the client_secret to the frontend
        return { clientSecret: paymentIntent.client_secret, orderId: order.id };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return { error: `Error creating Payment Intent: ${errorMessage}` };
    }
}