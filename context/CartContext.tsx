'use client'

import {
    addCartItem,
    applyCartCoupon,
    clearCart as clearCartAction,
    fetchCart,
    removeCartCoupon,
    removeCartItem,
    selectCartShippingRate,
    updateCartItemQuantity,
    updateCustomerAddress as updateCustomerAddressAction,
} from '@/actions/cart-actions';
import type { StoreApiAddress, StoreApiResult } from '@/lib/store-api-client';
import { StoreApiCart } from '@/types/store-api-type';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type { StoreApiCartItem as CartItem } from '@/types/store-api-type';

// Shape matches StoreApiCartItem['variation'] entries so callers can merge/render them uniformly.
export interface DisplayAttribute {
    attribute: string;
    value: string;
}

// Some catalogs assign a non-variation attribute (e.g. "Size") to a `simple` WooCommerce
// product just to list descriptive options, with no real per-value variation, price, or stock
// behind it. WooCommerce's Store API correctly reflects that there's nothing to select —
// `item.variation` is empty for these lines. This label map is a cosmetic-only, client-side
// annotation of "what the shopper clicked" for display purposes; it never drives price, stock,
// or cart-line identity — those stay entirely Store API-driven.
const ITEM_LABELS_STORAGE_KEY = 'cartItemLabels';

const EMPTY_CART: StoreApiCart = {
    items: [],
    coupons: [],
    totals: {
        total_items: '0',
        total_items_tax: '0',
        total_fees: '0',
        total_fees_tax: '0',
        total_discount: '0',
        total_discount_tax: '0',
        total_shipping: null,
        total_shipping_tax: null,
        total_price: '0',
        total_tax: '0',
        tax_lines: [],
        currency_code: 'USD',
        currency_symbol: '$',
        currency_minor_unit: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
        currency_prefix: '$',
        currency_suffix: '',
    },
    needs_payment: false,
    needs_shipping: false,
    has_calculated_shipping: false,
    shipping_rates: [],
    items_count: 0,
    items_weight: 0,
    errors: [],
};

type MutationResult = { success: boolean; error?: string };

interface CartContextProps {
    cart: StoreApiCart;
    /** True only while the cart is hydrating from the server on first load. */
    isLoading: boolean;
    /** True while any add/update/remove/coupon call is in flight. */
    isMutating: boolean;
    /** The item key currently being updated/removed, if any — for per-row loading UI. */
    mutatingKey: string | null;
    /** The most recent mutation's error, if any (e.g. "out of stock"). */
    error: string | null;
    /** Cosmetic-only "what was clicked" labels for cart lines with no real WooCommerce variation, keyed by item key. */
    itemLabels: Record<string, DisplayAttribute[]>;
    addToCart: (id: number, quantity: number, displayAttributes?: DisplayAttribute[]) => Promise<MutationResult>;
    updateCartItem: (key: string, quantity: number) => Promise<MutationResult>;
    removeFromCart: (key: string) => Promise<MutationResult>;
    applyCoupon: (code: string) => Promise<MutationResult>;
    removeCoupon: (code: string) => Promise<MutationResult>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
    updateCustomerAddress: (billing: StoreApiAddress, shipping?: StoreApiAddress) => Promise<MutationResult>;
    selectShippingRate: (packageId: number | string, rateId: string) => Promise<MutationResult>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<StoreApiCart>(EMPTY_CART);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [mutatingKey, setMutatingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [itemLabels, setItemLabels] = useState<Record<string, DisplayAttribute[]>>({});

    useEffect(() => {
        try {
            const stored = localStorage.getItem(ITEM_LABELS_STORAGE_KEY);
            if (stored) setItemLabels(JSON.parse(stored));
        } catch {
            // Cosmetic-only data — safe to ignore a corrupt/missing entry.
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchCart().then((result) => {
            if (cancelled) return;
            if (result.ok) {
                setCart(result.cart);
            } else {
                setError(result.error);
            }
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Drop labels for lines that no longer exist in the cart (removed, or quantity dropped to 0).
    // Skipped until the initial cart fetch resolves, since `cart.items` starts empty and would
    // otherwise wipe every stored label before the real cart ever loads.
    useEffect(() => {
        if (isLoading) return;
        setItemLabels((prev) => {
            const liveKeys = new Set(cart.items.map((item) => item.key));
            const next: Record<string, DisplayAttribute[]> = {};
            let changed = false;
            for (const key of Object.keys(prev)) {
                if (liveKeys.has(key)) {
                    next[key] = prev[key];
                } else {
                    changed = true;
                }
            }
            if (!changed) return prev;
            localStorage.setItem(ITEM_LABELS_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, [cart.items, isLoading]);

    const runMutation = useCallback(
        async (
            action: () => Promise<StoreApiResult>,
            key: string | null = null,
            onSuccess?: (cart: StoreApiCart) => void
        ): Promise<MutationResult> => {
            setIsMutating(true);
            setMutatingKey(key);
            setError(null);

            const result = await action();

            if (result.ok) {
                setCart(result.cart);
                onSuccess?.(result.cart);
            } else {
                setError(result.error);
            }

            setIsMutating(false);
            setMutatingKey(null);

            return result.ok ? { success: true } : { success: false, error: result.error };
        },
        []
    );

    const addToCart = useCallback(
        (id: number, quantity: number, displayAttributes?: DisplayAttribute[]) =>
            runMutation(
                () => addCartItem(id, quantity),
                null,
                (updatedCart) => {
                    if (!displayAttributes || displayAttributes.length === 0) return;
                    // Simple products carry no `variation` data of their own — attach the
                    // cosmetic label to whichever line matches the id that was just added.
                    const addedItem = updatedCart.items.find((item) => item.id === id && item.type !== 'variation');
                    if (!addedItem) return;
                    setItemLabels((prev) => {
                        const next = { ...prev, [addedItem.key]: displayAttributes };
                        localStorage.setItem(ITEM_LABELS_STORAGE_KEY, JSON.stringify(next));
                        return next;
                    });
                }
            ),
        [runMutation]
    );

    const updateCartItem = useCallback(
        (key: string, quantity: number) => runMutation(() => updateCartItemQuantity(key, quantity), key),
        [runMutation]
    );

    const removeFromCart = useCallback(
        (key: string) => runMutation(() => removeCartItem(key), key),
        [runMutation]
    );

    const applyCoupon = useCallback(
        (code: string) => runMutation(() => applyCartCoupon(code)),
        [runMutation]
    );

    const removeCoupon = useCallback(
        (code: string) => runMutation(() => removeCartCoupon(code)),
        [runMutation]
    );

    const clearCart = useCallback(async () => {
        await runMutation(() => clearCartAction());
    }, [runMutation]);

    const updateCustomerAddress = useCallback(
        (billing: StoreApiAddress, shipping?: StoreApiAddress) =>
            runMutation(() => updateCustomerAddressAction(billing, shipping)),
        [runMutation]
    );

    const selectShippingRate = useCallback(
        (packageId: number | string, rateId: string) => runMutation(() => selectCartShippingRate(packageId, rateId)),
        [runMutation]
    );

    const refreshCart = useCallback(async () => {
        const result = await fetchCart();
        if (result.ok) setCart(result.cart);
    }, []);

    return (
        <CartContext.Provider
            value={{
                cart,
                isLoading,
                isMutating,
                mutatingKey,
                error,
                itemLabels,
                addToCart,
                updateCartItem,
                removeFromCart,
                applyCoupon,
                removeCoupon,
                clearCart,
                refreshCart,
                updateCustomerAddress,
                selectShippingRate,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
