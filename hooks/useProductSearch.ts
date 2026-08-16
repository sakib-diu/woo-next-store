'use client'

import { getProducts } from '@/actions/products-actions'
import { Product } from '@/types/product-type'
import useSWR from 'swr'

const SUGGESTIONS_LIMIT = 6

const fetchSuggestions = async (search: string) => {
    const result = await getProducts({ search, perPage: SUGGESTIONS_LIMIT })
    if (result.status !== 'OK') {
        throw new Error(`Failed to fetch product suggestions for "${search}"`)
    }
    return result.products
}

/**
 * Predictive search suggestions for a (typically debounced) keyword. Only fires once the
 * keyword is long enough to be worth a request, mirroring useProductVariations' shouldFetch gate.
 */
export function useProductSearch(keyword: string) {
    const trimmed = keyword.trim()
    const shouldFetch = trimmed.length > 1

    const { data, error, isLoading } = useSWR<Product[]>(
        shouldFetch ? ['product-search', trimmed] : null,
        ([, search]) => fetchSuggestions(search as string),
        { revalidateOnFocus: false, revalidateIfStale: false, keepPreviousData: true }
    )

    return {
        suggestions: data ?? [],
        isLoading: shouldFetch && isLoading,
        error,
    }
}
