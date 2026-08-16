import { getProductCategories, getProductTags } from '@/actions/data-actions'
import { getProducts } from '@/actions/products-actions'
import Footer from '@/components/Footer/Footer'
import Banner from '@/components/Home/Banner'
import Benefit from '@/components/Home/Benefit'
import Brand from '@/components/Home/Brand'
import Collection from '@/components/Home/Collection'
import Instagram from '@/components/Home/Instagram'
import TabFeatures from '@/components/Home/TabFeatures'
import WhatNewOne from '@/components/Home/WhatNewOne'
// import ModalNewsletter from '@/components/Modal/ModalNewsletter'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import SliderTwo from '@/components/Slider/SliderTwo'
import { Metadata } from 'next'
import React from 'react'
import MenuOne from '../components/Header/Menu/MenuOne'
import { STOREINFO } from '../constant/storeConstants'


export const metadata: Metadata = {
  title: `Home | ${STOREINFO.name} Store`,
  description: `Discover the latest products and collections at ${STOREINFO.name} Store. Shop now for exclusive deals and free shipping on orders over $50.`,
  keywords: 'online store, shopping, products, collections, deals, free shipping',
  openGraph: {
    title: `Home | ${STOREINFO.name} Store`,
    description: `Discover the latest products and collections at ${STOREINFO.name} Store. Shop now for exclusive deals and free shipping on orders over $50.`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Home | ${STOREINFO.name} Store`,
    description: `Discover the latest products and collections at ${STOREINFO.name} Store. Shop now for exclusive deals and free shipping on orders over $50.`,
  },
}




export default async function HomeTwo() {

  // These sections show a handful of products (8) picked client-side from a few tabs
  // (on sale / new arrivals / best sellers / category), so a bounded recent pool is
  // fetched once here rather than the entire catalog.
  const [
    productsResult,
    categoriesResult
  ] = await Promise.allSettled([
    getProducts({ perPage: 100, orderby: 'date', order: 'desc' }),
    getProductCategories()
  ]);

  const products = productsResult.status === 'fulfilled' ? productsResult.value.products : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];



  return (
    <>
      <TopNavOne props="style-one bg-black" slogan='Limited Offer: Free shipping on orders over $50' />
      <div id="header" className='relative w-full'>
        <MenuOne props={'bg-transparent'} categories={categories} />
        <SliderTwo />
      </div>
      <Collection props="pt-5" />
      <WhatNewOne data={products} start={0} limit={8} />
      <Banner />
      <TabFeatures data={products} start={0} limit={8} />
      <Benefit props="md:mt-20 mt-10 py-10 px-2.5 bg-surface rounded-3xl" />
      {/* <Instagram /> */}
      <Brand />
      <Footer />
      {/* Black Friday Pop Up Modal */}
      {/* <ModalNewsletter /> */}
    </>
  )
}

