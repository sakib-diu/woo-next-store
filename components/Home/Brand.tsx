'use client'

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import 'swiper/css/bundle';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

const Brand = () => {
    return (
        <>
            <div className="brand-block md:py-[60px] py-[32px]">
                <div className="container">
                    <div className="list-brand">
                        <Swiper
                            spaceBetween={12}
                            slidesPerView={2}
                            loop={true}
                            modules={[Autoplay]}
                            autoplay={{
                                delay: 4000,
                            }}
                            breakpoints={{
                                500: {
                                    slidesPerView: 3,
                                    spaceBetween: 16,
                                },
                                680: {
                                    slidesPerView: 4,
                                    spaceBetween: 16,
                                },
                                992: {
                                    slidesPerView: 5,
                                    spaceBetween: 16,
                                },
                                1200: {
                                    slidesPerView: 6,
                                    spaceBetween: 16,
                                },
                            }}
                        >
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_1.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_2.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_3.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_4.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_5.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                            <SwiperSlide>
                                <div className="brand-item relative flex items-center justify-center h-[36px]">
                                    <Image
                                        src={'/images/brand/affiliated_6.webp'}
                                        width={300}
                                        height={300}
                                        alt='1'
                                        className='h-full w-auto duration-500 relative object-cover'
                                    />
                                </div>
                            </SwiperSlide>
                        </Swiper>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Brand