// app/layout.tsx

import { getProductCategories, getCountries, getAttributesWithTerms, getProductTags, getCurrentCurrency, getStoreSettings, getBrands } from '@/actions/data-actions';
import { AppDataProvider } from '@/context/AppDataContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CompareProvider } from '@/context/CompareContext';
import { ModalCartProvider } from '@/context/ModalCartContext';
import { ModalCompareProvider } from '@/context/ModalCompareContext';
import { ModalQuickviewProvider } from '@/context/ModalQuickviewContext';
import { ModalSearchProvider } from '@/context/ModalSearchContext';
import { ModalWishlistProvider } from '@/context/ModalWishlistContext';
import { WishlistProvider } from '@/context/WishlistContext';
import ModalCart from '@/components/Modal/ModalCart';
import ModalCompare from '@/components/Modal/ModalCompare';
import ModalQuickview from '@/components/Modal/ModalQuickview';
import ModalSearch from '@/components/Modal/ModalSearch';
import ModalWishlist from '@/components/Modal/ModalWishlist';
import '@/styles/styles.scss';
import NextTopLoader from 'nextjs-toploader';
import { Instrument_Sans } from 'next/font/google';
import { Metadata } from 'next';
import { STOREINFO } from '../constant/storeConstants';

const instrument = Instrument_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${STOREINFO.name} - Cutting edge Store`,
  description: 'Your online store built with Next.js and WooCommerce',
};

// Make the layout component async to fetch data
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [
    countriesResult,
    categoriesResult,
    attributesResult,
    tagsResult,
    brandsResult,
    currentCurrencyResult,
    storeConfigResult
  ] = await Promise.allSettled([
    getCountries(),
    getProductCategories(),
    getAttributesWithTerms(),
    getProductTags(),
    getBrands(),
    getCurrentCurrency(),
    getStoreSettings()
  ]);

  const countries = countriesResult.status === 'fulfilled' ? countriesResult.value : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const attributes = attributesResult.status === 'fulfilled' ? attributesResult.value : [];
  const tags = tagsResult.status === 'fulfilled' ? tagsResult.value : [];
  const brands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
  const currentCurrency = currentCurrencyResult.status === 'fulfilled' ? currentCurrencyResult.value : null;
  const storeConfig = storeConfigResult.status === 'fulfilled' ? storeConfigResult.value : null;


  return (
    <html lang="en">
      <body className={instrument.className}>
        <NextTopLoader color="#9ad346" showSpinner={false} height={3} />
        <AuthProvider>
          <CartProvider>
            <AppDataProvider
              countries={countries}
              categories={categories}
              attributes={attributes}
              tags={tags}
              brands={brands}
              currentCurrency={currentCurrency}
              storeConfig={storeConfig}
            >
              <ModalCartProvider>
                <WishlistProvider>
                  <ModalWishlistProvider>
                    <CompareProvider>
                      <ModalCompareProvider>
                        <ModalSearchProvider>
                          <ModalQuickviewProvider>
                            {children}
                            <ModalQuickview />
                            <ModalSearch />
                            <ModalCompare />
                            <ModalWishlist />
                            <ModalCart key={'cart'} />
                          </ModalQuickviewProvider>
                        </ModalSearchProvider>
                      </ModalCompareProvider>
                    </CompareProvider>
                  </ModalWishlistProvider>
                </WishlistProvider>
              </ModalCartProvider>
            </AppDataProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}