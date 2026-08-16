"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useAppData } from '../../context/AppDataContext';
import { STOREINFO } from '../../constant/storeConstants';
import { PATH } from '../../constant/pathConstants';

const Footer = () => {
    const { currentCurrency, storeConfig } = useAppData()


    return (
        <>
            <div id="footer" className='footer'>
                <div className="footer-main bg-surface">
                    <div className="container">
                        <div className="content-footer py-[60px] flex justify-between flex-wrap gap-y-8">
                            <div className="company-infor basis-1/4 max-lg:basis-full pr-7">
                                <Link href={'/'} className="logo">
                                    <div className="heading4">{STOREINFO.name}</div>
                                </Link>
                                <div className='flex gap-3 mt-3'>
                                    <div className="flex flex-col ">
                                        <span className="text-button">Mail:</span>
                                        <span className="text-button mt-3">Phone:</span>
                                        <span className="text-button mt-3">Address:</span>
                                    </div>
                                    <div className="flex flex-col ">
                                        <span className=''>{STOREINFO.email}</span>
                                        <span className='mt-3'>{STOREINFO.phoneNumber}</span>
                                        <span className='mt-3 pt-px'>{storeConfig?.address.address1 + ", " + storeConfig?.address.address2}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="right-content flex flex-wrap gap-y-8 basis-3/4 max-lg:basis-full">
                                <div className="list-nav flex justify-between basis-2/3 max-md:basis-full gap-4">
                                    <div className="item flex flex-col basis-1/3 ">
                                        <div className="text-button-uppercase pb-3">Infomation</div>
                                        <Link className='caption1 has-line-before duration-300 w-fit' href={'#!'}>Contact us</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={'#!'}>Career</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={PATH.DASHBOARD}>My Account</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={'#!'}>FAQs</Link>
                                    </div>
                                    <div className="item flex flex-col basis-1/3 ">
                                        <div className="text-button-uppercase pb-3">Quick Shop</div>
                                        <Link className='caption1 has-line-before duration-300 w-fit' href={`${PATH.SHOP}?audience=women`}>Women</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={`${PATH.SHOP}?audience=men`}>Men</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={`${PATH.SHOP}?category=first_order_fashion`}>Clothes</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={`${PATH.SHOP}?category=second_order_fahion_common_accessories`}>Accessories</Link>
                                    </div>
                                    <div className="item flex flex-col basis-1/3 ">
                                        <div className="text-button-uppercase pb-3">Customer Services</div>
                                        <Link className='caption1 has-line-before duration-300 w-fit' href={'#!'}>Orders FAQs</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={'#!'}>Shipping</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={'#!'}>Privacy Policy</Link>
                                        <Link className='caption1 has-line-before duration-300 w-fit pt-2' href={`${PATH.DASHBOARD}?tab=orders`}>Return & Refund</Link>
                                    </div>
                                </div>
                                <div className="newsletter basis-1/3 pl-7 max-md:basis-full max-md:pl-0">
                                    <div className="text-button-uppercase">Newletter</div>
                                    <div className="caption1 mt-3">Sign up for our newsletter and get 10% off your first purchase</div>
                                    <div className="input-block w-full h-[52px] mt-4">
                                        <form className='w-full h-full relative' action="post">
                                            <input type="email" placeholder='Enter your e-mail' className='caption1 w-full h-full pl-4 pr-14 rounded-xl border border-line' required />
                                            <button className='w-[44px] h-[44px] bg-black flex items-center justify-center rounded-xl absolute top-1 right-1'>
                                                <Icon.ArrowRight size={24} color='#fff' />
                                            </button>
                                        </form>
                                    </div>
                                    <div className="list-social flex items-center gap-6 mt-4">
                                        <Link href={'https://www.facebook.com/'} target='_blank'>
                                            <div className="icon-facebook text-2xl text-black"></div>
                                        </Link>
                                        <Link href={'https://www.instagram.com/'} target='_blank'>
                                            <div className="icon-instagram text-2xl text-black"></div>
                                        </Link>
                                        <Link href={'https://www.twitter.com/'} target='_blank'>
                                            <div className="icon-twitter text-2xl text-black"></div>
                                        </Link>
                                        <Link href={'https://www.youtube.com/'} target='_blank'>
                                            <div className="icon-youtube text-2xl text-black"></div>
                                        </Link>
                                        <Link href={'https://www.pinterest.com/'} target='_blank'>
                                            <div className="icon-pinterest text-2xl text-black"></div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="footer-bottom py-3 flex items-center justify-between gap-5 max-lg:justify-center max-lg:flex-col border-t border-line">
                            <div className="left flex items-center gap-8">
                                <div className="copyright caption1 text-secondary">©2025 Vetex. All Rights Reserved.</div>
                                <div className="select-block flex items-center gap-5 max-md:hidden">
                                    <div className="choose-language flex items-center gap-1.5">
                                        <select name="language" id="chooseLanguageFooter" className='caption2 bg-transparent'>
                                            <option value="English">English</option>
                                        </select>
                                        <Icon.CaretDownIcon size={12} color='#1F1F1F' />
                                    </div>
                                    <div className="choose-currency flex items-center gap-1.5">
                                        <select name="currency" id="chooseCurrencyFooter" className='caption2 bg-transparent'>
                                            <option value="USD">{currentCurrency?.code}</option>
                                        </select>
                                        <Icon.CaretDownIcon size={12} color='#1F1F1F' />
                                    </div>
                                </div>
                            </div>
                            <div className="right flex items-center gap-2">
                                <div className="caption1 text-secondary">Payment:</div>
                                <div className="payment-img border border-line rounded-sm pr-3 self-center">
                                    <Image
                                        src={'/images/payment/visa_logo.png'}
                                        width={600}
                                        height={600}
                                        alt={'payment'}
                                        className='w-12'
                                    />
                                </div>
                                <div className="payment-img border border-line rounded-sm pr-3 self-center">
                                    <Image
                                        src={'/images/payment/master_card_logo.png'}
                                        width={600}
                                        height={600}
                                        alt={'payment'}
                                        className='w-12 '
                                    />
                                </div>
                                <div className="payment-img border border-line rounded-sm pr-3 self-center">
                                    <Image
                                        src={'/images/payment/google_pay_logo.png'}
                                        width={600}
                                        height={600}
                                        alt={'payment'}
                                        className='w-12'
                                    />
                                </div>
                                <div className="payment-img border border-line rounded-sm pr-3 self-center">
                                    <Image
                                        src={'/images/payment/paypal_logo.png'}
                                        width={600}
                                        height={600}
                                        alt={'payment'}
                                        className='w-12'
                                    />
                                </div>
                                {/* <div className="payment-img">
                                    <Image
                                        src={'/images/payment/'}
                                        width={500}
                                        height={500}
                                        alt={'payment'}
                                        className='w-9'
                                    />
                                </div>
                                <div className="payment-img">
                                    <Image
                                        src={'/images/payment/Frame-5.png'}
                                        width={500}
                                        height={500}
                                        alt={'payment'}
                                        className='w-9'
                                    />
                                </div> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Footer