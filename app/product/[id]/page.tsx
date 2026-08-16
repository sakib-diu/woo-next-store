

import { getProductById, getProductReviews, getProductsByIds, getProductVariationsById } from '@/actions/products-actions';
import BreadcrumbProduct from '@/components/Breadcrumb/BreadcrumbProduct';
import Footer from '@/components/Footer/Footer';
import MenuOne from '@/components/Header/Menu/MenuOne';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import Default from '@/components/Product/Detail/Default';
import { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getProductCategories } from '../../../actions/data-actions';
import { STOREINFO } from '../../../constant/storeConstants';

// Deduped per request: generateMetadata and the page body both need the same
// product, and this ensures they only trigger one WooCommerce call between them.
const getProductByIdCached = cache(getProductById);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { id } = await params;
    const { product, status } = await getProductByIdCached({ id });

    if (status === "ERROR" || !product) {
        return {
            title: "Product Not Found",
            description: "The product you are looking for does not exist.",
        };
    }

    return {
        title: product.name + " | " + STOREINFO.name,

        description: product.short_description || "View details about this product.",
        openGraph: {
            title: product.name,
            description: product.short_description || "View details about this product.",
            images: product.images.map((image: { src: string; alt: string; }) => ({
                url: image.src,
                alt: image.alt,
            })),
        },
    };
}


interface ProductDefaultProps {
    params: { id: string };
}

const ProductDefault = async ({ params }: ProductDefaultProps) => {
    const { id: productId } = await params || "1";

    const [{ product, status }, { variations }, { reviews }, categories] = await Promise.all([
        getProductByIdCached({ id: productId }),
        getProductVariationsById({ id: productId }),
        getProductReviews(Number(productId)),
        getProductCategories(),
    ])

    if (status === "ERROR" || !product) {
        notFound()
    }

    const relatedIds = product.related_ids?.map((item) => Number(item)) ?? []
    const { products: relatedProducts } = await getProductsByIds(relatedIds);

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className="relative w-full">
                <MenuOne props="bg-white" categories={categories} />
                <BreadcrumbProduct productName={product.name} productId={productId} />
            </div>
            <Default key={productId} data={product} productId={productId} variations={variations} relatedProducts={relatedProducts} reviews={reviews || []} />
            <Footer />
        </>
    );
};

export default ProductDefault;