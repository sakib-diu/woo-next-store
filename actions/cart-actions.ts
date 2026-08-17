"use server";

import * as storeApi from "@/lib/store-api-client";
import type { StoreApiAddress, StoreApiCheckoutResult, StoreApiResult } from "@/lib/store-api-client";

export async function fetchCart(): Promise<StoreApiResult> {
    return storeApi.getCart();
}

export async function addCartItem(id: number, quantity: number): Promise<StoreApiResult> {
    return storeApi.addCartItem(id, quantity);
}

export async function updateCartItemQuantity(key: string, quantity: number): Promise<StoreApiResult> {
    return storeApi.updateCartItem(key, quantity);
}

export async function removeCartItem(key: string): Promise<StoreApiResult> {
    return storeApi.removeCartItem(key);
}

export async function applyCartCoupon(code: string): Promise<StoreApiResult> {
    return storeApi.applyCoupon(code);
}

export async function removeCartCoupon(code: string): Promise<StoreApiResult> {
    return storeApi.removeCoupon(code);
}

export async function clearCart(): Promise<StoreApiResult> {
    return storeApi.clearCartItems();
}

export async function updateCustomerAddress(
    billing_address: StoreApiAddress,
    shipping_address?: StoreApiAddress
): Promise<StoreApiResult> {
    return storeApi.updateCustomer(billing_address, shipping_address);
}

export async function selectCartShippingRate(packageId: number | string, rateId: string): Promise<StoreApiResult> {
    return storeApi.selectShippingRate(packageId, rateId);
}

export async function checkoutOrder(payload: {
    billing_address: StoreApiAddress;
    shipping_address: StoreApiAddress;
    payment_method: string;
    payment_data?: { key: string; value: string }[];
    customer_note?: string;
}): Promise<StoreApiCheckoutResult> {
    return storeApi.checkout(payload);
}
