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

async function storeApiRequest(
    path: string,
    options: { method?: "GET" | "POST" | "DELETE"; body?: Record<string, unknown> } = {}
): Promise<StoreApiResult> {
    const { method = "GET", body } = options;
    const cookieStore = await cookies();
    const cartToken = cookieStore.get(CART_TOKEN_COOKIE)?.value;
    const nonce = cookieStore.get(CART_NONCE_COOKIE)?.value;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (cartToken) headers["Cart-Token"] = cartToken;
    // Mutating requests are rejected without a valid nonce from a prior response.
    if (method !== "GET" && nonce) headers["Nonce"] = nonce;

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
            return { ok: false, error: json.message || "Something went wrong with your cart. Please try again." };
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
