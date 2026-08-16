import * as Icon from "@phosphor-icons/react/dist/ssr";

export default function ShopLoading() {
    return (
        <>
            {/* TopNavOne Loading */}
            <div className="top-nav md:h-[44px] h-[30px] style-one bg-black">
                <div className="container mx-auto h-full">
                    <div className="top-nav-main flex justify-between max-md:justify-center h-full">
                        <div className="left-content flex items-center gap-5 max-md:hidden">
                            {/* Language/Currency placeholders */}
                        </div>
                        <div className="text-center text-button-uppercase text-white flex items-center">
                            <div className="h-4 bg-white/20 rounded w-64 animate-pulse"></div>
                        </div>
                        <div className="right-content flex items-center gap-5 max-md:hidden">
                            {[...Array(5)].map((_, index) => (
                                <div key={index} className="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div id="header" className="relative w-full">
                {/* Header Loading Skeleton */}
                <div className="header-menu style-one absolute top-0 left-0 right-0 w-full md:h-[74px] h-[56px] bg-transparent">
                    <div className="container mx-auto h-full">
                        <div className="header-main flex items-center justify-between h-full">
                            <div className="menu-mobile-icon lg:hidden flex items-center">
                                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="left flex items-center gap-16">
                                <div className='flex items-center max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2'>
                                    <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="menu-main h-full max-lg:hidden">
                                    <ul className='flex items-center gap-8 h-full'>
                                        <li className='h-full'>
                                            <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                                        </li>
                                        <li className='h-full'>
                                            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="right flex gap-12">
                                <div className="max-md:hidden search-icon flex items-center cursor-pointer relative">
                                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="line absolute bg-line w-px h-6 -right-6"></div>
                                </div>
                                <div className="list-action flex items-center gap-4">
                                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breadcrumb Loading Skeleton */}
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="w-48 h-12 bg-white/20 rounded animate-pulse mx-auto"></div>
                                <div className="flex items-center justify-center gap-1 mt-3">
                                    <div className="w-12 h-4 bg-white/20 rounded animate-pulse"></div>
                                    <Icon.CaretRightIcon size={14} className='text-secondary2' />
                                    <div className="w-12 h-4 bg-white/20 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop Content Loading Skeleton */}
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="flex max-md:flex-wrap gap-y-8">
                        {/* Sidebar Loading */}
                        <div className="sidebar lg:w-1/4 md:w-1/3 w-full md:pr-12 max-md:hidden">
                            {/* Filter Type */}
                            <div className="filter-type pb-8 border-b border-line">
                                <div className="w-24 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Categories Loading */}
                            <div className="filter-type pb-8 border-b border-line mt-8">
                                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                                            <div className={`h-4 bg-gray-200 rounded animate-pulse ${i % 2 === 0 ? 'w-20' : 'w-24'}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Size Filter */}
                            <div className="filter-size pb-8 border-b border-line mt-8">
                                <div className="w-12 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="flex flex-wrap gap-2">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                                    ))}
                                </div>
                            </div>

                            {/* Price Filter */}
                            <div className="filter-price pb-8 border-b border-line mt-8">
                                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="w-full h-2 bg-gray-200 rounded-full animate-pulse mt-5"></div>
                                <div className="flex justify-between mt-2">
                                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>

                            {/* Color Filter */}
                            <div className="filter-color pb-8 border-b border-line mt-8">
                                <div className="w-14 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="flex flex-wrap gap-3">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                                    ))}
                                </div>
                            </div>

                            {/* Brand Filter */}
                            <div className="filter-brand mt-8">
                                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                                            <div className={`h-4 bg-gray-200 rounded animate-pulse ${i % 2 === 0 ? 'w-16' : 'w-20'}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Product Grid Loading */}
                        <div className="list-product-block lg:w-3/4 md:w-2/3 w-full md:pl-3">
                            {/* Filter Heading */}
                            <div className="filter-heading flex items-center justify-between gap-5 flex-wrap mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>

                            {/* Active Filters */}
                            <div className="list-filtered flex items-center gap-3 mt-4">
                                <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="w-24 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>

                            {/* Product Grid */}
                            <div className="list-product grid lg:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7">
                                {[...Array(9)].map((_, index) => (
                                    <div key={index} className="product-item animate-pulse">
                                        {/* Product Image */}
                                        <div className="product-main bg-gray-200 rounded-lg aspect-[3/4] relative overflow-hidden">
                                            <div className="w-full h-full bg-gray-300 animate-pulse"></div>
                                            {/* Quick Actions */}
                                            <div className="absolute top-3 right-3 space-y-2">
                                                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                                                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="product-infor mt-4">
                                            <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                                            <div className="w-3/4 h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
                                                <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center gap-1 mt-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-center mt-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Loading */}
            <div id="footer" className="footer">
                <div className="footer-main bg-surface">
                    <div className="container">
                        <div className="content-footer py-[60px] flex justify-between flex-wrap gap-y-8">
                            {/* Company Info */}
                            <div className="company-infor basis-1/4 max-lg:basis-full pr-7">
                                <div className="h-8 bg-gray-300 rounded w-32 animate-pulse"></div>
                                <div className="mt-3 space-y-3">
                                    <div className="flex gap-3">
                                        <div className="space-y-3">
                                            <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                                            <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                                            <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                                            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Content */}
                            <div className="right-content flex flex-wrap gap-y-8 basis-3/4 max-lg:basis-full">
                                {/* Navigation Links */}
                                <div className="list-nav flex justify-between basis-2/3 max-md:basis-full gap-4">
                                    {[...Array(3)].map((_, index) => (
                                        <div key={index} className="item flex flex-col basis-1/3">
                                            <div className="h-4 bg-gray-300 rounded w-20 animate-pulse mb-3"></div>
                                            <div className="space-y-2">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Newsletter */}
                                <div className="newsletter basis-1/3 pl-7 max-md:basis-full max-md:pl-0">
                                    <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse mt-3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mt-1"></div>
                                    <div className="h-[52px] bg-gray-200 rounded-xl animate-pulse mt-4"></div>
                                    <div className="flex items-center gap-6 mt-4">
                                        {[...Array(5)].map((_, index) => (
                                            <div key={index} className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Bottom */}
                        <div className="footer-bottom py-3 flex items-center justify-between gap-5 max-lg:justify-center max-lg:flex-col border-t border-line">
                            <div className="left flex items-center gap-8">
                                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                <div className="flex items-center gap-5 max-md:hidden">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="right flex items-center gap-2">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                {[...Array(4)].map((_, index) => (
                                    <div key={index} className="w-12 h-8 bg-gray-200 rounded-sm animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
