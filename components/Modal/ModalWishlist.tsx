'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalWishlistContext } from '@/context/ModalWishlistContext'
import { useWishlist } from '@/context/WishlistContext'
import { decodeHtmlEntities } from '@/lib/utils';
import { useAppData } from '@/context/AppDataContext';
import { PATH } from '../../constant/pathConstants';

const ModalWishlist = () => {
    const { isModalOpen, closeModalWishlist } = useModalWishlistContext();
    const { wishlistState, removeFromWishlist } = useWishlist()
    const { currentCurrency } = useAppData()
    // const currentCurrency = { name: 'Doller', symbol: '$', code: 'USD' };

    return (
        <>
            <div className={`modal-wishlist-block`} onClick={closeModalWishlist}>
                <div
                    className={`modal-wishlist-main py-6 ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="heading px-6 pb-3 flex items-center justify-between relative">
                        <div className="heading5">Wishlist</div>
                        <div
                            className="close-btn absolute right-6 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                            onClick={closeModalWishlist}
                        >
                            <Icon.X size={14} />
                        </div>
                    </div>
                    <div className="list-product px-6">
                        {wishlistState.wishlistArray.map((product) => (
                            <div key={product.id} className='item py-5 flex items-center justify-between gap-3 border-b border-line'>
                                <div className="infor flex items-center gap-5">
                                    <div className="bg-img">
                                        <Image
                                            src={product.images[0].src}
                                            width={300}
                                            height={300}
                                            alt={product.name}
                                            className='w-[100px] aspect-square flex-shrink-0 rounded-lg'
                                        />
                                    </div>
                                    <div className=''>
                                        <div className="name text-button">{product.name}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            {product.on_sale && product.sale_price ? (
                                                <>
                                                    <div className="product-price text-title">{decodeHtmlEntities(currentCurrency!.symbol)}{Number(product.sale_price).toFixed(2)}</div>
                                                    <div className="product-origin-price text-title text-secondary2"><del>{decodeHtmlEntities(currentCurrency!.symbol)}{Number(product.price).toFixed(2)}</del></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="product-price text-title">{decodeHtmlEntities(currentCurrency!.symbol)}{Number(product.price).toFixed(2)}</div>
                                                </>
                                            )
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="remove-wishlist-btn caption1 font-semibold text-red underline cursor-pointer" onClick={() => removeFromWishlist(product.id.toString())}>
                                    Remove
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="footer-modal p-6 border-t bg-white border-line absolute bottom-0 left-0 w-full text-center">
                        <Link href={PATH.WISHLIST} onClick={closeModalWishlist} className='button-main w-full text-center uppercase'>View All Wish List</Link>
                        <div onClick={closeModalWishlist} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Or continue shopping</div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ModalWishlist