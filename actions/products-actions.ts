"use server"

import { Product, ProductReview, VariationProduct } from "@/types/product-type";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { revalidateTag, unstable_cache } from "next/cache";

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WORDPRESS_SITE_URL as string,
  consumerKey: process.env.WC_CONSUMER_KEY! as string,
  consumerSecret: process.env.WC_CONSUMER_SECRET! as string,
  version: "wc/v3",
});

const PRODUCTS_TAG = "products";
const PRODUCTS_REVALIDATE_SECONDS = 60;
const VARIATIONS_REVALIDATE_SECONDS = 60;
const REVIEWS_REVALIDATE_SECONDS = 30;

export const getProductById = async ({ id }: { id: string }): Promise<{ product: Product | null, status: "OK" | "ERROR" }> => {
  try {
    const getCached = unstable_cache(
      async () => {
        const response = await WooCommerce.get(`products/${id}`);
        return response.data as Product;
      },
      ["product-by-id", id],
      { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG, `product-${id}`] }
    );
    const product = await getCached();
    return {
      product,
      status: "OK"
    }
  } catch (error) {
    console.log(`Error fetching product by id ${id}:`, error)
    return {
      product: null,
      status: "ERROR"
    }
  }
}

export const getProductVariationsById = async ({ id }: { id: string }): Promise<{ variations?: VariationProduct[], status: "OK" | "ERROR" }> => {
  try {
    const getCached = unstable_cache(
      async () => {
        const response = await WooCommerce.get(`products/${id}/variations`, {
          per_page: 100,
        });
        return response.data as VariationProduct[];
      },
      ["product-variations-by-id", id],
      { revalidate: VARIATIONS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG, `product-${id}`, `product-${id}-variations`] }
    );
    const variations = await getCached();
    return {
      variations,
      status: "OK"
    }
  } catch (error) {
    console.log(`Error fetching product variations for id ${id}:`, error)
    return {
      variations: [],
      status: "ERROR"
    }
  }
}

export type ProductSortOption = 'date' | 'price' | 'popularity' | 'rating' | 'title';

export type ProductQueryParams = {
  page?: number;
  perPage?: number;
  categoryIds?: number[];
  tagIds?: number[];
  brandIds?: number[];
  /** Global product attribute taxonomy slug, e.g. "pa_size". WooCommerce's REST API only supports
   * filtering by a single attribute taxonomy per request, so when both size and color are selected
   * only one can be pushed down to the API; the other is left to the caller to reconcile. */
  attributeSlug?: string;
  attributeTermId?: number;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  search?: string;
  orderby?: ProductSortOption;
  order?: 'asc' | 'desc';
  include?: number[];
};

/**
 * Fetches a single page of products from WooCommerce with server-side filtering,
 * using the site's native `page`/`per_page` REST pagination instead of pulling
 * the entire catalog into memory.
 */
export const getProducts = async (query: ProductQueryParams = {}): Promise<{
  products: Product[];
  totalItems: number;
  totalPages: number;
  status: 'OK' | 'ERROR';
}> => {
  const {
    page = 1,
    perPage = 9,
    categoryIds,
    tagIds,
    brandIds,
    attributeSlug,
    attributeTermId,
    minPrice,
    maxPrice,
    onSale,
    search,
    orderby,
    order,
    include,
  } = query;

  try {
    const getCached = unstable_cache(
      async () => {
        const response = await WooCommerce.get("products", {
          per_page: perPage,
          page,
          ...(categoryIds?.length && { category: categoryIds.join(',') }),
          ...(tagIds?.length && { tag: tagIds.join(',') }),
          ...(brandIds?.length && { brand: brandIds.join(',') }),
          ...(attributeSlug && attributeTermId && { attribute: attributeSlug, attribute_term: attributeTermId }),
          ...(minPrice !== undefined && { min_price: minPrice }),
          ...(maxPrice !== undefined && { max_price: maxPrice }),
          ...(onSale !== undefined && { on_sale: onSale }),
          ...(search && { search }),
          ...(orderby && { orderby }),
          ...(order && { order }),
          ...(include?.length && { include: include.join(',') }),
        });

        const totalItems = parseInt(response.headers?.['x-wp-total'] ?? '0', 10) || 0;
        const totalPages = parseInt(response.headers?.['x-wp-totalpages'] ?? '0', 10) || 0;

        return {
          products: (response.data ?? []) as Product[],
          totalItems,
          totalPages,
        };
      },
      ["products-query", JSON.stringify(query)],
      { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG] }
    );

    const result = await getCached();
    return { ...result, status: 'OK' };
  } catch (error) {
    console.error(`Error fetching products:`, error);
    return { products: [], totalItems: 0, totalPages: 0, status: 'ERROR' };
  }
};

