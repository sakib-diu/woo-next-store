'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css/bundle';
import { useAppData } from '../../context/AppDataContext';
import { PATH } from '../../constant/pathConstants';
import { decodeEntities, slugifyKey } from '../../lib/utils';

interface Props {
    props: string;
}

interface CategoryGroup {
    key: string;
    name: string;
    count: number;
    image: string;
    bestSubCount: number;
}

const Collection: React.FC<Props> = ({ props }) => {
    const { categories } = useAppData()

    // The catalog nests each product type (Shoes, Pants & Tights, ...) as a separate
    // subcategory under every audience (Men/Women/Kids/...), so the same product type
    // exists as several category records. Group them by display name — the same key
    // app/shop/page.tsx resolves the `category` query param against — to get one tile
    // per product type, using the image of its best-stocked subcategory.
    const groups = useMemo(() => {
        const byKey = new Map<string, CategoryGroup>();

        categories
            .filter((cat) => cat.parent !== 0 && cat.count > 0 && cat.image?.src)
            .forEach((cat) => {
                const name = decodeEntities(cat.name);
                // Matches app/shop/page.tsx and lib/categoryUtils.ts, which both key the
                // `category` query param off slugifyKey(cat.name) over the raw, HTML-entity-
                // encoded name (not the decoded display name) — see generateMenuItems' docs.
                const key = slugifyKey(cat.name);
                const existing = byKey.get(key);

                if (!existing) {
                    byKey.set(key, { key, name, count: cat.count, image: cat.image.src, bestSubCount: cat.count });
                } else {
                    existing.count += cat.count;
                    if (cat.count > existing.bestSubCount) {
                        existing.bestSubCount = cat.count;
                        existing.image = cat.image.src;
                    }
                }
            });

        return Array.from(byKey.values()).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [categories]);

    return (
        <>
            <div className={`collection-block ${props}`}>
                <div className="list-collection container section-swiper-navigation sm:px-5 px-4">
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
                        {groups.map((item) => (
                            <SwiperSlide key={item.key}>
                                <Link href={`${PATH.SHOP}?category=${item.key}`} className="collection-item block relative h-full rounded-2xl overflow-hidden cursor-pointer">
                                    <div className="collection-item block relative h-full rounded-2xl overflow-hidden cursor-pointer" >
                                        <div className="bg-img h-full aspect-[3/4]">
                                            <Image
                                                src={item.image}
                                                width={1000}
                                                className='w-full h-full object-cover'
                                                height={600}
                                                alt={item.name + " image"}
                                            />
                                        </div>
                                        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-10 duration-500"></div>
                                        <div className="collection-name heading5 text-center sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[100px] md:py-3 py-1.5 bg-white rounded-xl duration-500">{item.name}</div>
                                    </div>
                                </Link>
                            </SwiperSlide>
                        ))}

                    </Swiper>
                </div>
            </div>
        </>
    )
}

export default Collection