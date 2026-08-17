// Shapes returned by WooCommerce's Store API (/wp-json/wc/store/v1).
// All money fields are minor-unit strings (e.g. "1998" = $19.98 when currency_minor_unit is 2) —
// use `fromMinorUnit` from `lib/utils.ts` to convert them for display.

export interface StoreApiCurrency {
    currency_code: string
    currency_symbol: string
    currency_minor_unit: number
    currency_decimal_separator: string
    currency_thousand_separator: string
    currency_prefix: string
    currency_suffix: string
}

export interface StoreApiImage {
    id: number
    src: string
    thumbnail: string
    srcset?: string
    sizes?: string
    name: string
    alt: string
}

export interface StoreApiItemPrices extends StoreApiCurrency {
    price: string
    regular_price: string
    sale_price: string
    price_range: { min_amount: string; max_amount: string } | null
}

export interface StoreApiItemTotals extends StoreApiCurrency {
    line_subtotal: string
    line_subtotal_tax: string
    line_total: string
    line_total_tax: string
}

export interface StoreApiQuantityLimits {
    minimum: number
    maximum: number
    multiple_of: number
    editable: boolean
}

export interface StoreApiCartItem {
    key: string
    id: number
    type: 'simple' | 'variation' | 'variable' | string
    quantity: number
    quantity_limits: StoreApiQuantityLimits
    name: string
    short_description: string
    description: string
    sku: string
    low_stock_remaining: number | null
    backorders_allowed: boolean
    sold_individually: boolean
    permalink: string
    images: StoreApiImage[]
    variation: { attribute: string; value: string; raw_attribute?: string }[]
    prices: StoreApiItemPrices
    totals: StoreApiItemTotals
    catalog_visibility: string
}

export interface StoreApiCoupon {
    code: string
    discount_type: string
    totals: {
        total_discount: string
        total_discount_tax: string
        currency_minor_unit: number
    }
}

export interface StoreApiTaxLine {
    name: string
    price: string
    rate: string
}

export interface StoreApiCartTotals extends StoreApiCurrency {
    total_items: string
    total_items_tax: string
    total_fees: string
    total_fees_tax: string
    total_discount: string
    total_discount_tax: string
    total_shipping: string | null
    total_shipping_tax: string | null
    total_price: string
    total_tax: string
    tax_lines: StoreApiTaxLine[]
}

export interface StoreApiShippingRate {
    rate_id: string
    name: string
    description: string
    delivery_time: string
    price: string
    taxes: string
    instance_id: number
    method_id: string
    selected: boolean
    currency_minor_unit: number
    currency_symbol: string
}

export interface StoreApiShippingPackage {
    package_id: number | string
    name: string
    shipping_rates: StoreApiShippingRate[]
}

export interface StoreApiCartError {
    code: string
    message: string
}

export interface StoreApiCart {
    items: StoreApiCartItem[]
    coupons: StoreApiCoupon[]
    totals: StoreApiCartTotals
    needs_payment: boolean
    needs_shipping: boolean
    has_calculated_shipping: boolean
    shipping_rates: StoreApiShippingPackage[]
    items_count: number
    items_weight: number
    errors: StoreApiCartError[]
}

// Shape of a Store API error response (e.g. add-item on an out-of-stock variation).
// On a `rest_invalid_param` error (e.g. an address failing WooCommerce's server-side
// validation), `data.params`/`data.details` carry the actual per-field reason — the
// top-level `message` is just "Invalid parameter(s): billing_address, shipping_address".
export interface StoreApiErrorResponse {
    code: string
    message: string
    data?: {
        status: number
        params?: Record<string, string>
        details?: Record<string, { code: string; message: string }>
    }
}

export function isStoreApiError(value: unknown): value is StoreApiErrorResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'code' in value &&
        'message' in value &&
        !('items' in value)
    )
}
