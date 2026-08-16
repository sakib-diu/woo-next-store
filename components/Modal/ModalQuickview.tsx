'use client'

// Quickview.tsx
import { useCart } from '@/context/CartContext';
import { useCompare } from '@/context/CompareContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useModalCompareContext } from '@/context/ModalCompareContext';
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAppData } from '@/context/AppDataContext';
import { ProductType } from '@/types/ProductType';
import { Product as ProductType2, VariationProduct } from '@/types/product-type';
import { decodeHtmlEntities } from '@/lib/utils';
import { useProductVariations } from '@/hooks/useProductVariations';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import Rate from '../Other/Rate';
import ModalSizeguide from './ModalSizeguide';
import VariationSkeleton from '../Other/VariationSkeleton';
import parse from 'html-react-parser';
import { useRouter } from 'next/navigation';

const ModalQuickview = () => {
    const [photoIndex, setPhotoIndex] = useState(0)
    const [openPopupImg, setOpenPopupImg] = useState(false)
    const [openSizeGuide, setOpenSizeGuide] = useState<boolean>(false)
    const { selectedProduct, closeQuickview } = useModalQuickviewContext()
    const hasVariations = !!selectedProduct?.id && (selectedProduct.variations?.length ?? 0) > 0
    const { variations, isLoading: isLoadingVariations } = useProductVariations(selectedProduct?.id ?? 0, hasVariations)
    const [activeColor, setActiveColor] = useState<string>('')
    const [activeSize, setActiveSize] = useState<string>('')
    const [quantity, setQuantity] = useState(1)
    const [selectedVariation, setSelectedVariation] = useState<VariationProduct | null>(null)
    const { currentCurrency } = useAppData()
    const { addToCart, updateCart, cartState } = useCart()
    const { openModalCart } = useModalCartContext()
    const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist()
    const { openModalWishlist } = useModalWishlistContext()
    const { addToCompare, removeFromCompare, compareState } = useCompare();
    const { openModalCompare } = useModalCompareContext()
    const router = useRouter()

    const isColorReq = selectedProduct?.attributes?.some(attr => attr.name.toLowerCase() === "color") || false
    const isSizeReq = selectedProduct?.attributes?.some(attr => attr.name.toLowerCase() === "size") || false

    const variationImage = selectedVariation?.image
    const displayImages = variationImage?.src
        ? [variationImage, ...(selectedProduct?.images.filter(img => img.src !== variationImage.src) ?? [])]
        : selectedProduct?.images ?? []


    // Reset the active attributes and quantity when the selected product changes
    useEffect(() => {
        if (selectedProduct) {
            const colorAttr = selectedProduct.attributes?.find(attr => attr.name.toLowerCase() === "color");
            setActiveColor(colorAttr?.options[0] || '');

            const sizeAttr = selectedProduct.attributes?.find(attr => attr.name.toLowerCase() === "size");
            setActiveSize(sizeAttr?.options[0] || '');

            setQuantity(1);
        }

    }, [selectedProduct]);




    // Find matching variation based on activeColor or activeSize
    const findMatchingVariation = useCallback(() => {
        // If there are no variations loaded, we can't find a match.
        if (!variations || variations?.length === 0) return null;

        // Check if the product is supposed to have color and size variations
        const hasColorAttribute = selectedProduct?.attributes?.some(attr => attr.name.toLowerCase() === 'color' && attr.variation);
        const hasSizeAttribute = selectedProduct?.attributes?.some(attr => attr.name.toLowerCase() === 'size' && attr.variation);

        // Find a variation where every required attribute matches the active state.
        const matchingVariant = variations?.find((variation) => {
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
    }, [selectedProduct, activeColor, activeSize, variations]);

    useEffect(() => {
        if (!selectedProduct || !selectedProduct.variations || selectedProduct.variations.length === 0) {
            return;
        }
        // Find the first variation that matches the active color and size
        if (variations && variations.length > 0) {
            const initialVariation = findMatchingVariation();
            if (initialVariation) {
                setSelectedVariation(initialVariation);
            }
        }
    }, [selectedProduct, findMatchingVariation, variations, activeColor, activeSize]);

    useEffect(() => {
        // Find the variation that matches the active color and size
        const matchingVariation = findMatchingVariation();
        if (matchingVariation) {
            setSelectedVariation(matchingVariation);
        } else {
            setSelectedVariation(null);
        }
    }, [findMatchingVariation])

    const percentSale = selectedProduct ? Math.floor(100 - ((Number(selectedProduct?.sale_price || findMatchingVariation()?.sale_price) / Number(selectedProduct?.regular_price || findMatchingVariation()?.regular_price)) * 100)) : 0


    // const handleOpenSizeGuide = () => {
    //     setOpenSizeGuide(true);
    // };

    // const handleCloseSizeGuide = () => {
    //     setOpenSizeGuide(false);
    // };

    // This "smart" handler updates the color and ensures the selected size is still valid.
    const handleActiveColor = (newColor: string) => {
        setActiveColor(newColor);

        // Find all sizes that are available with the newly selected color
        const availableSizes = new Set(
            variations?.filter(v => v.attributes.some(a => a.name.toLowerCase() === 'color' && a.option === newColor))
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
            variations?.filter(v => v.attributes.some(a => a.name.toLowerCase() === 'size' && a.option === newSize))
                .map(v => v.attributes.find(a => a.name.toLowerCase() === 'color')?.option)
                .filter((c): c is string => !!c)
        );

        // If the current color is not in the list of available colors for the new size,
        // automatically switch to the first available color.
        if (availableColors.size > 0 && !availableColors.has(activeColor)) {
            setActiveColor(Array.from(availableColors)[0]);
        }
    };

    const handleIncreaseQuantity = () => {
        setQuantity(quantity + 1);
    };

    const handleDecreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const handleAddToCart = () => {
        if (selectedProduct) {
            const cartVariation = findMatchingVariation()

            addToCart(
                selectedProduct as unknown as ProductType2, // The base product data
                quantity,
                activeSize,
                activeColor,
                cartVariation?.id?.toString(),
                cartVariation ?? undefined
            );
            openModalCart()
            closeQuickview()
        }
    };

    const handleBuyNow = () => {
        if (selectedProduct) {
            const cartVariation = findMatchingVariation()

            addToCart(
                selectedProduct as unknown as ProductType2, // The base product data
                quantity,
                activeSize,
                activeColor,
                cartVariation?.id?.toString(),
                cartVariation ?? undefined
            );
            router.push("/checkout")
            closeQuickview()
        }
    }

    const handleAddToWishlist = () => {
        if (selectedProduct) {
            // if product existed in wishlit, remove from wishlist and set state to false
            if (wishlistState.wishlistArray.some(item => item.id === selectedProduct.id)) {
                removeFromWishlist(selectedProduct.id.toString());
            } else {
                // else, add to wishlist and set state to true
                addToWishlist(selectedProduct as unknown as ProductType2);
            }
            openModalWishlist();
        }
    };

    const handleClose = () => {
        // ✨ 2. Reset all local state to its initial state
        setSelectedVariation(null);
        setActiveColor('');
        setActiveSize('');
        setQuantity(1);

        // ✨ 3. Call the original context function to finish closing
        closeQuickview();
    };

    const handleOpenSizeGuide = () => {
        setOpenSizeGuide(true);
    };

    const handleCloseSizeGuide = () => {
        setOpenSizeGuide(false);
    };

    return (
        <>
            <div className={`modal-quickview-block`} onClick={handleClose}>
                <div
                    className={`modal-quickview-main py-6 ${selectedProduct !== null ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="flex h-full max-md:flex-col-reverse gap-y-6">
                        <div className="left lg:w-[388px] md:w-[300px] flex-shrink-0 px-6">
                            <div className="list-img max-md:flex items-center gap-4">
                                {displayImages.map((item, index) => (
                                    <div className="bg-img w-full aspect-[3/4] max-md:w-[150px] max-md:flex-shrink-0 rounded-[20px] overflow-hidden md:mt-6" key={index}>
                                        <Image
                                            src={item.src}
                                            width={1500}
                                            height={2000}
                                            alt={item.alt || item.name}
                                            priority={true}
                                            className='w-full h-full object-cover'
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="right w-full px-4">
                            <div className="heading pb-6 px-4 flex items-center justify-between relative">
                                <div className="heading5">Quick View</div>
                                <div
                                    className="close-btn absolute right-0 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                    onClick={closeQuickview}
                                >
                                    <Icon.X size={14} />
                                </div>
                            </div>
                            <div className="product-infor px-4">
                                <div className="flex justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="caption2 text-secondary font-semibold uppercase">{selectedProduct?.tags?.[0]?.name || selectedProduct?.type}</div>
                                        <div className="heading4 mt-1 break-words">{selectedProduct?.name}</div>
                                    </div>
                                    <div
                                        className={`add-wishlist-btn w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-lg duration-300 flex-shrink-0 hover:bg-black hover:text-white ${wishlistState.wishlistArray.some(item => item.id === selectedProduct?.id) ? 'active' : ''}`}
                                        onClick={handleAddToWishlist}
                                    >
                                        {wishlistState.wishlistArray.some(item => item.id === selectedProduct?.id) ? (
                                            <Icon.Heart size={20} weight='fill' className='text-red' />
                                        ) : (
                                            <Icon.Heart size={20} />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center mt-3">
                                    <Rate currentRate={Number(selectedProduct?.average_rating) || 0} size={14} />
                                    <span className='caption1 text-secondary'>(1.234 reviews)</span>
                                </div>
                                <div className="mt-5 pb-6 border-b border-line">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {isLoadingVariations && selectedProduct?.variations && selectedProduct.variations.length > 0 ? (
                                            <div className="animate-pulse">
                                                <div className="h-6 bg-surface rounded w-20"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="product-price heading5">
                                                    {currentCurrency ? decodeHtmlEntities(currentCurrency.symbol) : '$'}
                                                    {Number(selectedVariation?.sale_price || selectedVariation?.price || selectedProduct?.sale_price || selectedProduct?.price).toFixed(2)}
                                                </div>
                                                {((selectedVariation?.on_sale || selectedProduct?.on_sale) && percentSale > 0) && (
                                                    <>
                                                        <div className='w-px h-4 bg-line'></div>
                                                        <div className="product-origin-price font-normal text-secondary2">
                                                            <del>
                                                                {currentCurrency ? decodeHtmlEntities(currentCurrency.symbol) : '$'}
                                                                {Number(selectedVariation?.regular_price || selectedProduct?.regular_price || selectedProduct?.price).toFixed(2)}
                                                            </del>
                                                        </div>
                                                        <div className="product-sale caption2 font-semibold bg-green px-3 py-0.5 inline-block rounded-full">
                                                            -{percentSale}%
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className='desc text-secondary parsed-html max-w-prose mt-3'>{selectedProduct?.short_description ? parse(selectedProduct.short_description) : parse(selectedProduct?.description.toString().slice(0, 200) + "...")}</div>
                                </div>
                                <div className="list-action mt-6">
                                    {isLoadingVariations && selectedProduct?.variations && selectedProduct.variations.length > 0 ? (
                                        <VariationSkeleton />
                                    ) : (
                                        <>
                                            {selectedProduct?.attributes?.some(item => item.name.toLowerCase() === "color") && (
                                                <div className="choose-color">
                                                    <div className="text-title">Colors: <span className='text-title color'>{activeColor}</span></div>
                                                    <div className="list-color flex items-center gap-2 flex-wrap mt-3">
                                                        {selectedProduct?.attributes?.find(item => item.name.toLowerCase() === "color")?.options.map((item, index) => (
                                                            <div
                                                                className={`color-item w-fit h-fit flex px-3 py-2 items-center justify-center text-button rounded-md  border border-line ${activeColor === item ? 'active bg-black-800 text-white ' : ''}`}
                                                                key={index}
                                                                onClick={() => handleActiveColor(item)}
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedProduct?.attributes?.some(item => item.name.toLowerCase() === "size") && (
                                                <div className="choose-size mt-5">
                                                    {/* <div className="text-title">Size: <span className='text-title size'>{activeSize}</span></div> */}
                                                    <div className="heading flex items-center justify-between">
                                                        <div className="text-title">Size: <span className='text-title size'>{activeSize}</span></div>
                                                        <div
                                                            className="caption1 size-guide text-red underline cursor-pointer"
                                                            onClick={handleOpenSizeGuide}
                                                        >
                                                            Size Guide
                                                        </div>
                                                        <ModalSizeguide data={selectedProduct} isOpen={openSizeGuide} onClose={handleCloseSizeGuide} />
                                                    </div>
                                                    <div className="list-size flex items-center gap-2 flex-wrap mt-3">
                                                        {selectedProduct?.attributes?.find(item => item.name.toLowerCase() === "size")?.options.map((item, index) => (
                                                            <div
                                                                className={`size-item ${item === 'freesize' ? 'px-3 py-2' : 'w-12 h-12'} flex items-center justify-center text-button rounded-full bg-white border border-line ${activeSize === item ? 'active' : ''}`}
                                                                key={index}
                                                                onClick={() => handleActiveSize(item)}
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="text-title mt-5">Quantity:</div>
                                    <div className="choose-quantity flex items-center max-xl:flex-wrap lg:justify-between gap-5 mt-3">
                                        <div className="quantity-block md:p-3 max-md:py-1.5 max-md:px-3 flex items-center justify-between rounded-lg border border-line sm:w-[180px] w-[120px] flex-shrink-0">
                                            <Icon.Minus
                                                onClick={!isLoadingVariations ? handleDecreaseQuantity : undefined}
                                                className={`${quantity === 1 || isLoadingVariations ? 'disabled' : ''} cursor-pointer body1`}
                                            />
                                            <div className="body1 font-semibold">{quantity}</div>
                                            <Icon.Plus
                                                onClick={!isLoadingVariations ? handleIncreaseQuantity : undefined}
                                                className={`${quantity === selectedProduct?.stock_quantity || isLoadingVariations ? 'disabled' : ''} cursor-pointer body1`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isLoadingVariations || selectedProduct?.stock_status === "outofstock" || (isColorReq && activeColor.length === 0) || (isSizeReq && activeSize.length === 0)}
                                            onClick={handleAddToCart}
                                            className={`button-main w-full text-center ${isLoadingVariations || selectedProduct?.stock_status === "outofstock" || selectedProduct?.stock_quantity === 0 || !selectedProduct?.purchasable || (isColorReq && activeColor.length === 0) || (isSizeReq && activeSize.length === 0)
                                                ? "bg-surface text-secondary2 border"
                                                : "bg-white text-black border border-black"
                                                }`}
                                        >
                                            {isLoadingVariations ? "Loading..." : (selectedProduct?.stock_status === "outofstock" || selectedProduct?.stock_quantity === 0 ? "Out Of Stock" : "Add To Cart")}
                                        </button>
                                    </div>
                                    <div className="button-block mt-5">
                                        <button
                                            onClick={handleBuyNow}
                                            type="button"
                                            disabled={isLoadingVariations || selectedProduct?.stock_status === "outofstock" || (isColorReq && activeColor.length === 0) || (isSizeReq && activeSize.length === 0)}
                                            className={`button-main w-full text-center ${isLoadingVariations || selectedProduct?.stock_status === "outofstock" || selectedProduct?.stock_quantity === 0 || !selectedProduct?.purchasable || (isColorReq && activeColor.length === 0) || (isSizeReq && activeSize.length === 0)
                                                ? "bg-surface text-secondary2 border"
                                                : "bg-black text-white"
                                                }`}
                                        >
                                            {isLoadingVariations ? "Loading..." : (selectedProduct?.stock_status === "outofstock" || selectedProduct?.stock_quantity === 0 ? "Out Of Stock" : "Buy It Now")}
                                        </button>
                                    </div>
                                    <div className="flex items-center flex-wrap lg:gap-20 gap-8 gap-y-4 mt-5">
                                        {/* <div className="compare flex items-center gap-3 cursor-pointer" onClick={handleAddToCompare}>
                                            <div
                                                className="compare-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white"
                                            >
                                                <Icon.ArrowsCounterClockwise className='heading6' />
                                            </div>
                                            <span>Compare</span>
                                        </div> */}
                                        <div className="share flex items-center gap-3 cursor-pointer">
                                            <div className="share-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white">
                                                <Icon.ShareNetwork weight='fill' className='heading6' />
                                            </div>
                                            <span>Share Products</span>
                                        </div>
                                    </div>
                                    <div className="more-infor mt-6">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <Icon.ArrowClockwise className='body1' />
                                                <div className="text-title">Delivery & Return</div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Icon.Question className='body1' />
                                                <div className="text-title">Ask A Question</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1 mt-3">
                                            <Icon.Timer className='body1 flex-shrink-0' />
                                            <span className="text-title flex-shrink-0">Estimated Delivery:</span>
                                            <span className="text-secondary">{new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1 mt-3">
                                            <div className="text-title flex-shrink-0">SKU:</div>
                                            <div className="text-secondary break-words">{selectedProduct?.sku || "N/A"}</div>
                                        </div>
                                        <div className="flex items-start flex-wrap gap-1 mt-3">
                                            <div className="text-title flex-shrink-0">Categories:</div>
                                            <div className="text-secondary break-words min-w-0">
                                                {selectedProduct?.categories?.map((item, index) => item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase()).join(", ") || "N/A"}
                                            </div>
                                        </div>
                                        <div className="flex items-start flex-wrap gap-1 mt-3">
                                            <div className="text-title flex-shrink-0">Tag:</div>
                                            <div className="text-secondary break-words min-w-0">
                                                {selectedProduct?.tags?.map((item) => item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase()).join(", ") || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="list-payment mt-7">
                                        <div className="main-content lg:pt-8 pt-6 lg:pb-6 pb-4 sm:px-4 px-3 border border-line rounded-xl relative w-full">
                                            <div className="heading6 px-5 bg-white absolute -top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap">Guaranteed safe checkout</div>
                                            <div className="list grid grid-cols-4">
                                                <div className="item flex items-center justify-center lg:px-3 px-1">
                                                    <Image
                                                        src={'/images/payment/visa_logo.png'}
                                                        width={500}
                                                        height={450}
                                                        alt='payment'
                                                        className='w-full rounded-lg p-1 border-line border'
                                                    />
                                                </div>
                                                <div className="item flex items-center justify-center lg:px-3 px-1">
                                                    <Image
                                                        src={'/images/payment/master_card_logo.png'}
                                                        width={500}
                                                        height={450}
                                                        alt='payment'
                                                        className='w-full rounded-lg p-1 border-line border'
                                                    />
                                                </div>
                                                <div className="item flex items-center justify-center lg:px-3 px-1">
                                                    <Image
                                                        src={'/images/payment/paypal_logo.png'}
                                                        width={500}
                                                        height={450}
                                                        alt='payment'
                                                        className='w-full rounded-lg p-1 border-line border'
                                                    />
                                                </div>
                                                <div className="item flex items-center justify-center lg:px-3 px-1">
                                                    <Image
                                                        src={'/images/payment/google_pay_logo.png'}
                                                        width={500}
                                                        height={450}
                                                        alt='payment'
                                                        className='w-full rounded-lg p-1 border-line border'
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

export default ModalQuickview;
