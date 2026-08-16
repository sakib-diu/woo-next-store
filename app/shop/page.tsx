import { getProducts, ProductSortOption } from '@/actions/products-actions';
import Footer from '@/components/Footer/Footer';
import MenuOne from '@/components/Header/Menu/MenuOne';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import ShopBreadCrumb1 from '@/components/Shop/ShopBreadCrumb';
import { Suspense } from 'react';
import { Metadata } from 'next';
import { getAttributesWithTerms, getBrands, getProductCategories, getProductTags } from '../../actions/data-actions';
import { STOREINFO } from '../../constant/storeConstants';
import { CategorieType, TagType } from '@/types/data-type';
import { slugifyKey } from '@/lib/utils';

const PRODUCTS_PER_PAGE = 9;

type ShopSearchParams = {
    type?: string;
    gender?: string;
    category?: string;
    page?: string;
    sort?: string;
    size?: string;
    color?: string;
    brand?: string;
    min_price?: string;
    max_price?: string;
    sale?: string;
};

type BreadCrumb1Props = {
    searchParams: Promise<ShopSearchParams>;
};

// WooCommerce's `sold_individually`-free sort options map onto its REST `orderby`/`order`
// params directly. "Best Discount" has no native equivalent (WC doesn't sort by sale
// percentage), so it's approximated by filtering on_sale=true and re-sorting client-side
// within just the returned page — see ShopBreadCrumb1.
const SORT_MAP: Record<string, { orderby: ProductSortOption; order: 'asc' | 'desc' }> = {
    soldQuantityHighToLow: { orderby: 'popularity', order: 'desc' },
    priceHighToLow: { orderby: 'price', order: 'desc' },
    priceLowToHigh: { orderby: 'price', order: 'asc' },
};

const findIdBySlug = (items: { id: number; slug: string }[], slug: string | null | undefined) =>
    slug ? items.find(item => item.slug.toLowerCase() === slug.toLowerCase())?.id : undefined;

export default async function BreadCrumb1({ searchParams }: BreadCrumb1Props) {
    const params = await searchParams;
    const { type, gender, category, sort, size, color, brand, min_price, max_price, sale } = params;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

    const [categories, tags, brands, attributesWithTerms] = await Promise.all([
        getProductCategories(),
        getProductTags(),
        getBrands(),
        getAttributesWithTerms(),
    ]);

    // `gender` selects a top-level (parent === 0) category — the catalog's audience split
    // (Men/Women/Kids/Unisex/Baby & Toddler). `category` selects a "product type" facet
    // (e.g. "Shoes"), which in this catalog exists as a *separate* subcategory per audience
    // (shoes, shoes-men, shoes-women, ...) — so it's matched by grouping subcategories with
    // the same display name (see slugifyKey) and resolving to every category ID in that group.
    // WooCommerce's `category` param treats a comma-separated list as OR, not AND, so combining
    // an audience with a product-type group is a broader match than the two applied strictly
    // together — acceptable since there's no way to express AND in a single REST call.
    const genderId = findIdBySlug(categories as CategorieType[], gender);
    const typeCategoryIds = category
        ? (categories as CategorieType[])
            .filter(cat => cat.parent !== 0 && slugifyKey(cat.name) === category.toLowerCase())
            .map(cat => cat.id)
        : [];
    const categoryIds = [
        ...(genderId !== undefined ? [genderId] : []),
        ...typeCategoryIds,
    ];

    const tagId = findIdBySlug(tags as TagType[], type);

    // `brand` holds a comma-separated list of brand names so multiple brands can be selected at once.
    const brandIds = (brand ?? '')
        .split(',')
        .map(b => b.trim().toLowerCase())
        .filter(Boolean)
        .map(name => brands.find(b => b.name.toLowerCase() === name)?.id)
        .filter((id): id is number => id !== undefined);

    // WooCommerce's REST API only supports filtering by one attribute taxonomy per request.
    // Size takes the server-side slot when both size and color are selected; color is then
    // applied as an additional client-side narrowing over that page's results only (see below).
    const sizeAttr = attributesWithTerms.find(a => a.attribute.name.toLowerCase() === 'size');
    const colorAttr = attributesWithTerms.find(a => a.attribute.name.toLowerCase() === 'color');
    const sizeTerm = size ? sizeAttr?.terms.find(t => t.name.toLowerCase() === size.toLowerCase()) : undefined;
    const colorTerm = color ? colorAttr?.terms.find(t => t.name.toLowerCase() === color.toLowerCase()) : undefined;

    // WooCommerce's `products/attributes` endpoint already returns the taxonomy slug
    // pre-prefixed (e.g. "pa_color"), so it's used as-is rather than prefixed again.
    const serverAttribute = sizeTerm
        ? { slug: sizeAttr!.attribute.slug, termId: sizeTerm.id }
        : colorTerm
            ? { slug: colorAttr!.attribute.slug, termId: colorTerm.id }
            : undefined;
    const needsClientColorNarrowing = Boolean(sizeTerm && colorTerm);

    const sortKey = sort ?? '';
    const sortConfig = SORT_MAP[sortKey];
    const onSale = sale === '1' || sortKey === 'discountHighToLow' || undefined;

    const minPrice = min_price ? Number(min_price) : undefined;
    const maxPrice = max_price ? Number(max_price) : undefined;

    const { products, totalItems, totalPages, status } = await getProducts({
        page,
        perPage: PRODUCTS_PER_PAGE,
        categoryIds: categoryIds.length ? categoryIds : undefined,
        tagIds: tagId !== undefined ? [tagId] : undefined,
        brandIds: brandIds.length ? brandIds : undefined,
        attributeSlug: serverAttribute?.slug,
        attributeTermId: serverAttribute?.termId,
        minPrice,
        maxPrice,
        onSale,
        orderby: sortConfig?.orderby,
        order: sortConfig?.order,
    });

    if (status !== 'OK') {
        return (
            <div>Error fetching products</div>
        );
    }

    const filteredProducts = needsClientColorNarrowing
        ? products.filter(p => p.attributes.some(attr =>
            attr.name.toLowerCase() === 'color' && attr.options.some(opt => opt.toLowerCase() === color!.toLowerCase())
        ))
        : products;

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className="relative w-full">
                <MenuOne props="bg-transparent" categories={categories} />
            </div>
            <Suspense fallback={<div>Loading breadcrumb...</div>}>
                <ShopBreadCrumb1
                    products={filteredProducts}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    currentPage={page}
                />
            </Suspense>
            <Footer />
        </>
    );
}

export const metadata: Metadata = {
    title: `Shop - ${STOREINFO.name}`,
    description: `Discover our latest collection of products at ${STOREINFO.name}. Browse through our wide selection of quality items with great prices.`,
    keywords: ['shop', 'products', `${STOREINFO.name}`, 'online store', 'fashion', 'clothing'],
    openGraph: {
        title: `Shop - ${STOREINFO.name}`,
        description: `Discover our latest collection of products at ${STOREINFO.name}. Browse through our wide selection of quality items with great prices.`,
        type: 'website',
        url: '/shop',
        siteName: `${STOREINFO.name}`,
    },
    twitter: {
        card: 'summary_large_image',
        title: `Shop - ${STOREINFO.name}`,
        description: `Discover our latest collection of products at ${STOREINFO.name}. Browse through our wide selection of quality items with great prices.`,
    },
};
