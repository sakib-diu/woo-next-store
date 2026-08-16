'use client'

import { useAppData } from "@/context/AppDataContext";
import { COLORS } from "@/data/color-codes";
import { decodeEntities, decodeHtmlEntities, slugifyKey } from "@/lib/utils";
import { Product as ProductType } from "@/types/product-type";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Link from 'next/link';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
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
    const [isPending, startTransition] = useTransition();

    const selectedType = searchParams.get('type');
    const selectedCategory = searchParams.get('category');
    const selectedAudience = searchParams.get('audience');
    const selectedSize = searchParams.get('size');
    const selectedColor = searchParams.get('color');
    const selectedBrands = (searchParams.get('brand') ?? '').split(',').map(b => b.trim()).filter(Boolean);
    const sortOption = searchParams.get('sort') ?? '';
    // "Best Discount" only makes sense over on-sale items, so the server forces on_sale=true
    // for that sort regardless of the checkbox — reflect that here instead of letting the
    // checkbox silently disagree with what's actually being shown.
    const saleForcedBySort = sortOption === 'discountHighToLow';
    const showOnlySaleParam = searchParams.get('sale') === '1';
    const showOnlySale = showOnlySaleParam || saleForcedBySort;
    const priceRange = {
        min: Number(searchParams.get('min_price') ?? DEFAULT_PRICE_RANGE.min),
        max: Number(searchParams.get('max_price') ?? DEFAULT_PRICE_RANGE.max),
    };
    const isPriceFiltered = priceRange.min !== DEFAULT_PRICE_RANGE.min || priceRange.max !== DEFAULT_PRICE_RANGE.max;

    const hasActiveFilters = Boolean(
        selectedType || selectedCategory || selectedAudience || selectedSize || selectedColor ||
        selectedBrands.length || isPriceFiltered || showOnlySaleParam
    );
    const activeFilterCount = [
        Boolean(selectedType), Boolean(selectedCategory), Boolean(selectedAudience), Boolean(selectedSize),
        Boolean(selectedColor), selectedBrands.length > 0, isPriceFiltered, showOnlySaleParam,
    ].filter(Boolean).length;

    // rc-slider fires onChange continuously while dragging; keep that purely local so both
    // labels update live, and only commit to the URL (triggering a refetch) on release.
    const [pendingRange, setPendingRange] = useState<[number, number] | null>(null);
    const displayPriceRange = pendingRange
        ? { min: pendingRange[0], max: pendingRange[1] }
        : priceRange;

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        if (!isFilterOpen) return;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFilterOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isFilterOpen]);

    // Filter interactions re-run the shop page's Server Component (new WooCommerce query), which
    // can take a second or two. Wrapping the navigation in a transition gives us `isPending` to
    // show that something is happening instead of the grid just sitting there looking frozen.
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
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    const handleShowOnlySale = () => {
        if (saleForcedBySort) return;
        updateParams({ sale: showOnlySaleParam ? null : '1' });
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

    const handleAudience = (slug: string) => {
        updateParams({ audience: selectedAudience === slug ? null : slug });
    };

    const handleSize = (size: string) => {
        updateParams({ size: selectedSize === size ? null : size });
    };

    const handleColor = (color: string) => {
        updateParams({ color: selectedColor === color ? null : color });
    };

    const handleBrand = (brandName: string) => {
        const next = selectedBrands.includes(brandName)
            ? selectedBrands.filter(b => b !== brandName)
            : [...selectedBrands, brandName];
        updateParams({ brand: next.length ? next.join(',') : null });
    };

    const handlePriceDrag = (values: number | number[]) => {
        if (Array.isArray(values)) {
            setPendingRange([values[0], values[1]]);
        }
    };

    const handlePriceCommit = (values: number | number[]) => {
        if (Array.isArray(values)) {
            setPendingRange(null);
            updateParams({ min_price: String(values[0]), max_price: String(values[1]) });
        }
    };

    const handlePriceClear = () => {
        setPendingRange(null);
        updateParams({ min_price: null, max_price: null });
    };

    const handlePageChange = (selected: number) => {
        // react-paginate is 0-indexed; the API/URL use 1-indexed pages.
        updateParams({ page: String(selected + 1) }, { resetPage: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearAll = () => {
        startTransition(() => {
            router.push(pathname, { scroll: false });
        });
    };

    // "Best Discount" has no native WooCommerce REST sort — the server already filters to
    // on_sale items, so approximate the ordering by re-sorting just the current page.
    const displayProducts = sortOption === 'discountHighToLow'
        ? [...products].sort((a, b) => (
            (Math.floor(100 - ((Number(b.sale_price) / Number(b.regular_price)) * 100))) -
            (Math.floor(100 - ((Number(a.sale_price) / Number(a.regular_price)) * 100)))
        ))
        : products;

    // "Featured" surfaces genuine promo/marketing tags (Best Seller, New Arrival, Sale, ...).
    // This catalog's tag taxonomy also duplicates every brand as its own tag (e.g. "Jordan"),
    // which the separate Brands facet already covers — those are excluded by name so this list
    // doesn't just repeat the Brands section. Tags with no matching products are dropped too,
    // since selecting one would always land on the empty state.
    const brandNameSet = new Set((brands ?? []).map(b => b.name.toLowerCase()));
    const featuredTags = (tags ?? [])
        .filter(tag => tag.count > 0 && !brandNameSet.has(tag.name.toLowerCase()))
        .sort((a, b) => b.count - a.count);

    // Categories in this catalog are two-level: a top-level audience (Men/Women/Kids/Unisex/
    // Baby & Toddler) and, under each, the same set of product-type subcategories repeated per
    // audience (e.g. "shoes", "shoes-men", "shoes-women" are all really "Shoes"). Grouping
    // subcategories by display name collapses that repetition into one clean "Products Type"
    // facet; picking a group filters by every category ID it contains (see page.tsx).
    type ProductTypeGroup = { key: string; name: string; count: number };
    const productTypeGroups: ProductTypeGroup[] = (() => {
        const groups = new Map<string, ProductTypeGroup>();
        (categories ?? []).forEach(cat => {
            if (cat.parent === 0 || cat.count <= 0) return;
            const key = slugifyKey(cat.name);
            const existing = groups.get(key);
            if (existing) {
                existing.count += cat.count;
            } else {
                groups.set(key, { key, name: cat.name, count: cat.count });
            }
        });
        return Array.from(groups.values()).sort((a, b) => b.count - a.count);
    })();
    const audienceCategories = (categories ?? [])
        .filter(cat => cat.parent === 0 && cat.count > 0)
        .sort((a, b) => b.count - a.count);

    const selectedTypeGroup = selectedCategory
        ? productTypeGroups.find(g => g.key === selectedCategory.toLowerCase())
        : undefined;
    const selectedAudienceCategory = selectedAudience
        ? categories.find(c => c.slug.toLowerCase() === selectedAudience.toLowerCase())
        : undefined;
    const pageHeading = decodeEntities(selectedTypeGroup?.name ?? selectedAudienceCategory?.name ?? 'Shop');

    // Options with zero matching products are hidden across the board — a facet that always
    // leads to the empty state isn't useful to show as selectable.
    const sizeTerms = (attributesData ?? [])
        .filter(attr => attr.attribute.name.toLowerCase() === "size")
        .map(group => ({ ...group, terms: group.terms.filter(t => t.count > 0) }));
    const colorTerms = (attributesData ?? [])
        .filter(attr => attr.attribute.name.toLowerCase() === "color")
        .map(group => ({ ...group, terms: group.terms.filter(t => t.count > 0) }));
    const availableBrands = (brands ?? []).filter(b => b.count > 0);

    const sidebarContent = (
        <>
            <div className="filter-type pb-8 border-b border-line">
                <div className="heading6">Featured</div>
                <div className="list-type filter-scroll mt-4">
                    {featuredTags.map((item, index) => (
                        <button
                            type="button"
                            key={index}
                            className={`item flex items-center justify-between w-full text-left cursor-pointer ${selectedType?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                            onClick={() => handleType(item.slug.toLowerCase())}
                            aria-pressed={selectedType?.toLowerCase() === item.slug.toLowerCase()}
                        >
                            <div className='text-secondary has-line-before hover:text-black capitalize'>{decodeEntities(item.name)}</div>
                            <div className='text-secondary2'>
                                ({item.count})
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-type pb-8 border-b border-line mt-8">
                <div className="heading6">Audience</div>
                <div className="list-type filter-scroll mt-4">
                    {audienceCategories.map((item, index) => (
                        <button
                            type="button"
                            key={index}
                            className={`item flex items-center justify-between w-full text-left cursor-pointer ${selectedAudience?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                            onClick={() => handleAudience(item.slug.toLowerCase())}
                            aria-pressed={selectedAudience?.toLowerCase() === item.slug.toLowerCase()}
                        >
                            <div className='text-secondary has-line-before hover:text-black capitalize'>{decodeEntities(item.name)}</div>
                            <div className='text-secondary2'>
                                ({item.count})
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-type pb-8 border-b border-line mt-8">
                <div className="heading6">Products Type</div>
                <div className="list-type filter-scroll mt-4">
                    {productTypeGroups.map((item, index) => (
                        <button
                            type="button"
                            key={index}
                            className={`item flex items-center justify-between w-full text-left cursor-pointer ${selectedCategory?.toLowerCase() === item.key ? 'active' : ''}`}
                            onClick={() => handleCategory(item.key)}
                            aria-pressed={selectedCategory?.toLowerCase() === item.key}
                        >
                            <div className='text-secondary has-line-before hover:text-black capitalize'>{decodeEntities(item.name)}</div>
                            <div className='text-secondary2'>
                                ({item.count})
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="filter-size pb-8 border-b border-line mt-8">
                <div className="heading6">Size</div>
                <div className="list-size filter-scroll flex flex-wrap content-start gap-3 gap-y-4 mt-4">
                    {
                        sizeTerms.map((item, index) => (
                            item.terms.map((term, termIndex) => (
                                <button
                                    type="button"
                                    key={termIndex}
                                    className={`size-item text-button min-w-[44px] h-[44px] px-3 whitespace-nowrap flex items-center justify-center rounded-full border border-line ${selectedSize === term.name ? 'active' : ''}`}
                                    onClick={() => handleSize(term.name)}
                                    aria-pressed={selectedSize === term.name}
                                >
                                    {decodeEntities(term.name)}
                                </button>
                            ))
                        ))
                    }
                </div>
            </div>
            <div className="filter-price pb-8 border-b border-line mt-8">
                <div className="heading6">Price Range</div>
                <Slider
                    range
                    value={[displayPriceRange.min, displayPriceRange.max]}
                    min={DEFAULT_PRICE_RANGE.min}
                    max={DEFAULT_PRICE_RANGE.max}
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
                <div className="list-color filter-scroll flex flex-wrap content-start gap-3 gap-y-4 mt-4">
                    {
                        colorTerms.map((item, index) => (
                            item.terms.map((term, termIndex) => (
                                <button
                                    type="button"
                                    key={termIndex}
                                    className={`color-item px-3 py-[5px] whitespace-nowrap flex items-center justify-center gap-2 rounded-full border border-line ${selectedColor?.toLowerCase() === term.name.toLowerCase() ? 'active' : ''}`}
                                    onClick={() => handleColor(term.name)}
                                    aria-pressed={selectedColor?.toLowerCase() === term.name.toLowerCase()}
                                >
                                    <div style={{ background: COLORS[term.name.toLowerCase()] }} className={`color w-5 h-5 rounded-full shrink-0`}></div>
                                    <div className="caption1 capitalize">{decodeEntities(term.name)}</div>
                                </button>
                            ))
                        ))
                    }
                </div>

            </div>
            <div className="filter-brand mt-8">
                <div className="heading6">Brands</div>
                <div className="list-brand filter-scroll mt-4">
                    {availableBrands.map((item, index) => (
                        <div key={index} className="brand-item flex items-center justify-between">
                            <div className="left flex items-center cursor-pointer">
                                <div className="block-input">
                                    <input
                                        type="checkbox"
                                        name={item.name}
                                        id={item.id.toString()}
                                        checked={selectedBrands.includes(item.name)}
                                        onChange={() => handleBrand(item.name)} />
                                    <Icon.CheckSquareIcon size={20} weight='fill' className='icon-checkbox' />
                                </div>
                                <label htmlFor={item.name} className="brand-name capitalize pl-2 cursor-pointer">{decodeEntities(item.name)}</label>
                            </div>
                            <div className='text-secondary2'>
                                ({item.count})
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    return (
        <>
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">{pageHeading}</div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href={'/'}>Homepage</Link>
                                    <Icon.CaretRightIcon size={14} className='text-secondary2' />
                                    <div className='text-secondary2 capitalize'>{pageHeading}</div>
                                </div>
                            </div>
                            <div className="list-tab flex flex-wrap items-center justify-center gap-y-5 gap-8 lg:mt-[70px] mt-12 overflow-hidden">
                                {audienceCategories.slice(0, 5).map((item, index) => (
                                    <button
                                        type="button"
                                        key={index}
                                        className={`tab-item text-button-uppercase cursor-pointer has-line-before line-2px ${selectedAudience?.toLowerCase() === item.slug.toLowerCase() ? 'active' : ''}`}
                                        onClick={() => handleAudience(item.slug.toLowerCase())}
                                        aria-pressed={selectedAudience?.toLowerCase() === item.slug.toLowerCase()}
                                    >
                                        {decodeEntities(item.name)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="flex max-md:flex-wrap gap-y-8">
                        <div className="sidebar lg:w-1/4 md:w-1/3 w-full md:pr-12 max-md:hidden">
                            {sidebarContent}
                        </div>
                        <div className="list-product-block lg:w-3/4 md:w-2/3 w-full md:pl-3">
                            <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                                <div className="left flex has-line items-center flex-wrap gap-5">
                                    <button
                                        type="button"
                                        className="filter-trigger md:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-line"
                                        onClick={() => setIsFilterOpen(true)}
                                    >
                                        <Icon.FunnelSimpleIcon size={16} />
                                        <span>Filters</span>
                                        {activeFilterCount > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-black text-white caption2 flex items-center justify-center">{activeFilterCount}</span>
                                        )}
                                    </button>
                                    <div className="check-sale flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="filterSale"
                                            id="filter-sale"
                                            className='border-line'
                                            checked={showOnlySale}
                                            disabled={saleForcedBySort}
                                            onChange={handleShowOnlySale}
                                        />
                                        <label
                                            htmlFor="filter-sale"
                                            className={`cation1 ${saleForcedBySort ? 'cursor-not-allowed text-secondary2' : 'cursor-pointer'}`}
                                            title={saleForcedBySort ? "Enabled by the 'Best Discount' sort" : undefined}
                                        >
                                            Show only products on sale
                                        </label>
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

                            <div className="list-filtered flex items-center gap-3 mt-4 flex-wrap">
                                <div className="total-product flex items-center gap-2">
                                    {totalItems}
                                    <span className='text-secondary pl-1'>Products Found</span>
                                    {isPending && (
                                        <span className="filter-spinner" role="status" aria-label="Updating results" />
                                    )}
                                </div>
                                {
                                    hasActiveFilters && (
                                        <>
                                            <div className="list flex items-center gap-3 flex-wrap">
                                                <div className='w-px h-4 bg-line'></div>
                                                {selectedType && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleType(null)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{decodeEntities(tags.find(tag => tag.slug.toLowerCase() === selectedType.toLowerCase())?.name ?? selectedType)}</span>
                                                    </button>
                                                )}
                                                {selectedAudience && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleAudience(selectedAudience)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{decodeEntities(selectedAudienceCategory?.name ?? selectedAudience)}</span>
                                                    </button>
                                                )}
                                                {selectedCategory && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleCategory(null)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{decodeEntities(selectedTypeGroup?.name ?? selectedCategory)}</span>
                                                    </button>
                                                )}

                                                {selectedSize && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleSize(selectedSize)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedSize}</span>
                                                    </button>
                                                )}
                                                {selectedColor && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleColor(selectedColor)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedColor}</span>
                                                    </button>
                                                )}
                                                {selectedBrands.map(brandName => (
                                                    <button type="button" key={brandName} className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleBrand(brandName)}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{decodeEntities(brandName)}</span>
                                                    </button>
                                                ))}
                                                {isPriceFiltered && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={handlePriceClear}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{decodeHtmlEntities(currentCurrency?.symbol ?? '')}{priceRange.min} - {decodeHtmlEntities(currentCurrency?.symbol ?? '')}{priceRange.max}</span>
                                                    </button>
                                                )}
                                                {showOnlySaleParam && (
                                                    <button type="button" className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => updateParams({ sale: null })}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>On Sale</span>
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="clear-btn flex items-center px-2 py-1 gap-1 rounded-full border border-red cursor-pointer"
                                                onClick={handleClearAll}
                                            >
                                                <Icon.X color='rgb(219, 68, 68)' className='cursor-pointer' />
                                                <span className='text-button-uppercase text-red'>Clear All</span>
                                            </button>
                                        </>
                                    )
                                }
                            </div>

                            <div className={`list-product hide-product-sold grid lg:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7 transition-opacity duration-200 ${isPending ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                {displayProducts.length !== 0 ? (
                                    displayProducts.map((item) => <Product key={item.id} data={item} type='grid' style='style-1' />)
                                ) : (
                                    <div className="no-data-product col-span-full flex flex-col items-center justify-center gap-4 py-16 text-center">
                                        <div>No products match the selected criteria.</div>
                                        {hasActiveFilters && (
                                            <button type="button" className="button-main" onClick={handleClearAll}>
                                                Clear All Filters
                                            </button>
                                        )}
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

            {isFilterOpen && (
                <div className="fixed inset-0 z-[150] flex md:hidden items-end justify-center" role="dialog" aria-modal="true" aria-label="Filters">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsFilterOpen(false)} />
                    <div className="relative w-full max-h-[85vh] flex flex-col bg-white shadow-xl rounded-t-2xl transform transition-transform duration-300 ease-in-out translate-y-0">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                            <div className="heading6">Filters</div>
                            <button
                                type="button"
                                className="close-btn w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                onClick={() => setIsFilterOpen(false)}
                                aria-label="Close filters"
                            >
                                <Icon.X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-4 flex-1">
                            {sidebarContent}
                        </div>
                        <div className="px-6 py-4 border-t border-line flex items-center gap-3">
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    className="flex-1 text-center py-3 rounded-xl border border-line text-button-uppercase"
                                    onClick={() => { handleClearAll(); setIsFilterOpen(false); }}
                                >
                                    Clear All
                                </button>
                            )}
                            <button
                                type="button"
                                className="button-main flex-1 text-center"
                                onClick={() => setIsFilterOpen(false)}
                            >
                                View {totalItems} Results
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ShopBreadCrumb1
