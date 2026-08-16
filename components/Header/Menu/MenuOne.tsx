'use client'

import Product from '@/components/Product/Product';
import { PATH } from '@/constant/pathConstants';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useModalSearchContext } from '@/context/ModalSearchContext';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import productData from '@/data/Product.json';
import useLoginPopup from '@/store/useLoginPopup';
import useMenuMobile from '@/store/useMenuMobile';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { generateMenuItems, MenuItem } from '../../../lib/categoryUtils';
import { STOREINFO } from '../../../constant/storeConstants';
import { CategorieType } from '../../../types/data-type';

interface Props {
    props: string;
    categories: CategorieType[];
}

const MenuOne: React.FC<Props> = ({ props, categories }) => {
    const router = useRouter()
    const pathname = usePathname()
    const [selectedType, setSelectedType] = useState<string | null>()
    const { openLoginPopup, handleLoginPopup } = useLoginPopup()
    const { openMenuMobile, handleMenuMobile } = useMenuMobile()
    const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null)
    const [mobilesearch, setMobileSearch] = useState<string>("")
    const { openModalCart } = useModalCartContext()
    const { cart } = useCart()
    const { openModalWishlist } = useModalWishlistContext()
    const { openModalSearch } = useModalSearchContext()
    const { user, isAuthenticated, logout, loading } = useAuth()
    const { categories: categoriesData } = useAppData()
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    useEffect(() => {
        const data = categories || categoriesData;
        if (data) {
            setMenuItems(generateMenuItems(data));
        }
    }, [categories, categoriesData]);

    const handleOpenSubNavMobile = (index: number) => {
        setOpenSubNavMobile(openSubNavMobile === index ? null : index)
    }

    const [fixedHeader, setFixedHeader] = useState(false)
    const [lastScrollPosition, setLastScrollPosition] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            setFixedHeader(scrollPosition > 0 && scrollPosition < lastScrollPosition);
            setLastScrollPosition(scrollPosition);
        };

        // Attach scroll event when component is mounted
        window.addEventListener('scroll', handleScroll);

        // Remove the event listener when the component is unmounted
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [lastScrollPosition]);

    const handleAudienceClick = (audience: string) => {
        router.push(`${PATH.SHOP}?audience=${audience}`);
    };

    const handleCategoryClick = (category: string) => {
        router.push(`${PATH.SHOP}?category=${category}`);
    };

    const handleTypeClick = (type: string) => {
        setSelectedType(type)
        router.push(`${PATH.SHOP}?type=${type}`);
    };

    return (
        <>
            <div className={`header-menu style-one ${fixedHeader ? 'fixed' : 'absolute'} top-0 left-0 right-0 w-full md:h-[74px] h-[56px] ${props}`}>
                <div className="container mx-auto h-full">
                    <div className="header-main flex justify-between h-full">
                        <div className="menu-mobile-icon lg:hidden flex items-center" onClick={handleMenuMobile}>
                            <i className="icon-category text-2xl"></i>
                        </div>
                        <div className="left flex items-center gap-16">
                            <Link href={`${PATH.HOME}`} className='flex items-center max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2'>
                                <div className="heading4">{STOREINFO.name}</div>
                            </Link>
                            <div className="menu-main h-full max-lg:hidden">
                                <ul className='flex items-center gap-8 h-full'>

                                    <li className='h-full'>
                                        <Link
                                            href={PATH.SHOP}
                                            className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname.includes(PATH.SHOP) ? 'active' : ''}`}
                                            prefetch
                                        >
                                            Shop
                                        </Link>

                                    </li>
                                    {/*============= Categories ============*/}
                                    <li className='h-full'>
                                        <Link href="#!" className='text-button-uppercase duration-300 h-full flex items-center justify-center'>
                                            Categories
                                        </Link>
                                        <div className="mega-menu absolute top-[74px] left-0 bg-white w-screen">
                                            <div className="container">
                                                <div className="flex justify-evenly py-8 w-ful">
                                                    <div className="nav-link basis-2/3 grid grid-cols-4 gap-y-8">
                                                        {menuItems && menuItems.map((menuItem) => (
                                                            <>
                                                                {menuItem.subMenu && menuItem.subMenu.length > 0 && (
                                                                    <div key={menuItem.id} className="nav-item justify-evenly" >
                                                                        <div className="text-button-uppercase pb-2">{menuItem.name}</div>
                                                                        <ul key={menuItem.id}>
                                                                            {menuItem.subMenu?.slice(0, 5)?.map((subMenu) => (
                                                                                <li key={subMenu.id}>
                                                                                    <Link
                                                                                        href={`${PATH.SHOP}?audience=${menuItem.slug}&category=${subMenu.categoryKey}`}
                                                                                        className={`link text-secondary duration-300 cursor-pointer`}
                                                                                    >
                                                                                        {subMenu.name}
                                                                                    </Link>
                                                                                </li>
                                                                            ))}
                                                                            <li className='text-secondary cursor-pointer'>
                                                                                <Link
                                                                                    href={`${PATH.SHOP}?audience=${menuItem.slug}`}
                                                                                    className={`link text-secondary duration-300 cursor-pointer view-all-btn`}
                                                                                    prefetch
                                                                                >
                                                                                    View All
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ))}


                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </li>

                                </ul>
                            </div>
                        </div>
                        <div className="right flex gap-12">
                            <div className="max-md:hidden search-icon flex items-center cursor-pointer relative">
                                <Icon.MagnifyingGlassIcon size={24} color='black' onClick={openModalSearch} />
                                <div className="line absolute bg-line w-px h-6 -right-6"></div>
                            </div>
                            <div className="list-action flex items-center gap-4">
                                <div className="user-icon flex items-center justify-center cursor-pointer">
                                    <Icon.UserIcon size={24} color='black' onClick={handleLoginPopup} />
                                    <div
                                        className={`login-popup absolute top-[74px] w-[320px] p-7 rounded-xl bg-white box-shadow-sm 
                                            ${openLoginPopup ? 'open' : ''}`}
                                    >
                                        {!isAuthenticated ? (
                                            <>
                                                <Link href={PATH.LOGIN} className="button-main w-full text-center" prefetch>Login</Link>
                                                <div className="text-secondary text-center mt-3 pb-4">Don’t have an account?
                                                    <Link href={PATH.REGISTER} className='text-black pl-1 hover:underline' prefetch>Register</Link>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-secondary text-center mt-3 pb-4">Hello, <span className='text-black'>{user?.user_display_name}</span></div>
                                                <Link href={PATH.DASHBOARD} className="button-main bg-white text-black border border-black w-full text-center" prefetch>Dashboard</Link>
                                                <div
                                                    className={`button-main w-full text-center mt-3 ${loading ? 'disabled' : ''} disabled:bg-gray-300`}
                                                    onClick={() => {
                                                        logout();
                                                        router.push(PATH.LOGIN);
                                                    }}
                                                    style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                                                >{loading ? "LOGING OUT" : "LOG OUT"}</div>
                                                <div className="bottom mt-4 pt-4 border-t border-line"></div>
                                                <Link href={'#!'} className='body1 hover:underline'>Support</Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className=" wishlist-icon flex items-center cursor-pointer" onClick={openModalWishlist}>
                                    <Icon.HeartIcon size={24} color='black' />
                                </div>
                                <div className="cart-icon flex items-center relative cursor-pointer" onClick={openModalCart}>
                                    <Icon.HandbagIcon size={24} color='black' />
                                    <span className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">{cart.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            <div id="menu-mobile" className={`${openMenuMobile ? 'open' : ''}`}>
                <div className="menu-container bg-white h-full">
                    <div className="container h-full">
                        <div className="menu-main h-full overflow-hidden">
                            <div className="heading py-2 relative flex items-center justify-center">
                                <div
                                    className="close-menu-mobile-btn absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface flex items-center justify-center"
                                    onClick={handleMenuMobile}
                                >
                                    <Icon.X size={14} />
                                </div>
                                <Link href={PATH.HOME} className='logo text-3xl font-semibold text-center'>{STOREINFO.name}</Link>
                            </div>
                            <div className="form-search relative mt-2 flex items-center justify-between">
                                <Icon.MagnifyingGlassIcon size={20} className='absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer' />
                                <input type="text" placeholder='What are you looking for?' onChange={(e) => setMobileSearch(e.target.value)} className=' h-12 rounded-lg rounded-r-none border border-line text-sm w-full pl-10 pr-4' />
                                <div
                                    className='bg-black flex items-center px-3 rounded-r-lg justify-center h-12 text-white cursor-pointer'
                                    onClick={() => router.push(`search-result?query=${mobilesearch}`)}
                                >
                                    <Icon.ArrowRightIcon size={20} className='' weight='bold' />
                                </div>
                            </div>
                            <div className="list-nav mt-6">
                                <ul>
                                    <li>
                                        <Link href={PATH.SHOP} className={`text-xl font-semibold flex items-center justify-between`}>
                                            Shop
                                        </Link>
                                    </li>
                                    <li className={`${openSubNavMobile === 2 ? 'open' : ''}`}>
                                        <div
                                            onClick={() => handleOpenSubNavMobile(2)}
                                            className='text-xl font-semibold flex items-center justify-between mt-5 cursor-pointer'
                                        >
                                            Categories
                                            <span className='text-right'>
                                                <Icon.CaretRightIcon size={20} />
                                            </span>
                                        </div>
                                        <div className="sub-nav-mobile">
                                            <div
                                                className="back-btn flex items-center gap-3"
                                                onClick={() => handleOpenSubNavMobile(2)}
                                            >
                                                <Icon.CaretLeftIcon />
                                                Back
                                            </div>
                                            <div className="list-nav-item w-full pt-3 pb-12">
                                                <div className="nav-link grid grid-cols-2 gap-5 gap-y-6">
                                                    {menuItems && [...menuItems].sort((a, b) => (b.subMenu?.length || 0) - (a.subMenu?.length || 0)).map((menuItem) => (
                                                        <>
                                                            {menuItem.subMenu && menuItem.subMenu.length > 0 && (
                                                                <div key={menuItem.id} className="nav-item">
                                                                    <div className="text-button-uppercase pb-1">{menuItem.name}</div>
                                                                    <ul>
                                                                        {menuItem.subMenu?.map((subMenuItem) => (
                                                                            <li key={subMenuItem.id}>
                                                                                <Link
                                                                                    href={`${PATH.SHOP}?audience=${menuItem.slug}&category=${subMenuItem.categoryKey}`}
                                                                                    className={`link text-secondary duration-300 cursor-pointer`}
                                                                                >
                                                                                    {subMenuItem.name}
                                                                                </Link>
                                                                            </li>
                                                                        ))}
                                                                        <li>
                                                                            <Link
                                                                                href={`${PATH.SHOP}?audience=${menuItem.slug}`}
                                                                                className={`link text-secondary duration-300 view-all-btn`}
                                                                            >
                                                                                View All
                                                                            </Link>
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </>

                                                    ))}
                                                </div>

                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="menu_bar fixed bg-white bottom-0 left-0 w-full h-[70px] sm:hidden z-[60]">
                <div className="menu_bar-inner grid grid-cols-4 items-center h-full">
                    <Link href={PATH.HOME} className='menu_bar-link flex flex-col items-center gap-1'>
                        <Icon.HouseIcon weight='bold' className='text-2xl' />
                        <span className="menu_bar-title caption2 font-semibold">Home</span>
                    </Link>
                    <div onClick={() => { if (!openMenuMobile) { handleMenuMobile() }; setOpenSubNavMobile(2) }} className='menu_bar-link flex flex-col items-center gap-1'>
                        <Icon.ListIcon weight='bold' className='text-2xl' />
                        <span className="menu_bar-title caption2 font-semibold">Category</span>
                    </div>
                    <div onClick={() => { setOpenSubNavMobile(null); handleMenuMobile(); }} className='menu_bar-link flex flex-col items-center gap-1'>
                        <Icon.MagnifyingGlassIcon weight='bold' className='text-2xl' />
                        <span className="menu_bar-title caption2 font-semibold">Search</span>
                    </div>
                    <Link href={PATH.CART} className='menu_bar-link flex flex-col items-center gap-1'>
                        <div className="icon relative">
                            <Icon.HandbagIcon weight='bold' className='text-2xl' />
                            <span className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">{cart.items.length}</span>
                        </div>
                        <span className="menu_bar-title caption2 font-semibold">Cart</span>
                    </Link>
                </div>
            </div>
        </>
    )
}

export default MenuOne