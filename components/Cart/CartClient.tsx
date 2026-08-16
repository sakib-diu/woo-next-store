'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext'
import { cn, decodeHtmlEntities, fromMinorUnit } from '@/lib/utils'
import { PATH } from '../../constant/pathConstants'

const CartClient = () => {
    const router = useRouter()
    const { cart, isLoading, isMutating, mutatingKey, updateCartItem, removeFromCart, applyCoupon, removeCoupon } = useCart();
    const [discountCode, setDiscountCode] = useState<string>('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    const minorUnit = cart.totals.currency_minor_unit
    const currencySymbol = decodeHtmlEntities(cart.totals.currency_symbol) || cart.totals.currency_symbol

    const handleQuantityChange = (key: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        updateCartItem(key, newQuantity);
    };

    const handleDiscountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!discountCode) return;
        setCouponError(null);
        setIsApplyingCoupon(true);
        const result = await applyCoupon(discountCode);
        setIsApplyingCoupon(false);
        if (result.success) {
            setDiscountCode('');
        } else {
            setCouponError(result.error || 'Invalid coupon code');
        }
    }

    const redirectToCheckout = () => {
        router.push('/checkout');
    }

    const subtotal = fromMinorUnit(cart.totals.total_items, minorUnit);
    const discount = fromMinorUnit(cart.totals.total_discount, minorUnit);

    return (
        <div className="cart-block md:py-20 py-10">
            <div className="container">
                {cart.errors.length > 0 && (
                    <div className="cart-errors bg-red/10 text-red text-sm rounded-lg p-4 mb-6">
                        {cart.errors.map((err, i) => <div key={i}>{err.message}</div>)}
                    </div>
                )}
                <div className="content-main flex justify-between max-xl:flex-col gap-y-8">
                    <div className="xl:w-2/3 xl:pr-3 w-full">
                        <div className="list-product w-full sm:mt-7 mt-5">
                            <div className='w-full'>
                                <div className="heading bg-surface bora-4 pt-4 pb-4">
                                    <div className="flex">
                                        <div className="w-1/2">
                                            <div className="text-button text-center">Products</div>
                                        </div>
                                        <div className="w-1/12">
                                            <div className="text-button text-center">Price</div>
                                        </div>
                                        <div className="w-1/6">
                                            <div className="text-button text-center">Quantity</div>
                                        </div>
                                        <div className="w-1/6">
                                            <div className="text-button text-center">Total Price</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="list-product-main w-full mt-3">
                                    {isLoading ? (
                                        <div className='flex flex-col items-center justify-center h-[400px]'>
                                            <p className='text-lg text-secondary'>Loading your cart...</p>
                                        </div>
                                    ) : cart.items.length < 1 ? (
                                        <div className='flex flex-col items-center justify-center h-[400px]'>
                                            <Image src="/images/cart/empty_cart.svg" height={400} width={400} alt="Empty_Cart" />
                                            <p className='text-lg font-bold text-slate-700'>Your Cart is Empty</p>
                                        </div>
                                    ) : (
                                        cart.items.map((item) => (
                                            <div className={cn(
                                                "item flex md:mt-7 md:pb-7 mt-5 pb-5 border-b border-line w-full",
                                                mutatingKey === item.key ? 'opacity-50' : ''
                                            )} key={item.key}>
                                                <div className="w-1/2">
                                                    <div className="flex items-center gap-6">
                                                        <div className="bg-img md:w-[100px] w-20 aspect-[3/4]">
                                                            <Image
                                                                src={item.images[0]?.src || "/images/product/1000x1000.png"}
                                                                width={1000}
                                                                height={1000}
                                                                alt={item.name}
                                                                className='w-full h-full object-cover rounded-lg'
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-title">{decodeHtmlEntities(item.name)}</div>
                                                            <div className="list-select mt-3">
                                                                {item.variation.map((attr) => (
                                                                    <div key={attr.attribute} className="text-secondary text-sm">
                                                                        <span className="font-bold">{attr.attribute}:</span> {attr.value}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1/12 price flex items-center justify-center">
                                                    <div className="text-title text-center">{currencySymbol}{fromMinorUnit(item.prices.price, minorUnit).toFixed(2)}</div>
                                                </div>
                                                <div className="w-1/6 flex items-center justify-center">
                                                    <div className="quantity-block bg-surface md:p-3 p-2 flex items-center justify-between rounded-lg border border-line md:w-[100px] flex-shrink-0 w-20">
                                                        <Icon.MinusIcon
                                                            onClick={() => {
                                                                if (item.quantity > 1 && !isMutating) {
                                                                    handleQuantityChange(item.key, item.quantity - 1)
                                                                }
                                                            }}
                                                            className={`text-base max-md:text-sm ${item.quantity === 1 ? 'disabled' : ''}`}
                                                        />
                                                        <div className="text-button quantity">{item.quantity}</div>
                                                        <Icon.PlusIcon
                                                            onClick={() => {
                                                                if (!isMutating && item.quantity < item.quantity_limits.maximum) {
                                                                    handleQuantityChange(item.key, item.quantity + 1)
                                                                }
                                                            }}
                                                            className='text-base max-md:text-sm'
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-1/6 flex total-price items-center justify-center">
                                                    <div className="text-title text-center">{currencySymbol}{fromMinorUnit(item.totals.line_subtotal, item.totals.currency_minor_unit).toFixed(2)}</div>
                                                </div>
                                                <div className="w-1/12 flex items-center justify-center">
                                                    <Icon.XCircleIcon
                                                        className='text-xl max-md:text-base text-red cursor-pointer hover:text-black duration-500'
                                                        onClick={() => removeFromCart(item.key)}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="input-block discount-code w-full h-12 sm:mt-7 mt-5">
                            {cart.coupons.length > 0 ? (
                                <div className='text-green text-sm bg-green/30 p-4 flex items-center justify-between font-bold'>
                                    <span>Coupon Code {cart.coupons[0].code} Applied</span>
                                    <button
                                        type="button"
                                        className='text-red underline font-normal'
                                        disabled={isMutating}
                                        onClick={() => removeCoupon(cart.coupons[0].code)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <form className='w-full h-full relative' onSubmit={handleDiscountSubmit}>
                                    <input
                                        type="text"
                                        placeholder='Add voucher discount'
                                        className='w-full h-full bg-surface pl-4 pr-14 rounded-lg border border-line'
                                        value={discountCode}
                                        onChange={(e) => setDiscountCode(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isApplyingCoupon}
                                        className={cn(
                                            'button-main absolute top-1 bottom-1 right-1 px-5 rounded-lg flex items-center justify-center',
                                            isApplyingCoupon ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-black/90 duration-500'
                                        )}
                                    >
                                        {isApplyingCoupon ? 'Validating' : 'Apply Code'}
                                    </button>
                                </form>
                            )}
                            {couponError && (
                                <div className='text-red text-sm bg-red/10 p-4 text-center font-bold mt-2'> {couponError}</div>
                            )}
                        </div>
                    </div>
                    <div className="xl:w-1/3 xl:pl-12 w-full">
                        <div className="checkout-block bg-surface p-6 rounded-2xl">
                            <div className="heading5">Order Summary</div>
                            <div className="total-block py-5 flex justify-between border-b border-line">
                                <div className="text-title">Subtotal</div>
                                <div className="text-title">{currencySymbol}<span className="total-product">{subtotal.toFixed(2)}</span><span></span></div>
                            </div>
                            <div className="discount-block py-5 flex justify-between border-b border-line">
                                <div className="text-title flex gap-2 justify-center items-center">Discounts {cart.coupons.length > 0 && (<div className='bg-yellow/30 p-2 rounded-xl text-[15px] font-bold'>Coupon Applied</div>)}</div>
                                <div className="text-title"><span className="discount">{discount > 0 && `- ${currencySymbol}${discount.toFixed(2)} `}</span></div>
                            </div>
                            <div className="ship-block py-5 flex justify-between border-b border-line">
                                <div className="text-title flex justify-between">Shipping</div>
                                <div className="choose-type flex gap-12">
                                    <div className="right">
                                        <div className="ship text-sm">will be calculated at checkout</div>
                                    </div>
                                </div>
                            </div>
                            <div className="total-cart-block pt-4 pb-4 flex justify-between">
                                <div className="heading5">Total</div>
                                <div className="heading5">{currencySymbol}
                                    <span className="total-cart heading5">{(subtotal - discount).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="block-button flex flex-col items-center gap-y-4 mt-5">
                                <div
                                    className={cn('checkout-btn button-main text-center w-full', cart.items.length === 0 ? 'opacity-50 pointer-events-none' : '')}
                                    onClick={redirectToCheckout}
                                >
                                    Process To Checkout
                                </div>
                                <Link className="text-button hover-underline" href={PATH.SHOP}>Continue shopping</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CartClient
