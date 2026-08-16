'use client'
import HandlePagination from '@/components/Other/HandlePagination'
import Product from '@/components/Product/Product'
import { Product as ProductType } from '@/types/product-type'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState } from 'react'

interface SearchResultProps {
    products: ProductType[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    query: string;
}

const SearchResult = ({ products, totalItems, totalPages, currentPage, query }: SearchResultProps) => {
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const router = useRouter();
    const pathname = usePathname();

    const handleSearch = (value: string) => {
        router.push(`${pathname}?query=${encodeURIComponent(value)}`)
        setSearchKeyword('')
    }

    const handlePageChange = (selected: number) => {
        // react-paginate is 0-indexed; the URL/API use 1-indexed pages.
        router.push(`${pathname}?query=${encodeURIComponent(query)}&page=${selected + 1}`, { scroll: false });
    };

    return (
        <>

            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="heading flex flex-col items-center">
                        <div className="heading4 text-center">Found {totalItems} results for {String.raw`"`}{query}{String.raw`"`}</div>
                        <div className="input-block lg:w-1/2 sm:w-3/5 w-full md:h-[52px] h-[44px] sm:mt-8 mt-5">
                            <div className='w-full h-full relative'>
                                <input
                                    type="text"
                                    placeholder='Search...'
                                    className='caption1 w-full h-full pl-4 md:pr-[150px] pr-32 rounded-xl border border-line'
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                                />
                                <button
                                    className='button-main absolute top-1 bottom-1 right-1 flex items-center justify-center'
                                    onClick={() => handleSearch(searchKeyword)}
                                >
                                    search
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="list-product-block relative md:pt-10 pt-6">
                        <div className="heading6">product Search: {query}</div>
                        <div className={`list-product hide-product-sold grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-5`}>
                            {products.length === 0 ? (
                                <div className="no-data-product">No products match the selected criteria.</div>
                            ) : (
                                products.map((item) => <Product key={item.id} data={item} type='grid' style='style-1' />)
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                                <HandlePagination pageCount={totalPages} currentPage={currentPage - 1} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default SearchResult
