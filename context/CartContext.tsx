'use client'

import {
    addCartItem,
    applyCartCoupon,
    clearCart as clearCartAction,
    fetchCart,
    removeCartCoupon,
    removeCartItem,
    updateCartItemQuantity,
} from '@/actions/cart-actions';
import type { StoreApiResult } from '@/lib/store-api-client';
import { StoreApiCart } from '@/types/store-api-type';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type { StoreApiCartItem as CartItem } from '@/types/store-api-type';

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
    addToCart: (id: number, quantity: number) => Promise<MutationResult>;
    updateCartItem: (key: string, quantity: number) => Promise<MutationResult>;
    removeFromCart: (key: string) => Promise<MutationResult>;
    applyCoupon: (code: string) => Promise<MutationResult>;
    removeCoupon: (code: string) => Promise<MutationResult>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<StoreApiCart>(EMPTY_CART);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [mutatingKey, setMutatingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    const runMutation = useCallback(
        async (action: () => Promise<StoreApiResult>, key: string | null = null): Promise<MutationResult> => {
            setIsMutating(true);
            setMutatingKey(key);
            setError(null);

            const result = await action();

            if (result.ok) {
                setCart(result.cart);
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
        (id: number, quantity: number) => runMutation(() => addCartItem(id, quantity)),
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
                addToCart,
                updateCartItem,
                removeFromCart,
                applyCoupon,
                removeCoupon,
                clearCart,
                refreshCart,
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
