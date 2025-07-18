// useWishlist.ts
import { Product as ProductType } from '@/types/product-type';
import { useState } from 'react';

interface WishlistItem {
    product: Array<ProductType>;
}

const useWishlist = () => {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

    const addToWishlist = (product: Array<ProductType>) => {
        const newItem: WishlistItem = {
            product,
        };
        setWishlist((prevWishlist) => [...prevWishlist, newItem]);
    };

    const removeFromWishlist = (productId: string) => {
        setWishlist((prevWishlist) =>
            prevWishlist.map(item => ({
                product: item.product.filter(prd => prd.id.toString() !== productId)
            }))
        );
    };

    return {
        wishlist,
        addToWishlist,
        removeFromWishlist,
    };
};

export default useWishlist;
