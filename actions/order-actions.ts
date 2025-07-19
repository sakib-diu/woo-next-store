"use server"

import { OrderData, orderDataSchema } from "@/lib/validation";
import { LineItem, OrderType } from "@/types/order-type";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import Cookies from "js-cookie";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";


const WooCommerce = new WooCommerceRestApi({
    url: process.env.WORDPRESS_SITE_URL as string,
    consumerKey: process.env.WC_CONSUMER_KEY! as string,
    consumerSecret: process.env.WC_CONSUMER_SECRET! as string,
    version: "wc/v3",
});


export async function createOrder({
    orderData,
    lineItems,
    coupon_lines,
    cart_tax,
    shipping_lines,
}: {
    orderData: OrderData;
    lineItems: LineItem[];
    cart_tax: number;
    shipping_lines?: { total: string, method_id: string, method_title: string }[];
    coupon_lines?: { code: string }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ success: boolean, order?: OrderType, error?: any }> {


    const validatedData = orderDataSchema.parse(orderData)

    const storedUser = (await cookies()).get("user")?.value
    // const email = JSON.parse(storedUser!).user_email
    const userId = storedUser ? (JSON.parse(storedUser).user_id || 0) : 0;
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')

    // Construct the order payload
    const payload = {
        ...validatedData,
        customer_id: userId || 0,
        cart_tax,
        line_items: lineItems,
        customer_ip_address: ip as string,
        set_paid: false, // COD orders are typically not paid upfront
        needs_payment: true,
        status: validatedData.payment_method === "cod" ? "processing" : "pending", // Set initial status (adjust as needed)
        shipping_lines: shipping_lines || [],
        coupon_lines: coupon_lines || [],
    };

    try {
        const response = await WooCommerce.post("orders", payload);

        revalidatePath('/')
        return { order: response.data, success: true };
    } catch {
        // const errorMessage = error || "Failed to create order";
        const res = { error: "failed", success: false }
        return res;
    }
}


// Function to fetch order data
export async function getOrder(orderId: string): Promise<OrderType | null> {
    try {
        const response = await WooCommerce.get(`orders/${orderId}`)
        return response.data as OrderType
    } catch (error) {
        console.error("Error fetching order:", error)
        return null
    }
}

export const fetchOrdersByUserId = async ({
    params,
}: {
    params: { userId: number };
}): Promise<{
    orders: OrderType[];
    totalItems: number;
    status: 'OK' | 'ERROR';
}> => {
    let allOrders: OrderType[] = [];
    let page = 1;
    let totalPages = 1;
    let totalItems = 0;

    try {
        do {
            const response = await WooCommerce.get("orders", {
                per_page: 100,
                page: page,
                customer: params.userId,
            });

            if (response.data && Array.isArray(response.data)) {
                allOrders = allOrders.concat(response.data);
            }

            if (page === 1 && response.headers) {
                if (response.headers['x-wp-totalpages']) {
                    totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
                }
                if (response.headers['x-wp-total']) {
                    totalItems = parseInt(response.headers['x-wp-total'], 10);
                }
            }

            page++;
        } while (page <= totalPages);

        return {
            orders: allOrders,
            totalItems: totalItems,
            status: 'OK',
        };
    } catch (error) {
        console.error(`Error fetching orders for user ${params.userId}:`, error);
        return {
            orders: [],
            totalItems: 0,
            status: 'ERROR',
        };
    }
};


export async function updateOrderStatus(orderId: number, status: string, transactionId: string, paid: boolean, date: string) {
    try {
        const payload = {
            status,
            transaction_id: transactionId,
            set_paid: paid,
            date_paid: date,
            // customer_note: `Payment completed via Stripe. Transaction ID: ${transactionId}`
        };
        await WooCommerce.put(`orders/${orderId}`, payload);
        return { success: true };
    } catch (err) {
        console.error(`Failed to update order ${orderId}:`, err);
        return { success: false, error: "Failed to update order status." };
    }
}