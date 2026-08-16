'use client'

import { STOREINFO } from '@/constant/storeConstants'
import testimonialData from '@/data/Testimonial.json'
import { TestimonialType } from '@/types/TestimonialType'
import React from 'react'
import 'swiper/css/bundle'
import { Autoplay, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import TestimonialItem from '../Testimonial/TestimonialItem'

const Testimonial = () => {
    return (
        <div className="testimonial-block style-one md:pt-20 pt-10">
            <div className="container">
                <div className="heading flex flex-col items-center text-center">
                    <div className="heading3">What Our Customers Say</div>
                    <div className="text-secondary text-center mt-3">Real reviews from real {STOREINFO.name} shoppers</div>
                </div>
                <div className="list-testimonial customer-feedbacks pagination-mt40 md:mt-10 mt-6">
                    <Swiper
                        spaceBetween={20}
                        slidesPerView={1}
                        loop={true}
                        pagination={{ clickable: true }}
                        modules={[Pagination, Autoplay]}
                        autoplay={{
                            delay: 4000,
                        }}
                        breakpoints={{
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 20,
                            },
                            1024: {
                                slidesPerView: 3,
                                spaceBetween: 30,
                            },
                        }}
                        className='h-full'
                    >
                        {(testimonialData as TestimonialType[]).map((item) => (
                            <SwiperSlide key={item.id} className='h-auto'>
                                <TestimonialItem data={item} type='style-one' />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </div>
    )
}

export default Testimonial
