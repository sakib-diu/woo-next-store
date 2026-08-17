import { cookies } from "next/headers";
import { StoreApiCart, isStoreApiError } from "@/types/store-api-type";

const wordpressSiteUrl = process.env.WORDPRESS_SITE_URL;

if (!wordpressSiteUrl) {
    throw new Error("WORDPRESS_SITE_URL is not defined in environment variables");
}

const storeApiEndpoint = `${wordpressSiteUrl}/wp-json/wc/store/v1`;

const CART_TOKEN_COOKIE = "wc_cart_token";
const CART_NONCE_COOKIE = "wc_cart_nonce";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days; WooCommerce transparently reissues an expired Cart-Token

const cartCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
};

export type StoreApiResult =
    | { ok: true; cart: StoreApiCart }
    | { ok: false; error: string };

// Store API address shape — used for both /cart/update-customer and /checkout.
export interface StoreApiAddress {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
}

export interface StoreApiCheckoutPaymentResult {
    payment_status: string;
    redirect_url: string;
}

export type StoreApiCheckoutResult =
    | { ok: true; orderId: number; status: string; paymentResult: StoreApiCheckoutPaymentResult | null }
    | { ok: false; error: string };

// A `rest_invalid_param` error's top-level message is just "Invalid parameter(s): x, y" —
// the actual reason (e.g. "The provided postcode / ZIP is not valid") lives in `data.params`.
function describeStoreApiError(json: import("@/types/store-api-type").StoreApiErrorResponse): string {
    const params = json.data?.params;
    if (params && Object.keys(params).length > 0) {
        return Object.values(params).join(" ");
    }
    return json.message || "Something went wrong. Please try again.";
}

async function persistSessionHeaders(response: Response) {
    const cookieStore = await cookies();
    const cartToken = response.headers.get("Cart-Token");
    const nonce = response.headers.get("Nonce");

    if (cartToken) {
        cookieStore.set(CART_TOKEN_COOKIE, cartToken, cartCookieOptions);
    }
    if (nonce) {
        cookieStore.set(CART_NONCE_COOKIE, nonce, cartCookieOptions);
    }
}

async function getSessionHeaders(method: "GET" | "POST" | "DELETE"): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const cartToken = cookieStore.get(CART_TOKEN_COOKIE)?.value;
    const nonce = cookieStore.get(CART_NONCE_COOKIE)?.value;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (cartToken) headers["Cart-Token"] = cartToken;
    // Mutating requests are rejected without a valid nonce from a prior response.
    if (method !== "GET" && nonce) headers["Nonce"] = nonce;
    return headers;
}

async function storeApiRequest(
    path: string,
    options: { method?: "GET" | "POST" | "DELETE"; body?: Record<string, unknown> } = {}
): Promise<StoreApiResult> {
    const { method = "GET", body } = options;
    const headers = await getSessionHeaders(method);

    try {
        const response = await fetch(`${storeApiEndpoint}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            cache: "no-store",
        });

        await persistSessionHeaders(response);

        const json = await response.json();

        if (!response.ok || isStoreApiError(json)) {
            return { ok: false, error: describeStoreApiError(json) };
        }

        return { ok: true, cart: json as StoreApiCart };
    } catch (error) {
        console.error("Store API request failed:", error);
        return { ok: false, error: "Could not connect to the store. Please try again." };
    }
}

export const getCart = () => storeApiRequest("/cart");

export const addCartItem = (id: number, quantity: number) =>
    storeApiRequest("/cart/add-item", { method: "POST", body: { id, quantity } });

export const updateCartItem = (key: string, quantity: number) =>
    storeApiRequest("/cart/update-item", { method: "POST", body: { key, quantity } });

export const removeCartItem = (key: string) =>
    storeApiRequest("/cart/remove-item", { method: "POST", body: { key } });

export const applyCoupon = (code: string) =>
    storeApiRequest("/cart/apply-coupon", { method: "POST", body: { code } });

export const removeCoupon = (code: string) =>
    storeApiRequest("/cart/remove-coupon", { method: "POST", body: { code } });

// The DELETE cart/items endpoint returns a bare `[]`, not a full cart object,
// unlike every other Store API cart endpoint — re-fetch to get the real (now-empty) cart.
export const clearCartItems = async (): Promise<StoreApiResult> => {
    const result = await storeApiRequest("/cart/items", { method: "DELETE" });
    if (!result.ok) return result;
    return storeApiRequest("/cart");
};

export const updateCustomer = (billing_address: StoreApiAddress, shipping_address?: StoreApiAddress) =>
    storeApiRequest("/cart/update-customer", {
        method: "POST",
        body: { billing_address, ...(shipping_address ? { shipping_address } : {}) },
    });

export const selectShippingRate = (packageId: number | string, rateId: string) =>
    storeApiRequest("/cart/select-shipping-rate", {
        method: "POST",
        body: { package_id: packageId, rate_id: rateId },
    });

// Response shape differs from every other Store API cart endpoint (order info, not a cart), so
// this doesn't go through storeApiRequest — it reuses the same cookie/header plumbing directly.
export const checkout = async (payload: {
    billing_address: StoreApiAddress;
    shipping_address: StoreApiAddress;
    payment_method: string;
    payment_data?: { key: string; value: string }[];
    customer_note?: string;
}): Promise<StoreApiCheckoutResult> => {
    const headers = await getSessionHeaders("POST");

    try {
        const response = await fetch(`${storeApiEndpoint}/checkout`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        await persistSessionHeaders(response);

        const json = await response.json();

        if (!response.ok || isStoreApiError(json)) {
            return { ok: false, error: describeStoreApiError(json) };
        }

        return {
            ok: true,
            orderId: json.order_id,
            status: json.status,
            paymentResult: json.payment_result ?? null,
        };
    } catch (error) {
        console.error("Store API checkout request failed:", error);
        return { ok: false, error: "Could not connect to the store. Please try again." };
    }
};