/**
 * Fetches a bounded set of products by ID (e.g. related/upsell products). Unlike `getProducts`,
 * this is not meant for catalog browsing — callers should pass a small, already-known ID list.
 */
export const getProductsByIds = async (ids: number[]): Promise<{
  products: Product[];
  status: 'OK' | 'ERROR';
}> => {
  if (ids.length === 0) {
    return { products: [], status: 'OK' };
  }

  const result = await getProducts({ include: ids, perPage: Math.min(ids.length, 100) });
  return { products: result.products, status: result.status };
};

export async function getProductReviews(productId: number) {
  try {
    if (!productId || isNaN(productId)) {
      throw new Error("Invalid product ID");
    }

    const getCached = unstable_cache(
      async () => {
        const response = await WooCommerce.get("products/reviews", {
          product: productId,
          per_page: 100,
        });
        return response.data as ProductReview[];
      },
      ["product-reviews", String(productId)],
      { revalidate: REVIEWS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG, `product-${productId}`, `product-${productId}-reviews`] }
    );

    const reviews = await getCached();

    if (reviews && reviews.length > 0) {
      return {
        success: true,
        reviews,
      };
    } else {
      return {
        success: true,
        reviews: [],
        message: "No reviews found for this product",
      };
    }
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return {
      success: false,
      message: "Failed to fetch product reviews",
    };
  }
}

export async function createProductReview(reviewData: {
  productId: number;
  reviewer: string;
  reviewerEmail: string;
  review: string;
  rating: number;
}): Promise<{
  success: boolean;
  review?: ProductReview;
  message?: string;
}> {
  try {
    // Validate input data
    if (!reviewData.productId || isNaN(reviewData.productId)) {
      throw new Error("Invalid product ID");
    }
    if (!reviewData.reviewer || reviewData.reviewer.trim() === "") {
      throw new Error("Reviewer name is required");
    }
    if (!reviewData.reviewerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewData.reviewerEmail)) {
      throw new Error("Valid reviewer email is required");
    }
    if (!reviewData.review || reviewData.review.trim() === "") {
      throw new Error("Review content is required");
    }
    if (!reviewData.rating || reviewData.rating < 0 || reviewData.rating > 5) {
      throw new Error("Rating must be between 0 and 5");
    }

    // Make API request to create a review
    const response = await WooCommerce.post("products/reviews", {
      product_id: reviewData.productId,
      reviewer: reviewData.reviewer,
      reviewer_email: reviewData.reviewerEmail,
      review: reviewData.review,
      rating: reviewData.rating,
      status: "approved", // Default to 'hold' for moderation
    });

    // Map response to ProductReview type
    const createdReview: ProductReview = {
      id: response.data.id,
      date_created: response.data.date_created,
      date_created_gmt: response.data.date_created_gmt,
      product_id: response.data.product_id,
      status: response.data.status,
      reviewer: response.data.reviewer,
      reviewer_email: response.data.reviewer_email,
      review: response.data.review,
      rating: response.data.rating,
      verified: response.data.verified,
    };

    revalidateTag(`product-${reviewData.productId}-reviews`);
    return {
      success: true,
      review: createdReview,
    };
  } catch (error: unknown) {
    console.error("Error creating product review:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create product review",
    };
  }
}
