"use server"

import { OrderData, orderDataSchema } from "@/lib/validation";
import { Order } from "@/types/woocommerce";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import Cookies from "js-cookie";
import { cookies } from "next/headers";


const WooCommerce = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || "https://axessories.store/headless",
    consumerKey: process.env.WC_CONSUMER_KEY! as string,
    consumerSecret: process.env.WC_CONSUMER_SECRET! as string,
    version: "wc/v3",
});

// Type for WooCommerce line items
export type LineItem = {
    product_id: number;
    quantity: number;
};

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
    shipping_lines?: {total: string, method_id: string, method_title: string}[];
    coupon_lines?: {code: string}[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ success: boolean, order?: Order, error?: any }> {


    const validatedData = orderDataSchema.parse(orderData)

    const storedUser = (await cookies()).get("user")?.value
    // const email = JSON.parse(storedUser!).user_email
    const userId = storedUser ? (JSON.parse(storedUser).user_id || 0) : 0;


    // Construct the order payload
    const payload = {
        ...validatedData,
        customer_id: userId || 0,
        cart_tax,
        line_items: lineItems,
        set_paid: false, // COD orders are typically not paid upfront
        status: "processing", // Set initial status (adjust as needed)
        shipping_lines: shipping_lines || [],
        coupon_lines: coupon_lines || [],
    };

    try {
        const response = await WooCommerce.post("orders", payload);

        return { order: response.data, success: true };
    } catch  {
        // const errorMessage = error || "Failed to create order";
        const res = { error: "failed", success: false }
        return res;
    }
}


// Function to fetch order data
export async function getOrder(orderId: string): Promise<Order | null> {
    try {
        // Replace with your actual API endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/woocommerce/orders/${orderId}`, {
            cache: "no-store",
        })

        // if (response.status !== 201) {
        //     return null
        // }

        const order = await response.json()
        return order
    } catch (error) {
        console.error("Error fetching order:", error)
        return null
    }
}

export async function fetchOrdersByUserId(userId: number): Promise<Order[]> {
    try {
        const token = Cookies.get("jwt_token");
        if (!token) throw new Error("No authentication token found");
        const response = await WooCommerce.get("orders", {
            headers: { Authorization: `Bearer ${token}` },
            params: { customer: userId },
            caches: false,
        });
        return response.data as Order[];
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}
