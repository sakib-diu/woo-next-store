'use client'

import { getProductVariationsById } from '@/actions/products-actions'
import { VariationProduct } from '@/types/product-type'
import useSWR from 'swr'

const fetchVariations = async (id: number) => {
    const result = await getProductVariationsById({ id: id.toString() })
    if (result.status !== 'OK') {
        throw new Error(`Failed to fetch variations for product ${id}`)
    }
    return result.variations ?? []
}

/**
 * Fetches a product's variations, deduped and cached by product ID across every
 * component that asks for the same product — e.g. a grid card and the quick-view
 * modal opened from it share one request instead of each fetching independently.
 */
export function useProductVariations(productId: number, shouldFetch: boolean) {
    const { data, error, isLoading } = useSWR<VariationProduct[]>(
        shouldFetch ? ['product-variations', productId] : null,
        ([, id]) => fetchVariations(id as number),
        { revalidateOnFocus: false, revalidateIfStale: false }
    )

    return {
        variations: data ?? [],
        isLoading,
        error,
    }
}
