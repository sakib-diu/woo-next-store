'use client'

import { PATH } from '@/constant/pathConstants';
import Image from 'next/image';
import Link from 'next/link';
import React, { Component } from 'react';
import 'swiper/css/bundle';
import 'swiper/css/effect-fade';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

const SliderTwo = () => {
    return (
        <>
            <div className={`slider-block style-two bg-linear h-[calc(100dvh-30px)] md:h-[calc(100dvh-44px)] w-full`}>
                <div className="slider-main h-full w-full">
                    <Swiper
                        spaceBetween={0}
                        slidesPerView={1}
                        loop={true}
                        pagination={{ clickable: true }}
                        modules={[Pagination, Autoplay]}
                        className='h-full relative'
                        autoplay={{
                            delay: 4000,
                        }}
                    >
                        <SwiperSlide>
                            <div className="slider-item h-full w-full relative">
                                <div className="container w-full h-full flex items-center relative">
                                    <div className="text-content basis-1/2 flex flex-col items-center">
                                        <div className="text-sub-display text-center">Sale! Up To 50% Off!</div>
                                        <div className="text-display text-center md:mt-4 mt-2">New season,  wardrobe!</div>
                                        <div className="body1 text-center md:mt-4 mt-2">Check out our latest collection of chic and trendy outfits that will keep you looking stylish all year round.</div>
                                        <Link href={PATH.SHOP} className="button-main md:mt-8 mt-3">Shop Now</Link>
                                    </div>
                                    <div className="sub-img absolute sm:w-1/2 w-[54%] h-full 2xl:-right-[60px] right-0 bottom-0">
                                        <Image
                                            src={'/images/slider/bg1-1.webp'}
                                            fill
                                            alt='bg2-1'
                                            priority={true}
                                            className="object-contain object-bottom"
                                        />
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="slider-item h-full w-full relative">
                                <div className="container w-full h-full flex items-center relative">
                                    <div className="text-content basis-1/2 flex flex-col items-center">
                                        <div className="text-sub-display text-center">Sale! Up To 50% Off!</div>
                                        <div className="text-display text-center md:mt-4 mt-2">New Arrivals Daily</div>
                                        <div className="body1 text-center md:mt-4 mt-2">Get ready for the season with our latest collection of women{String.raw`'s`} clothing</div>
                                        <Link href={PATH.SHOP} className="button-main md:mt-8 mt-3">Shop Now</Link>
                                    </div>
                                    <div className="sub-img absolute sm:w-1/2 w-3/5 h-full 2xl:-right-[60px] -right-4 bottom-0">
                                        <Image
                                            src={'/images/slider/bg1-2.webp'}
                                            fill
                                            alt='bg2-2'
                                            priority={true}
                                            className="object-contain object-bottom"
                                        />
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="slider-item h-full w-full">
                                <div className="container w-full h-full flex items-center relative">
                                    <div className="text-content basis-1/2 flex flex-col items-center pr-4">
                                        <div className="text-sub-display text-center">Sale! Up To 50% Off!</div>
                                        <div className="text-display text-center md:mt-4 mt-2">Summer Sale</div>
                                        <div className="body1 text-center md:mt-4 mt-2">Check out our curated selection of must-have outfits for any occasion</div>
                                        <Link href={PATH.SHOP} className="button-main md:mt-8 mt-3">Shop Now</Link>
                                    </div>
                                    <div className="sub-img basis-1/2 h-full relative">
                                        <Image
                                            src={'/images/slider/bg1-3.webp'}
                                            fill
                                            alt='bg2-3'
                                            priority={true}
                                            className="object-contain object-bottom"
                                        />
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    </Swiper>
                </div>
            </div>
        </>
    )
}

export default SliderTwo