'use client'

import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { decodeHtmlEntities, fromMinorUnit } from '@/lib/utils';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

const ModalCart = () => {
    const [activeTab, setActiveTab] = useState<string | undefined>('')
    const [couponCode, setCouponCode] = useState<string>('')
    const [couponError, setCouponError] = useState<string | null>(null)
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
    const { isModalOpen, closeModalCart } = useModalCartContext();
    const { cart, isLoading, isMutating, mutatingKey, removeFromCart, applyCoupon, removeCoupon } = useCart()

    const handleActiveTab = (tab: string) => {
        setActiveTab(tab)
    }

    const handleApplyCoupon = async () => {
        if (!couponCode) return
        setIsApplyingCoupon(true)
        setCouponError(null)
        const result = await applyCoupon(couponCode)
        setIsApplyingCoupon(false)
        if (result.success) {
            setCouponCode('')
            setActiveTab('')
        } else {
            setCouponError(result.error || 'Invalid coupon code')
        }
    }

    const minorUnit = cart.totals.currency_minor_unit
    const currencySymbol = decodeHtmlEntities(cart.totals.currency_symbol) || cart.totals.currency_symbol

    return (
        <>
            <div className={`modal-cart-block`} onClick={closeModalCart}>
                <div
                    className={`modal-cart-main flex ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="cart-block  !w-full py-5 pb-0 mb-0 flex flex-col justify-between overflow-auto">
                        <div className="heading px-6 pb-3 relative ">
                            <div className="heading5">Shopping Cart</div>
                            <div
                                className="close-btn absolute right-6 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                onClick={closeModalCart}
                            >
                                <Icon.X size={14} />
                            </div>
                        </div>

                        <div className=" px-6 flex-1 flex-col overflow-y-auto">
                            {cart.errors.length > 0 && (
                                <div className="cart-errors bg-red/10 text-red text-sm rounded-lg p-3 mb-3">
                                    {cart.errors.map((err, i) => <div key={i}>{err.message}</div>)}
                                </div>
                            )}
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-secondary">Loading your cart...</p>
                                </div>
                            ) : cart.items.length === 0 ? (
                                <div className="empty-cart flex flex-col items-center justify-center h-full">
                                    <Icon.Handbag size={64} className="text-gray-300" />
                                    <p className="mt-4 text-lg text-gray-500">Your cart is empty</p>
                                </div>
                            ) : (
                                cart.items.map((item) => (
                                    <div key={item.key} className={`item py-5 flex items-center justify-between gap-3 border-b border-line ${mutatingKey === item.key ? 'opacity-50' : ''}`}>
                                        <div className="infor flex items-center gap-3 w-full">
                                            <div className="bg-img w-[100px] aspect-square flex-shrink-0 rounded-lg overflow-hidden">
                                                <Image
                                                    src={item.images[0]?.src || "/images/product/1000x1000.png"}
                                                    width={300}
                                                    height={300}
                                                    alt={item.name}
                                                    className='w-full h-full'
                                                />
                                            </div>
                                            <div className='w-full'>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="name text-button">{decodeHtmlEntities(item.name)}</div>
                                                    <div
                                                        className={`remove-cart-btn caption1 font-semibold text-red underline cursor-pointer ${isMutating ? 'pointer-events-none opacity-50' : ''}`}
                                                        onClick={() => removeFromCart(item.key)}
                                                    >
                                                        {mutatingKey === item.key ? 'Removing...' : 'Remove'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-3 w-full">
                                                    <div className="flex items-center gap-1 text-secondary2 capitalize">
                                                        {item.variation.map((attr, i) => (
                                                            <span key={attr.attribute}>
                                                                {i > 0 ? '/' : ''}{attr.value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="product-price text-title">
                                                        {item.quantity} × {currencySymbol}{fromMinorUnit(item.prices.price, minorUnit).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="footer-modal bg-white h-fit w-full ">

                            <div className="flex items-center justify-between pt-6 px-6">
                                <div className="heading5">Subtotal</div>
                                <div className="heading5">{currencySymbol}{fromMinorUnit(cart.totals.total_items, minorUnit).toFixed(2)}</div>
                            </div>
                            <div className="block-button text-center p-6">
                                <div className="flex items-center gap-4">
                                    <Link
                                        href={'/cart'}
                                        className='button-main basis-1/2 bg-white border border-black text-black text-center uppercase'
                                        onClick={closeModalCart}
                                    >
                                        View cart
                                    </Link>
                                    <Link
                                        href={cart.items.length > 0 ? '/checkout' : '#'}
                                        className={`button-main basis-1/2 text-center uppercase ${cart.items.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
                                        onClick={closeModalCart}
                                    >
                                        CheckOut
                                    </Link>
                                </div>
                                <div onClick={closeModalCart} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Or continue shopping</div>
                            </div>
                            <div className={`tab-item note-block ${activeTab === 'coupon' ? 'active' : ''}`}>
                                <div className="px-6 py-4 border-b border-line cursor-pointer" onClick={() => handleActiveTab(activeTab === 'coupon' ? '' : 'coupon')}>
                                    <div className="item flex items-center gap-3">
                                        <Icon.TagIcon className='text-xl' />
                                        <div className="caption1">
                                            {cart.coupons.length > 0 ? `Coupon "${cart.coupons[0].code}" applied` : 'Add A Coupon Code'}
                                        </div>
                                    </div>
                                </div>
                                <div className="form pt-4 px-6">
                                    {cart.coupons.length > 0 ? (
                                        <button
                                            type="button"
                                            className="text-red underline caption1"
                                            disabled={isMutating}
                                            onClick={() => removeCoupon(cart.coupons[0].code)}
                                        >
                                            Remove coupon
                                        </button>
                                    ) : (
                                        <div className="">
                                            <label htmlFor='select-discount' className="caption1 text-secondary">Enter Code</label>
                                            <input
                                                className="border-line px-5 py-3 w-full rounded-xl mt-3"
                                                id="select-discount"
                                                type="text"
                                                placeholder="Discount code"
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value)}
                                            />
                                            {couponError && <div className="text-red caption1 mt-2">{couponError}</div>}
                                        </div>
                                    )}
                                </div>
                                {cart.coupons.length === 0 && (
                                    <div className="block-button text-center pt-4 px-6 pb-6">
                                        <div
                                            className={`button-main w-full text-center ${isApplyingCoupon ? 'opacity-50 pointer-events-none' : ''}`}
                                            onClick={handleApplyCoupon}
                                        >
                                            {isApplyingCoupon ? 'Applying...' : 'Apply'}
                                        </div>
                                        <div onClick={() => setActiveTab('')} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Cancel</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ModalCart
