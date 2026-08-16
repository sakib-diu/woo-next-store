/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext'
import { useModalWishlistContext } from '@/context/ModalWishlistContext'
import { useWishlist } from '@/context/WishlistContext'
import { COLORS } from '@/data/color-codes'
import { useProductVariations } from '@/hooks/useProductVariations'
import { decodeHtmlEntities } from '@/lib/utils'
import { Product as ProductType, VariationProduct } from '@/types/product-type'
import * as Icon from "@phosphor-icons/react/dist/ssr"
import { isNull } from 'lodash'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Marquee from 'react-fast-marquee'
import { toast } from 'sonner'
import { useAppData } from '../../context/AppDataContext'

interface ProductProps {
    data: ProductType
    type: string
    style: string
}

interface WishlistToggleProps {
    isActive: boolean
    sizeClass: string
    onClick: (e: React.MouseEvent) => void
}

const WishlistToggle: React.FC<WishlistToggleProps> = ({ isActive, sizeClass, onClick }) => (
    <div
        className={`add-wishlist-btn ${sizeClass} flex items-center justify-center rounded-full bg-white duration-300 relative ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Wishlist</div>
        {isActive ? (
            <Icon.HeartIcon size={18} weight='fill' className='text-white' />
        ) : (
            <Icon.HeartIcon size={18} />
        )}
    </div>
)

const Product: React.FC<ProductProps> = ({ data, type, style }) => {
    const hasVariations = data.attributes?.length > 0 && data.variations?.length > 0
    const { variations, isLoading: isLoadingVariations } = useProductVariations(data.id, hasVariations)
    const [selectedVariation, setSelectedVariation] = useState<VariationProduct | null>(null);
    const [activeColor, setActiveColor] = useState<string>(() => {
        const attr = data.attributes?.find(attr => attr.name === "color")
        if (attr) {
            return attr.options[0]
        }
        return ''
    })
    const [activeSize, setActiveSize] = useState<string>(() => {
        const attr = data.attributes?.find(attr => attr.name === "size")
        if (attr) {
            return attr.options[0]
        }
        return ''
    })
    const [isAddingToCart, setIsAddingToCart] = useState(false)
    const { currentCurrency } = useAppData()
    const { addToCart } = useCart();
    const { openModalCart } = useModalCartContext();
    const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist();
    const { openModalWishlist } = useModalWishlistContext()
    const { openQuickview } = useModalQuickviewContext()
    const router = useRouter()

    const sizeAttribute = data.attributes.find(item => item.name.toLowerCase() === "size")
    const colorAttribute = data.attributes.find(item => item.name.toLowerCase() === "color")
    const isInWishlist = wishlistState.wishlistArray.some(item => item.id.toString() === data.id.toString())

    useEffect(() => {
        if (data.attributes?.length > 0) {
            const matchingVariation = findMatchingVariation();
            setSelectedVariation(matchingVariation);
        }
    }, [activeColor, activeSize, variations]);

    // Find matching variation based on activeColor or activeSize
    const findMatchingVariation = () => {
        // If there are no variations loaded, we can't find a match.
        if (variations.length === 0) return null;

        // Check if the product is supposed to have color and size variations
        const hasColorAttribute = data.attributes.some(attr => attr.name.toLowerCase() === 'color' && attr.variation);
        const hasSizeAttribute = data.attributes.some(attr => attr.name.toLowerCase() === 'size' && attr.variation);

        // Find a variation where every required attribute matches the active state.
        const matchingVariant = variations.find((variation) => {
            // A variation is a match if its color and size match the active selection.
            // If an attribute doesn't exist for variations (e.g., only color, no size), it's considered a match.
            const colorMatch = !hasColorAttribute || variation.attributes.some(
                attr => attr.name.toLowerCase() === 'color' && attr.option === activeColor
            );
            const sizeMatch = !hasSizeAttribute || variation.attributes.some(
                attr => attr.name.toLowerCase() === 'size' && attr.option === activeSize
            );
            return colorMatch && sizeMatch;
        });

        return matchingVariant ?? null;
    };

    // This "smart" handler updates the color and ensures the selected size is still valid.
    const handleActiveColor = (newColor: string) => {
        setActiveColor(newColor);

        // Find all sizes that are available with the newly selected color
        const availableSizes = new Set(
            variations
                .filter(v => v.attributes.some(a => a.name.toLowerCase() === 'color' && a.option === newColor))
                .map(v => v.attributes.find(a => a.name.toLowerCase() === 'size')?.option)
                .filter((s): s is string => !!s)
        );

        // If the current size is not in the list of available sizes for the new color,
        // automatically switch to the first available size.
        if (availableSizes.size > 0 && !availableSizes.has(activeSize)) {
            setActiveSize(Array.from(availableSizes)[0]);
        }
    };

    const handleAddToCart = async () => {
        // For products with no real WooCommerce variation behind the color/size chips (e.g. a
        // `simple` product carrying a purely descriptive Size attribute), there's nothing for
        // the Store API cart to record — this is only a display label for what was clicked.
        const displayAttributes: { attribute: string; value: string }[] = []
        if (!selectedVariation) {
            if (activeColor) displayAttributes.push({ attribute: 'Color', value: activeColor })
            if (activeSize) displayAttributes.push({ attribute: 'Size', value: activeSize })
        }

        setIsAddingToCart(true);
        try {
            const result = await addToCart(
                selectedVariation ? selectedVariation.id : data.id,
                1,
                displayAttributes.length > 0 ? displayAttributes : undefined
            );

            if (result.success) {
                openModalCart();
            } else {
                toast.error(result.error || 'Could not add this item to your cart.');
            }
        } finally {
            setIsAddingToCart(false);
        }
    };

    // Products with attributes need color/size picked before they can be added to the
    // cart, so send the shopper to the product page to choose instead of adding blind.
    const handleAddToCartClick = () => {
        if (isAddingToCart) return;
        if (data.attributes?.length > 0) {
            router.push(`/product/${data.id}`);
        } else {
            handleAddToCart();
        }
    };

    const handleAddToWishlist = () => {
        // if product existed in wishlit, remove from wishlist and set state to false
        if (isInWishlist) {
            removeFromWishlist(data.id.toString());
        } else {
            // else, add to wishlist and set state to true
            addToWishlist(data);
        }
        openModalWishlist();
    };


    const handleQuickviewOpen = () => {
        openQuickview(data)
    }

    const percentSale = Math.floor(100 - ((Number(data.sale_price || selectedVariation?.sale_price) / Number(data.regular_price || selectedVariation?.regular_price)) * 100))
    const percentSold = Math.floor((data.total_sales / data.stock_quantity!) * 100)

    const isAddToCartDisabled =
        data.stock_status === "outofstock" ||
        !data.purchasable;

    const addToCartButtonClasses = isAddToCartDisabled
        ? "bg-surface text-secondary2 border"
        : "bg-black text-white hover:bg-green-300";

    if (type !== "grid") {
        return null;
    }

    return (
        <>
            <div className={`product-item grid-type ${style}`}>
                <div className="product-main cursor-pointer block">
                    <div className="product-thumb bg-white relative overflow-hidden rounded-2xl">
                        {(data.tags.some(tag => tag.slug.includes("promotion_new-arrival")) &&
                            <div className="product-tag text-button-uppercase bg-green px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                New
                            </div>
                        )}
                        {data.on_sale && Number(data.regular_price || data.price) !== Number(data.sale_price) && (
                            <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                Sale
                            </div>
                        )}
                        {(style === 'style-1' || style === 'style-3' || style === 'style-4') && (
                            <div className="list-action-right absolute top-3 right-3 max-lg:hidden">
                                <WishlistToggle
                                    sizeClass="w-[32px] h-[32px]"
                                    isActive={isInWishlist}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddToWishlist()
                                    }}
                                />
                            </div>
                        )}
                        <Link href={`/product/${data.id}`} prefetch>
                            <div className="product-img w-full h-full aspect-[3/4]">
                                {selectedVariation?.image?.src ? (
                                    <Image
                                        src={selectedVariation.image.src}
                                        width={500}
                                        height={500}
                                        alt={data.name}
                                        priority={true}
                                        className="w-full h-full object-cover duration-700"
                                    />
                                ) : (
                                    <>
                                        {data.images.map((img, index) => (
                                            img.src && (
                                                <Image
                                                    key={index}
                                                    src={img.src}
                                                    width={500}
                                                    height={500}
                                                    priority={true}
                                                    alt={data.name}
                                                    className="w-full h-full object-cover duration-700"
                                                />
                                            )
                                        ))}
                                    </>
                                )}
                            </div>
                        </Link>

                        {data.on_sale && Number(data.regular_price) !== Number(data.sale_price) && (
                            <Marquee className='banner-sale-auto bg-black absolute bottom-0 left-0 w-full py-1.5'>
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="flex items-center gap-2 px-2.5">
                                        <span className="caption2 font-semibold uppercase text-white whitespace-nowrap">Hot Sale {percentSale}% OFF</span>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                    </div>
                                ))}
                            </Marquee>
                        )}
                        {(style === 'style-2' || style === 'style-4') && (
                            <div className="list-size-block flex items-center justify-center gap-4 absolute bottom-0 left-0 w-full h-8">
                                {sizeAttribute?.options.map((item: string, index: number) => (
                                    <strong key={index} className="size-item text-xs font-bold uppercase">{item}</strong>
                                ))}
                            </div>
                        )}
                        {(style === 'style-1' || style === 'style-3') && (
                            <div className={`list-action ${style === 'style-1' ? 'grid grid-cols-2 gap-3' : ''} px-5 absolute w-full bottom-5 max-md:hidden`}>
                                {style === 'style-1' && (
                                    <div
                                        className="quick-view-btn w-full text-button-uppercase py-2 align-middle text-center rounded-md duration-300 bg-white hover:bg-black hover:text-white"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleQuickviewOpen()
                                        }}
                                    >
                                        <span className='text-[11px] lg:text-xs '>
                                            Quick View
                                        </span>
                                    </div>
                                )}
                                <button
                                    className={`add-cart-btn  w-full text-button-uppercase py-2 text-center rounded-md duration-500
                                        ${addToCartButtonClasses} disabled:opacity-100 disabled:pointer-events-none
                                         `}
                                    disabled={isAddToCartDisabled || isAddingToCart}
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleAddToCartClick()
                                    }}
                                >
                                    <span className='text-[11px] lg:text-xs flex items-center justify-center gap-1'>
                                        {isAddingToCart && <Icon.CircleNotchIcon className='animate-spin' size={12} />}
                                        {isAddingToCart ? 'Adding...' : 'Add To Cart'}
                                    </span>
                                </button>
                            </div>
                        )}
                        {(style === 'style-2' || style === 'style-5') && (
                            <div className={`list-action flex items-center justify-center gap-3 px-5 absolute w-full ${style === 'style-2' ? 'bottom-12' : 'bottom-5'} max-lg:hidden`}>
                                <WishlistToggle
                                    sizeClass="w-9 h-9"
                                    isActive={isInWishlist}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddToWishlist()
                                    }}
                                />
                            </div>
                        )}
                        <div className="list-action-icon flex items-center justify-center gap-2 absolute w-full bottom-3 z-[1] md:hidden">
                            <div
                                className="quick-view-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickviewOpen()
                                }}
                            >
                                <Icon.EyeIcon className='text-lg' />
                            </div>
                            <div
                                className={`add-cart-btn  w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white ${isAddingToCart ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={e => {
                                    e.stopPropagation();
                                    handleAddToCartClick()
                                }}
                            >
                                {isAddingToCart ? (
                                    <Icon.CircleNotchIcon className='text-lg animate-spin' />
                                ) : (
                                    <Icon.ShoppingBagOpenIcon className='text-lg' />
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="product-infor mt-4 lg:mb-7">
                        <div className="product-sold sm:pb-4 pb-2">
                            <div className="progress bg-line h-1.5 w-full rounded-full overflow-hidden relative">
                                <div
                                    className={`progress-sold bg-red absolute left-0 top-0 h-full`}
                                    style={{ width: `${percentSold}%` }}
                                >
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 gap-y-1 flex-wrap mt-2">
                                <div className="text-button-uppercase">
                                    <span className='text-secondary2 max-sm:text-xs'>Sold: </span>
                                    <span className='max-sm:text-xs'>{data.total_sales}</span>
                                </div>
                                <div className="text-button-uppercase">
                                    <span className='text-secondary2 max-sm:text-xs'>Available: </span>
                                    <span className='max-sm:text-xs'>{data.stock_quantity ? data.stock_quantity - data.total_sales : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div className={` text-title duration-300 ${data.attributes.some(attr => attr.name.toLowerCase().includes("color")) ? "product-name" : "product-name-only"} `}>{data.name}</div>
                        {data.attributes?.length > 0 &&
                            <div className={`list-color py-2 !max-lg:hidden flex items-center gap-2 flex-wrap duration-500 ${isLoadingVariations ? 'opacity-50 pointer-events-none' : ''}`}>
                                {colorAttribute?.options.map((item: string, index: number) => (
                                    <div
                                        key={index}
                                        className={`color-item w-6 h-6 rounded-full duration-300 relative ${activeColor === item ? 'active' : ''}`}
                                        style={{ backgroundColor: `${COLORS[item.toLowerCase().replace(" ", "")] ?? "#000000"}` }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleActiveColor(item)
                                        }}>
                                        <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">{item}</div>
                                    </div>
                                ))}
                            </div>
                        }
                        {!isNull(selectedVariation) ?
                            (<div className="product-price-block flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
                                <div className="product-price text-title">{decodeHtmlEntities(currentCurrency?.symbol || "$")}{selectedVariation.on_sale ? Number(selectedVariation.sale_price).toFixed(2) : Number(selectedVariation.price).toFixed(2)}</div>
                                {selectedVariation.on_sale && percentSale > 0 && (
                                    <>
                                        <div className="product-origin-price caption1 text-secondary2"><del>{decodeHtmlEntities(currentCurrency?.symbol || "$")}{Number(selectedVariation.price).toFixed(2)}</del></div>
                                        <div className="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                                            -{percentSale}%
                                        </div>
                                    </>
                                )}
                            </div>) :
                            (<div className="product-price-block flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
                                {data.variations && data.variations.length > 0 ?
                                    <div className="product-price text-title">{decodeHtmlEntities(currentCurrency?.symbol || "$")}{data.on_sale ? Number(data.price).toFixed(2) : Number(data.price).toFixed(2)}</div>
                                    :
                                    <div className="product-price text-title">{decodeHtmlEntities(currentCurrency?.symbol || "$")}{data.on_sale ? Number(data.sale_price).toFixed(2) : Number(data.price).toFixed(2)}</div>
                                }
                                {data.on_sale && percentSale > 0 && (
                                    <>
                                        <div className="product-origin-price caption1 text-secondary2"><del>{decodeHtmlEntities(currentCurrency?.symbol || "$")}{Number(data.price).toFixed(2)}</del></div>
                                        <div className="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                                            -{percentSale}%
                                        </div>
                                    </>
                                )}
                            </div>)
                        }

                        {style === 'style-5' &&
                            <button
                                type="button"
                                className={`add-cart-btn w-full text-button-uppercase py-2.5 text-center mt-2 rounded-full
                                    duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden
                                    disabled:opacity-100 disabled:pointer-events-none
                                    ${addToCartButtonClasses}`
                                }
                                disabled={isAddToCartDisabled || isAddingToCart}
                                onClick={e => {
                                    e.stopPropagation()
                                    handleAddToCartClick()
                                }}
                            >
                                <span className='flex items-center justify-center gap-1'>
                                    {isAddingToCart && <Icon.CircleNotchIcon className='animate-spin' size={14} />}
                                    {isAddingToCart ? 'Adding...' : 'Add To Cart'}
                                </span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

export default Product;
