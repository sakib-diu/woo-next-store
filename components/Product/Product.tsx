/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { getProductVariationsById } from '@/actions/products-actions'
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext'
import { useModalWishlistContext } from '@/context/ModalWishlistContext'
import { useWishlist } from '@/context/WishlistContext'
import { COLORS } from '@/data/color-codes'
import { decodeHtmlEntities } from '@/lib/utils'
import { Product as ProductType, VariationProduct } from '@/types/product-type'
import * as Icon from "@phosphor-icons/react/dist/ssr"
import { isNull } from 'lodash'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import Marquee from 'react-fast-marquee'
import { useAppData } from '../../context/AppDataContext'
import { QuickShopDrawer } from './QuickShopDrawer'

interface ProductProps {
    data: ProductType
    type: string
    style: string
}

const Product: React.FC<ProductProps> = ({ data, type, style }) => {
    const [variations, setVariations] = useState<VariationProduct[]>([])
    const [selectedVariation, setSelectedVariation] = useState<VariationProduct | null>(null);
    const [actionType, setActionType] = useState<string>("add to cart")
    const [mobileActionType, setMobileActionType] = useState<string>("add to cart")
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
    const [openQuickShop, setOpenQuickShop] = useState<boolean>(false)
    const { currentCurrency } = useAppData()
    const { addToCart, cartState } = useCart();
    const { openModalCart } = useModalCartContext();
    const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist();
    const { openModalWishlist } = useModalWishlistContext()
    const { openQuickview } = useModalQuickviewContext()
    const [isloading, setIsLoading] = useState<boolean>(false)
    const isColorReq = data.attributes?.some(attr => attr.name.toLowerCase() === "color")
    const isSizeReq = data.attributes?.some(attr => attr.name.toLowerCase() === "size")
    const router = useRouter()

    useEffect(() => {
        let isMounted = true;
        fetchVariations()
        // loadVariations();
        setIsLoading(false);
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (data.attributes?.length > 0) {
            const matchingVariation = findMatchingVariation();
            setSelectedVariation(matchingVariation);
        }
        // console.log(selectedVariation)
    }, [activeColor, activeSize]);


    const fetchVariations = useCallback(async () => {
        if (data.attributes?.length > 1 || (data.attributes.some(attr => attr.name.toLowerCase().includes("size"))) && data.attributes?.length === 1) { setActionType("quick shop") };
        if (data.attributes?.length > 0) { setMobileActionType("quick shop") };


        if (data.attributes?.length > 0) {
            const response = await getProductVariationsById({ id: data.id.toString() });
            if (response.status === 'OK') {
                setVariations(response.variations!);
                // return response.variations;
            }
        }

    }, [])

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

    // console.log('Variations fetched:', variations);

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

    // This "smart" handler updates the size and ensures the selected color is still valid.
    const handleActiveSize = (newSize: string) => {
        setActiveSize(newSize);

        // Find all colors that are available with the newly selected size
        const availableColors = new Set(
            variations
                .filter(v => v.attributes.some(a => a.name.toLowerCase() === 'size' && a.option === newSize))
                .map(v => v.attributes.find(a => a.name.toLowerCase() === 'color')?.option)
                .filter((c): c is string => !!c)
        );

        // If the current color is not in the list of available colors for the new size,
        // automatically switch to the first available color.
        if (availableColors.size > 0 && !availableColors.has(activeColor)) {
            setActiveColor(Array.from(availableColors)[0]);
        }
    };

    const handleAddToCart = () => {
        const cartVariation = findMatchingVariation()

        // Call the single, updated function from the context
        addToCart(
            data, // The base product data
            1,    // The quantity to add
            activeSize,
            activeColor,
            cartVariation?.id?.toString(),
            cartVariation ?? undefined
        );

        // Open the modal
        openModalCart();
    };

    const handleAddToWishlist = () => {
        // if product existed in wishlit, remove from wishlist and set state to false
        if (wishlistState.wishlistArray.some(item => item.id === data.id)) {
            removeFromWishlist(data.id.toString());
        } else {
            // else, add to wishlist and set state to true
            addToWishlist(data);
        }
        openModalWishlist();
    };

    // const handleAddToCompare = () => {
    // if product existed in wishlit, remove from wishlist and set state to false
    // if (compareState.compareArray.length < 3) {
    //     if (compareState.compareArray.some(item => item.id === data.id)) {
    //         removeFromCompare(data.id);
    //     } else {
    //         // else, add to wishlist and set state to true
    //         addToCompare(data);
    //     }
    // } else {
    //     alert('Compare up to 3 products')
    // }

    // openModalCompare();
    // };

    const handleQuickviewOpen = () => {
        openQuickview(data)
    }

    const handleDetailProduct = (productId: string) => {
        // redirect to shop with category selected
        router.push(`/product/${productId}`);
    };

    const percentSale = Math.floor(100 - ((Number(data.sale_price || selectedVariation?.sale_price) / Number(data.regular_price || selectedVariation?.regular_price)) * 100))
    const percentSold = Math.floor((data.total_sales / data.stock_quantity!) * 100)

    const isAddToCartDisabled =
        data.stock_status === "outofstock" ||
        !data.purchasable ||
        (isColorReq && !activeColor) ||
        (isSizeReq && !activeSize);

    const addToCartButtonText = data.stock_status === "outofstock" ? "Out Of Stock" : "Add To Cart";

    const addToCartButtonClasses = isAddToCartDisabled
        ? "bg-surface text-secondary2 border"
        : "bg-black text-white hover:bg-green-300";


    if (isloading) {
        return (
            <div className={`product-item grid-type ${style} animate-pulse`}>
                <div className="product-main cursor-pointer block">
                    <div className="product-thumb bg-white relative overflow-hidden rounded-2xl">
                        <div className="product-img w-full h-full aspect-[3/4] bg-gray-200"></div>
                    </div>
                    <div className="product-infor mt-4 lg:mb-7">
                        <div className="product-name text-title bg-gray-200 h-6 mb-2"></div>
                        <div className="product-price-block flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
                            <div className="product-price text-title bg-gray-200 h-6 w-20"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* new Date(data.date_created) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); */}
            {type === "grid" ? (
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
                            {style === 'style-1' || style === 'style-3' || style === 'style-4' ? (
                                <div className="list-action-right absolute top-3 right-3 max-lg:hidden">
                                    {/* {style === 'style-4' && (
                                        <div
                                            className={`add-cart-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mb-2 ${compareState.compareArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleAddToCart()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Cart</div>
                                            <Icon.ShoppingBagOpenIcon size={20} />
                                        </div>
                                    )} */}
                                    <div
                                        className={`add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${wishlistState.wishlistArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAddToWishlist()
                                        }}
                                    >
                                        <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Wishlist</div>
                                        {wishlistState.wishlistArray.some(item => item.id.toString() === data.id.toString()) ? (
                                            <>
                                                <Icon.HeartIcon size={18} weight='fill' className='text-white' />
                                            </>
                                        ) : (
                                            <>
                                                <Icon.HeartIcon size={18} />
                                            </>
                                        )}
                                    </div>
                                    {/* <div
                                        className={`compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mt-2 ${compareState.compareArray?.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAddToCompare()
                                        }}
                                    >
                                        <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Compare Product</div>
                                        <Icon.RepeatIcon size={18} className='compare-icon' />
                                        <Icon.CheckCircleIcon size={20} className='checked-icon' />
                                    </div> */}
                                    {/* {style === 'style-3' || style === 'style-4' ? (
                                        <div
                                            className={`quick-view-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mt-2 ${compareState.compareArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleQuickviewOpen()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Quick View</div>
                                            <Icon.EyeIcon size={20} />
                                        </div>
                                    ) : <></>} */}
                                </div>
                            ) : <></>}
                            <Link href={`/product/${data.id}`} prefetch>
                                <div className="product-img w-full h-full aspect-[3/4]">
                                    {activeColor ? (
                                        <>
                                            {selectedVariation?.image?.src && (
                                                <Image
                                                    src={selectedVariation.image.src}
                                                    width={500}
                                                    height={500}
                                                    alt={data.name}
                                                    priority={true}
                                                    className="w-full h-full object-cover duration-700"
                                                />
                                            )}
                                        </>
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
                                <>
                                    <Marquee className='banner-sale-auto bg-black absolute bottom-0 left-0 w-full py-1.5'>
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {percentSale}% OFF</div>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {percentSale}% OFF</div>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {percentSale}% OFF</div>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {percentSale}% OFF</div>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {percentSale}% OFF</div>
                                        <Icon.LightningIcon weight='fill' className='text-red' />
                                    </Marquee>
                                </>
                            )}
                            {style === 'style-2' || style === 'style-4' ? (
                                <div className="list-size-block flex items-center justify-center gap-4 absolute bottom-0 left-0 w-full h-8">
                                    {data.attributes.find(item => item.name.toLowerCase() === "size")?.options.map((item: string, index: number) => (
                                        <strong key={index} className="size-item text-xs font-bold uppercase">{item}</strong>
                                    ))}
                                </div>
                            ) : <></>}
                            {style === 'style-1' || style === 'style-3' ?
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
                                    {actionType === 'add to cart' ? (
                                        <button
                                            className={`add-cart-btn  w-full text-button-uppercase py-2 text-center rounded-md duration-500 
                                                ${addToCartButtonClasses} disabled:opacity-100 disabled:pointer-events-none 
                                                 `}
                                            disabled={isAddToCartDisabled}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleAddToCart()
                                            }}
                                        >
                                            <span className='text-[11px] lg:text-xs'>
                                                Add To Cart
                                            </span>
                                        </button>
                                    ) : (
                                        <>
                                            <div
                                                className="quick-shop-btn text-button-uppercase  py-2 text-center rounded-md align-center duration-500 bg-white hover:bg-black hover:text-white"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setOpenQuickShop(!openQuickShop)
                                                }}
                                            >
                                                <span className='text-[11px] lg:text-xs'>
                                                    Quick Shop
                                                </span>
                                            </div>
                                            <div
                                                className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                {data.attributes.some(item => item.name.toLowerCase() === "size") &&
                                                    <div className="list-size flex items-center  flex-wrap gap-2 border-b-line mb-2">
                                                        <div >Size : </div>
                                                        {data.attributes.find(item => item.name.toLowerCase() === "size")?.options.map((item: string, index: number) => (
                                                            <div
                                                                className={`size-item w-fit h-10 px-3 py-3 text-xs rounded-sm flex items-center justify-center text-button bg-white border border-line ${activeSize === item ? 'active' : ''}`}
                                                                key={index}
                                                                onClick={() => handleActiveSize(item)}
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                }
                                                {data.attributes.some(item => item.name.toLowerCase() === "color") &&
                                                    <div className="list-size flex items-center  flex-wrap gap-2">
                                                        <div >Color : </div>
                                                        {data.attributes.find(item => item.name.toLowerCase() === "color")?.options.map((item: string, index: number) => (
                                                            <div
                                                                className={`size-item w-fit h-10 text-xs overflow-ellipsis py-4 px-3 rounded-sm flex items-center justify-center text-button bg-white border border-line ${activeColor === item ? 'active' : ''}`}
                                                                key={index}
                                                                onClick={() => handleActiveColor(item)}
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                }
                                                <button
                                                    type="button"
                                                    disabled={isAddToCartDisabled}
                                                    onClick={() => { handleAddToCart(); setOpenQuickShop(false) }}
                                                    className={`
                                                        add-cart-btn w-full py-3 mt-2 items-center justify-center rounded-md 
                                                        text-sm font-medium transition-colors focus-visible:outline-none 
                                                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                                                        disabled:opacity-100 disabled:pointer-events-none 
                                                        ${addToCartButtonClasses}
                                                    `}
                                                >
                                                    {addToCartButtonText}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                : <></>
                            }
                            {style === 'style-2' || style === 'style-5' ?
                                <>
                                    <div className={`list-action flex items-center justify-center gap-3 px-5 absolute w-full ${style === 'style-2' ? 'bottom-12' : 'bottom-5'} max-lg:hidden`}>
                                        {/* {style === 'style-2' && (
                                            <div
                                                className={`add-cart-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleAddToCart()
                                                }}
                                            >
                                                <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Cart</div>
                                                <Icon.ShoppingBagOpenIcon size={20} />
                                            </div>
                                        )} */}
                                        <div
                                            className={`add-wishlist-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${wishlistState.wishlistArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAddToWishlist()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Wishlist</div>
                                            {wishlistState.wishlistArray.some(item => item.id.toString() === data.id.toString()) ? (
                                                <>
                                                    <Icon.HeartIcon size={18} weight='fill' className='text-white' />
                                                </>
                                            ) : (
                                                <>
                                                    <Icon.HeartIcon size={18} />
                                                </>
                                            )}
                                        </div>
                                        {/* <div
                                            className={`compare-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAddToCompare()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Compare Product</div>
                                            <Icon.RepeatIcon size={18} className='compare-icon' />
                                            <Icon.CheckCircleIcon size={20} className='checked-icon' />
                                        </div>
                                        <div
                                            className={`quick-view-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(item => item.id.toString() === data.id.toString()) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleQuickviewOpen()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Quick View</div>
                                            <Icon.EyeIcon size={20} />
                                        </div> */}
                                        {style === 'style-5' && actionType !== 'add to cart' && (
                                            <div
                                                className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                <div className="list-size flex items-center justify-center flex-wrap gap-2">
                                                    {data.attributes.find(item => item.name.toLowerCase() === "size")?.options.map((item: string, index: number) => (
                                                        <div
                                                            className={`size-item w-10 h-10 rounded-full flex items-center justify-center text-button bg-white border border-line ${activeSize === item ? 'active' : ''}`}
                                                            key={index}
                                                            onClick={() => handleActiveSize(item)}
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isAddToCartDisabled}
                                                    onClick={handleAddToCart}
                                                    className={`
                                                        button-main w-full inline-flex items-center justify-center rounded-md 
                                                        text-sm font-medium transition-colors focus-visible:outline-none 
                                                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                                                        disabled:opacity-100 disabled:pointer-events-none 
                                                        ${addToCartButtonClasses}
                                                    `}
                                                >
                                                    {addToCartButtonText}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </> :
                                <></>
                            }
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
                                {mobileActionType === 'quick shop' ? (
                                    <>
                                        <div
                                            className="add-cart-btn  w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                            onClick={e => {
                                                e.stopPropagation();
                                                if (mobileActionType === 'quick shop') {
                                                    setOpenQuickShop(!openQuickShop)
                                                } else {
                                                    handleAddToCart()
                                                }
                                            }}
                                        >
                                            <Icon.ShoppingBagOpenIcon className='text-lg' />
                                        </div>

                                    </>
                                ) : (
                                    <div
                                        className="add-cart-btn  w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (mobileActionType === 'quick shop') {
                                                setOpenQuickShop(!openQuickShop)
                                            } else {
                                                handleAddToCart()
                                            }
                                        }}
                                    >
                                        <Icon.ShoppingBagOpenIcon className='text-lg' />
                                    </div>
                                )}

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
                            {data.attributes?.length > 0 ? (
                                <div className=" list-color py-2 !max-lg:hidden flex items-center gap-2 flex-wrap duration-500">
                                    {data.attributes.find(item => item.name.toLowerCase() === "color")?.options.map((item: string, index: number) => (
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
                            ) : <></>
                            }
                            {/* {data.variation.length > 0 && data.action === 'quick shop' && (
                                <div className="list-color-image max-md:hidden flex items-center gap-2 flex-wrap duration-500">
                                    {data.variation.map((item, index) => (
                                        <div
                                            className={`color-item w-8 h-8 rounded-lg duration-300 relative ${activeColor === item.color ? 'active' : ''}`}
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleActiveColor(item.color)
                                            }}
                                        >
                                            <Image
                                                src={item.colorImage}
                                                width={100}
                                                height={100}
                                                alt='color'
                                                priority={true}
                                                className='w-full h-full object-cover rounded-lg'
                                            />
                                            <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">{item.color}</div>
                                        </div>
                                    ))}
                                </div>
                            )} */}
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
                                <>
                                    {actionType === 'add to cart' ? (
                                        <button
                                            type="button"
                                            className={`add-cart-btn w-full text-button-uppercase py-2.5 text-center mt-2 rounded-full 
                                                duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden 
                                                disabled:opacity-100 disabled:pointer-events-none 
                                                ${addToCartButtonClasses}`
                                            }
                                            disabled={isAddToCartDisabled}
                                            onClick={e => {
                                                e.stopPropagation()
                                                handleAddToCart()
                                            }}
                                        >
                                            Add To Cart
                                        </button>
                                    ) : (
                                        <div
                                            className="quick-shop-btn text-button-uppercase py-2.5 text-center mt-2 rounded-full duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden"
                                            onClick={e => {
                                                e.stopPropagation()
                                                setOpenQuickShop(!openQuickShop)
                                            }}
                                        >
                                            Quick Shop
                                        </div>
                                    )}
                                </>
                            }
                        </div>
                    </div>
                </div>
            ) : (
                <>

                </>
            )
            }

            <QuickShopDrawer open={openQuickShop} onClose={() => setOpenQuickShop(false)}>
                {/* This is your original quick shop content, now passed as children.
              I've removed the outer div and its positioning classes.
            */}
                {data.attributes.some(item => item.name.toLowerCase() === "size") &&
                    <div className="list-size flex items-center flex-wrap gap-2 border-b border-line pb-4 mb-4">
                        <div>Size :</div>
                        {data.attributes.find(item => item.name.toLowerCase() === "size")?.options.map((item: string, index: number) => (
                            <button
                                key={index}
                                className={`size-item w-10 h-10 text-sm rounded-md flex items-center justify-center border ${activeSize === item ? 'bg-black text-white border-black' : 'bg-white border-line'}`}
                                onClick={() => handleActiveSize(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                }
                {data.attributes.some(item => item.name.toLowerCase() === "color") &&
                    <div className="list-color flex items-center flex-wrap gap-2">
                        <div>Color :</div>
                        {data.attributes.find(item => item.name.toLowerCase() === "color")?.options.map((item: string, index: number) => (
                            <button
                                key={index}
                                className={`color-item px-4 h-10 text-sm rounded-md flex items-center justify-center border ${activeColor === item ? 'bg-black text-white border-black' : 'bg-white border-line'}`}
                                onClick={() => handleActiveColor(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                }
                <button
                    type="button"
                    disabled={isAddToCartDisabled}
                    onClick={() => { handleAddToCart(); setOpenQuickShop(false) }}
                    className={`w-full py-3 mt-5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${addToCartButtonClasses}`}
                >
                    {addToCartButtonText}
                </button>
            </QuickShopDrawer>
        </>
    )
}

export default Product;