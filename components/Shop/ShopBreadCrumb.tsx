'use client'

import { useAppData } from "@/context/AppDataContext";
import { COLORS } from "@/data/color-codes";
import { decodeHtmlEntities } from "@/lib/utils";
import { Product as ProductType } from "@/types/product-type";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Link from 'next/link';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import HandlePagination from '../Other/HandlePagination';
import Product from '../Product/Product';

interface Props {
    products: Array<ProductType>
    totalItems: number
    totalPages: number
    currentPage: number
}

const DEFAULT_PRICE_RANGE = { min: 0, max: 1000 };

const ShopBreadCrumb1: React.FC<Props> = ({ products, totalItems, totalPages, currentPage }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentCurrency, brands, categories, attributes: attributesData, tags } = useAppData();

    const selectedType = searchParams.get('type');
    const selectedCategory = searchParams.get('category');
    const selectedSize = searchParams.get('size');
    const selectedColor = searchParams.get('color');
    const selectedBrand = searchParams.get('brand');
    const sortOption = searchParams.get('sort') ?? '';
    const showOnlySale = searchParams.get('sale') === '1';
    const priceRange = {
        min: Number(searchParams.get('min_price') ?? DEFAULT_PRICE_RANGE.min),
        max: Number(searchParams.get('max_price') ?? DEFAULT_PRICE_RANGE.max),
    };

    // rc-slider fires onChange continuously while dragging; keep that purely local so the
    // labels update live, and only commit to the URL (triggering a refetch) on release.
    const [pendingMax, setPendingMax] = useState<number | null>(null);
    const displayPriceRange = { min: priceRange.min, max: pendingMax ?? priceRange.max };

    const updateParams = (updates: Record<string, string | null>, { resetPage = true } = {}) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (resetPage) {
            params.delete('page');
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const toggle = (key: string, value: string) => (current: string | null) =>
        updateParams({ [key]: current === value ? null : value });

    const handleShowOnlySale = () => {
        updateParams({ sale: showOnlySale ? null : '1' });
    };

    const handleSortChange = (option: string) => {
        updateParams({ sort: option || null });
    };

    const handleType = (type: string | null) => {
        updateParams({ type: selectedType === type ? null : type });
    };

    const handleCategory = (cat: string | null) => {
        updateParams({ category: selectedCategory === cat ? null : cat });
    };

    const handleSize = (size: string) => {
        updateParams({ size: selectedSize === size ? null : size });
    };

    const handleColor = (color: string) => {
        updateParams({ color: selectedColor === color ? null : color });
    };

    const handleBrand = (brand: string) => {
        updateParams({ brand: selectedBrand === brand ? null : brand });
    };

    const handlePriceDrag = (values: number | number[]) => {
        if (Array.isArray(values)) {
            setPendingMax(values[1]);
        }
    };

    const handlePriceCommit = (values: number | number[]) => {
        if (Array.isArray(values)) {
            setPendingMax(null);
            updateParams({ min_price: String(values[0]), max_price: String(values[1]) });
        }
    };

    const handlePageChange = (selected: number) => {
        // react-paginate is 0-indexed; the API/URL use 1-indexed pages.
        updateParams({ page: String(selected + 1) }, { resetPage: false });
    };

    const handleClearAll = () => {
        router.push(pathname, { scroll: false });
    };

    // "Best Discount" has no native WooCommerce REST sort — the server already filters to
    // on_sale items, so approximate the ordering by re-sorting just the current page.
    const displayProducts = sortOption === 'discountHighToLow'
        ? [...products].sort((a, b) => (
            (Math.floor(100 - ((Number(b.sale_price) / Number(b.regular_price)) * 100))) -
            (Math.floor(100 - ((Number(a.sale_price) / Number(a.regular_price)) * 100)))
        ))
        : products;

    return (
        <>
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">{selectedCategory === null ? 'Shop' : categories.find(cat => cat.slug === selectedCategory)?.name}</div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href={'/'}>Homepage</Link>
                                    <Icon.CaretRightIcon size={14} className='text-secondary2' />
                                    <div className='text-secondary2 capitalize'>{selectedCategory === null ? 'Shop' : categories.find(cat => cat.slug === selectedCategory)?.name}</div>
                                </div>
                            </div>
                            <div className="list-tab flex flex-wrap items-center justify-center gap-y-5 gap-8 lg:mt-[70px] mt-12 overflow-hidden">
                                {categories && categories.filter(cat => cat.slug.toLowerCase().split("_").includes("common")).sort((a, b) => b.count - a.count).slice(0, 5).map((item, index) => (
                                    <div
                                        key={index}
                                        className={`tab-item text-button-uppercase cursor-pointer has-line-before line-2px ${selectedCategory?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                                        onClick={() => handleCategory(item.slug.toLowerCase())}
                                    >
                                        {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="flex max-md:flex-wrap max-md:flex-col-reverse gap-y-8">
                        <div className="sidebar lg:w-1/4 md:w-1/3 w-full md:pr-12">
                            <div className="filter-type pb-8 border-b border-line">
                                <div className="heading6">Featured</div>
                                <div className="list-type mt-4">
                                    {tags && tags.filter(tag => tag.slug.toLowerCase().split("_").includes("promotion")).sort((a, b) => b.count - a.count).map((item, index) => (
                                        <div
                                            key={index}
                                            className={`item flex items-center justify-between cursor-pointer ${selectedType?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                                            onClick={() => handleType(item.slug.toLowerCase())}
                                        >
                                            <div className='text-secondary has-line-before hover:text-black capitalize'>{item.name}</div>
                                            <div className='text-secondary2'>
                                                ({item.count})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-type pb-8 border-b border-line">
                                <div className="heading6">Products Type</div>
                                <div className="list-type mt-4">
                                    {categories && categories.filter(cat => cat.slug.toLowerCase().split("_").includes("common")).sort((a, b) => b.count - a.count).map((item, index) => (
                                        <div
                                            key={index}
                                            className={`item flex items-center justify-between cursor-pointer ${selectedCategory?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                                            onClick={() => handleCategory(item.slug.toLowerCase())}
                                        >
                                            <div className='text-secondary has-line-before hover:text-black capitalize'>{item.name}</div>
                                            <div className='text-secondary2'>
                                                ({item.count})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="filter-size pb-8 border-b border-line mt-8">
                                <div className="heading6">Size</div>
                                <div className="list-size flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                    {
                                        attributesData?.filter(attr => attr.attribute.name.toLowerCase() === "size").map((item, index) => (
                                            item.terms.map((term, termIndex) => (
                                                <div
                                                    key={termIndex}
                                                    className={`size-item text-button w-[44px] h-[44px] flex items-center justify-center rounded-full border border-line ${selectedSize === term.name ? 'active' : ''}`}
                                                    onClick={() => handleSize(term.name)}
                                                >
                                                    {term.name}
                                                </div>
                                            ))
                                        ))
                                    }
                                    <div
                                        className={`size-item text-button px-4 py-2 flex items-center justify-center rounded-full border border-line ${selectedSize === 'freesize' ? 'active' : ''}`}
                                        onClick={() => handleSize('freesize')}
                                    >
                                        Freesize
                                    </div>
                                </div>
                            </div>
                            <div className="filter-price pb-8 border-b border-line mt-8">
                                <div className="heading6">Price Range</div>
                                <Slider
                                    range
                                    value={[displayPriceRange.min, displayPriceRange.max]}
                                    min={0}
                                    max={1000}
                                    onChange={handlePriceDrag}
                                    onChangeComplete={handlePriceCommit}
                                    className='mt-5'
                                />
                                <div className="price-block flex items-center justify-between flex-wrap mt-4">
                                    <div className="min flex items-center gap-1">
                                        <div>Min price:</div>
                                        <div className='price-min'>
                                            <span>{decodeHtmlEntities(currentCurrency?.symbol ?? '')}{displayPriceRange.min}</span>
                                        </div>
                                    </div>
                                    <div className="min flex items-center gap-1">
                                        <div>Max price:</div>
                                        <div className='price-max'>
                                            <span>{decodeHtmlEntities(currentCurrency?.symbol ?? '')}{displayPriceRange.max}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="filter-color pb-8 border-b border-line mt-8">
                                <div className="heading6">colors</div>
                                <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                    {
                                        attributesData!.filter(attr => attr.attribute.name.toLowerCase() === "color").map((item, index) => (
                                            item.terms.map((term, termIndex) => (
                                                <div
                                                    key={termIndex}
                                                    className={`color-item px-3 py-[5px] flex items-center justify-center gap-2 rounded-full border border-line ${selectedColor?.toLowerCase() === term.name.toLowerCase() ? 'active' : ''}`}
                                                    onClick={() => handleColor(term.name)}
                                                >
                                                    <div style={{ background: COLORS[term.name.toLowerCase()] }} className={`color w-5 h-5 rounded-full`}></div>
                                                    <div className="caption1 capitalize">{term.name}</div>
                                                </div>
                                            ))
                                        ))
                                    }
                                </div>

                            </div>
                            <div className="filter-brand mt-8">
                                <div className="heading6">Brands</div>
                                <div className="list-brand mt-4">
                                    {brands?.map((item, index) => (
                                        <div key={index} className="brand-item flex items-center justify-between">
                                            <div className="left flex items-center cursor-pointer">
                                                <div className="block-input">
                                                    <input
                                                        type="checkbox"
                                                        name={item.name}
                                                        id={item.id.toString()}
                                                        checked={selectedBrand === item.name}
                                                        onChange={() => handleBrand(item.name)} />
                                                    <Icon.CheckSquareIcon size={20} weight='fill' className='icon-checkbox' />
                                                </div>
                                                <label htmlFor={item.name} className="brand-name capitalize pl-2 cursor-pointer">{item.name}</label>
                                            </div>
                                            <div className='text-secondary2'>
                                                ({item.count})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="list-product-block lg:w-3/4 md:w-2/3 w-full md:pl-3">
                            <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                                <div className="left flex has-line items-center flex-wrap gap-5">
                                    <div className="check-sale flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="filterSale"
                                            id="filter-sale"
                                            className='border-line'
                                            checked={showOnlySale}
                                            onChange={handleShowOnlySale}
                                        />
                                        <label htmlFor="filter-sale" className='cation1 cursor-pointer'>Show only products on sale</label>
                                    </div>
                                </div>
                                <div className="right flex items-center gap-3">
                                    <div className="select-block relative">
                                        <select
                                            id="select-filter"
                                            name="select-filter"
                                            className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                            onChange={(e) => { handleSortChange(e.target.value) }}
                                            value={sortOption || 'Sorting'}
                                        >
                                            <option value="Sorting" disabled>Sorting</option>
                                            <option value="soldQuantityHighToLow">Best Selling</option>
                                            <option value="discountHighToLow">Best Discount</option>
                                            <option value="priceHighToLow">Price High To Low</option>
                                            <option value="priceLowToHigh">Price Low To High</option>
                                        </select>
                                        <Icon.CaretDownIcon size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                                    </div>
                                </div>
                            </div>

                            <div className="list-filtered flex items-center gap-3 mt-4">
                                <div className="total-product">
                                    {totalItems}
                                    <span className='text-secondary pl-1'>Products Found</span>
                                </div>
                                {
                                    (selectedType || selectedSize || selectedColor || selectedBrand || selectedCategory) && (
                                        <>
                                            <div className="list flex items-center gap-3">
                                                <div className='w-px h-4 bg-line'></div>
                                                {selectedType && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleType(null)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{tags.find(tag => tag.slug.toLowerCase() === selectedType.toLowerCase())?.name}</span>
                                                    </div>
                                                )}
                                                {selectedCategory && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleCategory(null)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{categories.find(cat => cat.slug.toLowerCase() === selectedCategory.toLowerCase())?.name}</span>
                                                    </div>
                                                )}

                                                {selectedSize && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleSize(selectedSize)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedSize}</span>
                                                    </div>
                                                )}
                                                {selectedColor && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleColor(selectedColor)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedColor}</span>
                                                    </div>
                                                )}
                                                {selectedBrand && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleBrand(selectedBrand)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedBrand}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                className="clear-btn flex items-center px-2 py-1 gap-1 rounded-full border border-red cursor-pointer"
                                                onClick={handleClearAll}
                                            >
                                                <Icon.X color='rgb(219, 68, 68)' className='cursor-pointer' />
                                                <span className='text-button-uppercase text-red'>Clear All</span>
                                            </div>
                                        </>
                                    )
                                }
                            </div>

                            <div className="list-product hide-product-sold grid lg:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7">
                                {displayProducts.length !== 0 ? (
                                    displayProducts.map((item) => <Product key={item.id} data={item} type='grid' style='style-1' />)
                                ) : (
                                    <div className="no-data-product">
                                    </div>
                                )}
                            </div>

                            {totalPages > 1 && (
                                <div className="list-pagination flex items-center md:mt-10 mt-7">
                                    <HandlePagination pageCount={totalPages} currentPage={currentPage - 1} onPageChange={handlePageChange} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}

export default ShopBreadCrumb1
