'use client'

import { Product as ProductType } from '@/types/product-type';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { getProductsByIds } from '@/actions/products-actions';

// Interfaces and Types remain the same
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WishlistItem extends ProductType { }

interface WishlistState {
    wishlistArray: WishlistItem[];
}

type WishlistAction =
    | { type: 'ADD_TO_WISHLIST'; payload: ProductType }
    | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
    | { type: 'LOAD_WISHLIST'; payload: WishlistItem[] };

interface WishlistContextProps {
    wishlistState: WishlistState;
    addToWishlist: (item: ProductType) => void;
    removeFromWishlist: (itemId: string) => void;
}

// Define constants for local storage and caching
const LOCAL_STORAGE_KEYS = {
    wishlist: 'wishlistItems',
    lastRefreshed: 'wishlistLastRefreshed',
};
const REFRESH_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

const WishlistContext = createContext<WishlistContextProps | undefined>(undefined);

// Updated reducer to prevent duplicates
const WishlistReducer = (state: WishlistState, action: WishlistAction): WishlistState => {
    switch (action.type) {
        case 'ADD_TO_WISHLIST':
            // Prevent adding duplicate items
            if (state.wishlistArray.some(item => item.id === action.payload.id)) {
                return state;
            }
            const newItem: WishlistItem = { ...action.payload };
            return {
                ...state,
                wishlistArray: [...state.wishlistArray, newItem],
            };
        case 'REMOVE_FROM_WISHLIST':
            return {
                ...state,
                wishlistArray: state.wishlistArray.filter((item) => item.id.toString() !== action.payload),
            };
        case 'LOAD_WISHLIST':
            return {
                ...state,
                wishlistArray: action.payload,
            };
        default:
            return state;
    }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wishlistState, dispatch] = useReducer(WishlistReducer, { wishlistArray: [] });

    // Effect for loading from and saving to localStorage (Persistence)
    useEffect(() => {
        try {
            const storedWishlist = localStorage.getItem(LOCAL_STORAGE_KEYS.wishlist);
            if (storedWishlist) {
                dispatch({ type: 'LOAD_WISHLIST', payload: JSON.parse(storedWishlist) });
            }
        } catch (error) {
            console.error("Failed to load wishlist from localStorage", error);
        }
    }, []); // Runs once on initial load

    useEffect(() => {
        // Avoid writing the initial empty array to localStorage
        if (wishlistState.wishlistArray.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.wishlist, JSON.stringify(wishlistState.wishlistArray));
        } else {
            // If the wishlist becomes empty, remove it from storage
            localStorage.removeItem(LOCAL_STORAGE_KEYS.wishlist);
        }
    }, [wishlistState.wishlistArray]);


    // Effect for refreshing data from the server
    useEffect(() => {
        const refreshWishlistData = async () => {
            if (wishlistState.wishlistArray.length === 0) return;

            const lastRefreshed = localStorage.getItem(LOCAL_STORAGE_KEYS.lastRefreshed);
            const now = Date.now();

            // Check if it's time to refresh
            if (!lastRefreshed || (now - parseInt(lastRefreshed, 10)) > REFRESH_INTERVAL_MS) {
                console.log("Refreshing wishlist data...");
                try {
                    const ids = wishlistState.wishlistArray.map(item => item.id);
                    const { products, status } = await getProductsByIds(ids);

                    if (status === 'OK' && products.length > 0) {
                        dispatch({ type: 'LOAD_WISHLIST', payload: products });
                        localStorage.setItem(LOCAL_STORAGE_KEYS.lastRefreshed, now.toString());
                        console.log("✅ Wishlist data refreshed and updated.");
                    }
                } catch (error) {
                    console.error("❌ Failed to refresh wishlist data:", error);
                }
            }
        };

        refreshWishlistData();
    }, [wishlistState.wishlistArray]); // Runs when the wishlist is first loaded with items

    // Action dispatchers remain the same
    const addToWishlist = (item: ProductType) => {
        dispatch({ type: 'ADD_TO_WISHLIST', payload: item });
    };

    const removeFromWishlist = (itemId: string) => {
        dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: itemId });
    };

    return (
        <WishlistContext.Provider value={{ wishlistState, addToWishlist, removeFromWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
};

// Custom hook remains the same
export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};