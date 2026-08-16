import { getProducts } from '@/actions/products-actions';
import SearchResult from '@/components/search-result/searchResult';
import { Suspense } from 'react';
import MenuOne from '../../components/Header/Menu/MenuOne';
import { getProductCategories } from '../../actions/data-actions';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import Footer from '../../components/Footer/Footer';
import TopNavOne from '../../components/Header/TopNav/TopNavOne';

const PRODUCTS_PER_PAGE = 8;

type SearchResultSearchParams = {
  query?: string;
  page?: string;
};

const SearchResultServerComponent = async ({ searchParams }: { searchParams: Promise<SearchResultSearchParams> }) => {
  const params = await searchParams;
  const query = params.query ?? 'dress';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [{ products, totalItems, totalPages }, categories] = await Promise.all([
    getProducts({ search: query, page, perPage: PRODUCTS_PER_PAGE }),
    getProductCategories()
  ])

  return (

    <>
      <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
      <div id="header" className='relative w-full'>
        <MenuOne props="bg-transparent" categories={categories} />
        <Breadcrumb heading='Search Result' subHeading='Search Result' />
      </div>
      <Suspense fallback={<></>}>
        <SearchResult products={products} totalItems={totalItems} totalPages={totalPages} currentPage={page} query={query} />
      </Suspense>
      <Footer />

    </>
  )
};

export default SearchResultServerComponent;
