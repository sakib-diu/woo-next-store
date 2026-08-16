'use client'

import { Product as ProductType, VariationProduct } from '@/types/product-type';
import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';

// --- Interfaces ---
export interface CartItem extends ProductType {
    quantity: number;
    selectedSize: string;
    selectedColor: string;
    variation_id?: string;
    selectedVariation?: VariationProduct;
}

interface CartState {
    cartArray: CartItem[];
}

// --- Action Types ---
type CartAction =
    | {
        type: 'ADD_OR_UPDATE_CART';
        payload: {
            product: ProductType;
            quantity: number;
            selectedSize: string;
            selectedColor: string;
            variation_id?: string;
            selectedVariation?: VariationProduct;
        }
    }
    | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
    | { type: 'REMOVE_FROM_CART'; payload: { itemId: string, variation_id?: string } }
    | { type: 'LOAD_CART'; payload: CartItem[] }
    | { type: 'CLEAR_CART' };

// --- Context Props ---
interface CartContextProps {
    cartState: CartState;
    addToCart: (
        product: ProductType,
        quantity: number,
        selectedSize: string,
        selectedColor: string,
        variation_id?: string,
        selectedVariation?: VariationProduct
    ) => void;
    removeFromCart: (itemId: string, variation_id?: string) => void;
    updateCart: (itemId: string, quantity: number) => void;
    clearCart: () => void;
}

// --- Constants ---
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const LOCAL_STORAGE_KEYS = {
    cart: 'cartItems',
    lastRefreshed: 'cartLastRefreshed',
};

const CartContext = createContext<CartContextProps | undefined>(undefined);

// --- Reducer ---
const cartReducer = (state: CartState, action: CartAction): CartState => {
    switch (action.type) {
        case 'ADD_OR_UPDATE_CART': {
            const { product, quantity, selectedSize, selectedColor, variation_id, selectedVariation } = action.payload;
            const findIndex = state.cartArray.findIndex(item => item.id === product.id && (item.variation_id ?? null) === (variation_id ?? null));

            if (findIndex > -1) {
                const newCartArray = [...state.cartArray];
                newCartArray[findIndex].quantity += quantity;
                return { ...state, cartArray: newCartArray };
            } else {
                const newItem: CartItem = { ...product, quantity, selectedSize, selectedColor, variation_id, selectedVariation };
                return { ...state, cartArray: [...state.cartArray, newItem] };
            }
        }
        case 'UPDATE_QUANTITY': {
            const { itemId, quantity } = action.payload;
            if (quantity <= 0) {
                return { ...state, cartArray: state.cartArray.filter(item => item.id.toString() !== itemId) };
            }
            return {
                ...state,
                cartArray: state.cartArray.map(item =>
                    item.id.toString() === itemId ? { ...item, quantity } : item
                ),
            };
        }
        case 'REMOVE_FROM_CART':
            return {
                ...state, cartArray: state.cartArray.filter((item) => {
                    if (item.id.toString() !== action.payload.itemId) return true;
                    if (action.payload.variation_id && item.variation_id) {
                        if (item.variation_id !== action.payload.variation_id) return true;
                    }
                    return false;
                })
            };

        case 'LOAD_CART':
            return { ...state, cartArray: action.payload };

        case 'CLEAR_CART':
            return { ...state, cartArray: [] };

        default:
            return state;
    }
};

// --- Provider ---
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartState, dispatch] = useReducer(cartReducer, { cartArray: [] });
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const storedCart = localStorage.getItem(LOCAL_STORAGE_KEYS.cart);
            if (storedCart) {
                dispatch({ type: 'LOAD_CART', payload: JSON.parse(storedCart) });
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
        }
        setIsHydrated(true);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (!isHydrated) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.cart, JSON.stringify(cartState.cartArray));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartState.cartArray, isHydrated]);

    // Refresh data
    useEffect(() => {
        if (!isHydrated || cartState.cartArray.length === 0) return;
        const refreshCartData = async () => { /* ... */ };
        refreshCartData();
    }, [isHydrated, cartState.cartArray]);

    const addToCart = (product: ProductType, quantity: number, selectedSize: string, selectedColor: string, variation_id?: string, selectedVariation?: VariationProduct) => {
        dispatch({ type: 'ADD_OR_UPDATE_CART', payload: { product, quantity, selectedSize, selectedColor, variation_id, selectedVariation } });
    };

    const removeFromCart = (itemId: string, variation_id?: string) => {
        dispatch({ type: 'REMOVE_FROM_CART', payload: { itemId, variation_id } });
    };

    const updateCart = (itemId: string, quantity: number) => {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
    };

    const clearCart = () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    return (
        <CartContext.Provider value={{ cartState, addToCart, removeFromCart, updateCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

// --- Custom Hook ---
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};