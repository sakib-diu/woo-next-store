'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalSearchContext } from '@/context/ModalSearchContext'
import { useAppData } from '@/context/AppDataContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useProductSearch } from '@/hooks/useProductSearch'
import { decodeEntities, decodeHtmlEntities } from '@/lib/utils'

const FEATURED_KEYWORDS_LIMIT = 6

const ModalSearch = () => {
    const { isModalOpen, closeModalSearch } = useModalSearchContext();
    const { currentCurrency, categories } = useAppData();
    const [searchKeyword, setSearchKeyword] = useState('');
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    const debouncedKeyword = useDebounce(searchKeyword, 300)
    const showSuggestions = searchKeyword.trim().length > 1
    const { suggestions, isLoading } = useProductSearch(debouncedKeyword)

    // Real, populated categories make better "featured keyword" chips than a hardcoded
    // fashion-template list that doesn't match this store's actual catalog.
    const featuredKeywords = useMemo(() => (
        categories
            .filter((category) => category.count > 0 && category.slug !== 'uncategorized')
            .sort((a, b) => b.count - a.count)
            .slice(0, FEATURED_KEYWORDS_LIMIT)
    ), [categories])

    useEffect(() => {
        if (isModalOpen) {
            inputRef.current?.focus()
        }
    }, [isModalOpen])

    const handleSearch = (value: string) => {
        router.push(`/search-result?query=${encodeURIComponent(value)}`)
        closeModalSearch()
        setSearchKeyword('')
    }

    return (
        <>
            <div className={`modal-search-block`} onClick={closeModalSearch}>
                <div
                    className={`modal-search-main md:p-10 p-6 rounded-[32px] min-h-fit  ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="form-search relative overflow-y-hidden">
                        <Icon.MagnifyingGlass
                            className='absolute heading5 right-6 top-1/2 -translate-y-1/2 cursor-pointer'
                            onClick={() => {
                                handleSearch(searchKeyword)
                            }}
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder='Searching...'
                            className='text-button-lg h-14 rounded-2xl border border-line w-full pl-6 pr-12'
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                        />
                    </div>
                    {showSuggestions ? (
                        <div className="predictive-search mt-8">
                            {isLoading && suggestions.length === 0 ? (
                                <div className="flex items-center justify-center py-10">
                                    <Icon.CircleNotch className="animate-spin heading5" />
                                </div>
                            ) : suggestions.length > 0 ? (
                                <>
                                    <div className="list-suggestion flex flex-col">
                                        {suggestions.map((product) => {
                                            // Variable products can have an empty/unsynced `price` on the parent
                                            // (the real price lives on their variations), which reads as $0.00 if
                                            // taken at face value. `price_html` is always computed correctly by
                                            // WooCommerce, so fall back to its text when the numeric field is unusable.
                                            const rawPrice = product.on_sale ? product.sale_price : product.price
                                            const numericPrice = Number(rawPrice)
                                            const hasValidPrice = rawPrice !== '' && !Number.isNaN(numericPrice) && numericPrice > 0

                                            return (
                                                <Link
                                                    key={product.id}
                                                    href={`/product/${product.id}`}
                                                    onClick={() => {
                                                        closeModalSearch()
                                                        setSearchKeyword('')
                                                    }}
                                                    className="suggestion-item flex items-center gap-4 py-2 duration-300 hover:bg-surface rounded-xl px-2"
                                                >
                                                    <div className="thumb w-14 h-14 rounded-lg overflow-hidden bg-surface shrink-0">
                                                        {product.images?.[0]?.src && (
                                                            <Image
                                                                src={product.images[0].src}
                                                                width={100}
                                                                height={100}
                                                                alt={product.images[0].alt || product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="info flex flex-col flex-1 min-w-0">
                                                        <div className="text-title truncate">{decodeHtmlEntities(product.name)}</div>
                                                        {hasValidPrice ? (
                                                            <div className="price-block flex items-center gap-2 mt-0.5">
                                                                <div className="product-price text-title">
                                                                    {decodeHtmlEntities(currentCurrency?.symbol || "$")}
                                                                    {numericPrice.toFixed(2)}
                                                                </div>
                                                                {product.on_sale && Number(product.regular_price) !== Number(product.sale_price) && (
                                                                    <div className="product-origin-price caption1 text-secondary2">
                                                                        <del>{decodeHtmlEntities(currentCurrency?.symbol || "$")}{Number(product.regular_price).toFixed(2)}</del>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="price-block mt-0.5">
                                                                <div className="product-price text-title">{decodeHtmlEntities(product.price_html)}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                    <div
                                        className="view-all text-button-lg text-center mt-4 pt-4 border-t border-line cursor-pointer duration-300 hover:text-secondary"
                                        onClick={() => handleSearch(searchKeyword)}
                                    >
                                        View all results for &ldquo;{searchKeyword}&rdquo;
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 text-secondary">
                                    No products found for &ldquo;{searchKeyword}&rdquo;
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="keyword mt-8">
                            <div className="heading5">Feature keywords Today</div>
                            <div className="list-keyword flex items-center flex-wrap gap-3 mt-4">
                                {featuredKeywords.map((category) => (
                                    <div
                                        key={category.id}
                                        className="item px-4 py-1.5 border border-line rounded-full cursor-pointer duration-300 hover:bg-black hover:text-white"
                                        onClick={() => handleSearch(decodeEntities(category.name))}
                                    >
                                        {decodeEntities(category.name)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default ModalSearch