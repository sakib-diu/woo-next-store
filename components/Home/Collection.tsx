'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css/bundle';
import { useRouter } from 'next/navigation';
import { CategorieType } from '../../types/data-type';

interface Props {
    props: string;
    categories: CategorieType[]
}

const Collection: React.FC<Props> = ({ props, categories }) => {
    const router = useRouter()

    const handleTypeClick = (type: string) => {
        router.push(`/shop?category=${type}`);
    };

    return (
        <>
            <div className={`collection-block ${props}`}>
                <div className="list-collection section-swiper-navigation sm:px-5 px-4">
                    <Swiper
                        spaceBetween={12}
                        slidesPerView={2}
                        navigation
                        loop={true}
                        modules={[Navigation, Autoplay]}
                        breakpoints={{
                            576: {
                                slidesPerView: 2,
                                spaceBetween: 12,
                            },
                            768: {
                                slidesPerView: 3,
                                spaceBetween: 20,
                            },
                            1200: {
                                slidesPerView: 4,
                                spaceBetween: 20,
                            },
                        }}
                        className='h-full'
                    >
                        {categories.filter(cat => cat.slug.includes("common")).sort((a, b) => b.count - a.count)?.slice(0, 5).map((item) => (
                            <SwiperSlide key={item.id}>
                                <Link href={`/shop?category=${item.slug.trim()}`} className="collection-item block relative h-full rounded-2xl overflow-hidden cursor-pointer">
                                    <div className="collection-item block relative h-full rounded-2xl overflow-hidden cursor-pointer" >
                                        <div className="bg-img h-full">
                                            <Image
                                                src={item.image.src || '/images/collection/swimwear.png'}
                                                width={1000}
                                                className='w-full h-full object-cover'
                                                height={600}
                                                alt={item.name + " image"}
                                            />
                                        </div>
                                        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-10 duration-500"></div>
                                        <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</div>
                                    </div>
                                </Link>
                            </SwiperSlide>
                        ))}
                        {/* <SwiperSlide>
                            <div className="collection-item block relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => handleTypeClick('top')}>
                                <div className="bg-img">
                                    <Image
                                        src={'/images/collection/top.png'}
                                        width={1000}
                                        height={600}
                                        alt='clothes'
                                    />
                                </div>
                                <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">top</div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="collection-item block relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => handleTypeClick('sets')}>
                                <div className="bg-img">
                                    <Image
                                        src={'/images/collection/sets.png'}
                                        width={1000}
                                        height={600}
                                        alt='sets'
                                    />
                                </div>
                                <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">sets</div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="collection-item block relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => handleTypeClick('outerwear')}>
                                <div className="bg-img">
                                    <Image
                                        src={'/images/collection/outerwear.png'}
                                        width={1000}
                                        height={600}
                                        alt='accessories'
                                    />
                                </div>
                                <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">outerwear</div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="collection-item block relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => handleTypeClick('underwear')}>
                                <div className="bg-img">
                                    <Image
                                        src={'/images/collection/underwear.png'}
                                        width={1000}
                                        height={600}
                                        alt='lingerie'
                                    />
                                </div>
                                <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">underwear</div>
                            </div>
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="collection-item block relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => handleTypeClick('t-shirt')}>
                                <div className="bg-img">
                                    <Image
                                        src={'/images/collection/t-shirt.png'}
                                        width={1000}
                                        height={600}
                                        alt='outerwear'
                                    />
                                </div>
                                <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">t-shirt</div>
                            </div>
                        </SwiperSlide> */}
                    </Swiper>
                </div>
            </div>
        </>
    )
}

export default Collection