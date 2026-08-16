// Common interfaces
export interface MetaData {
    id: number; // Meta ID (read-only)
    key: string; // Meta key
    value: string; // Meta value
}

export interface BillingAddress {
    first_name: string; // First name
    last_name: string; // Last name
    company: string; // Company name
    address_1: string; // Address line 1
    address_2: string; // Address line 2
    city: string; // City name
    state: string; // ISO code or name of the state, province or district
    postcode: string; // Postal code
    country: string; // Country code in ISO 3166-1 alpha-2 format
    email: string; // Email address
    phone: string; // Phone number
}

export interface ShippingAddress {
    first_name: string; // First name
    last_name: string; // Last name
    company: string; // Company name
    address_1: string; // Address line 1
    address_2: string; // Address line 2
    city: string; // City name
    state: string; // ISO code or name of the state, province or district
    postcode: string; // Postal code
    country: string; // Country code in ISO 3166-1 alpha-2 format
}

export interface TaxLine {
    id: number; // Item ID (read-only)
    rate_code: string; // Tax rate code (read-only)
    rate_id: number; // Tax rate ID (read-only)
    label: string; // Tax rate label (read-only)
    compound: boolean; // Whether or not this is a compound tax rate (read-only)
    tax_total: string; // Tax total not including shipping taxes (read-only)
    shipping_tax_total: string; // Shipping tax total (read-only)
    meta_data: MetaData[]; // Meta data
}

export interface LineItem {
    id?: number; // Item ID (read-only)
    name: string; // Product name
    // Product ID for simple products; omit when variation_id is set — WooCommerce resolves
    // the parent product from the variation automatically.
    product_id?: number;
    variation_id?: number; // Variation ID, if applicable
    quantity: number; // Quantity ordered
    tax_class?: string; // Slug of the tax class of product
    // subtotal/total are intentionally left unset when creating orders from cart data —
    // omitting them lets WooCommerce compute authoritative prices from the catalog itself.
    subtotal?: string; // Line subtotal (before discounts)
    subtotal_tax?: string; // Line subtotal tax (before discounts) (read-only)
    total?: string; // Line total (after discounts)
    total_tax?: string; // Line total tax (after discounts) (read-only)
    taxes?: TaxLine[]; // Line taxes (read-only)
    meta_data?: MetaData[]; // Meta data
    sku?: string; // Product SKU (read-only)
    price?: string; // Product price (read-only)
    size?: string; // Product size (custom field)
}

export interface ShippingLine {
    id: number; // Item ID (read-only)
    method_title: string; // Shipping method name
    method_id: string; // Shipping method ID
    total: string; // Line total (after discounts)
    total_tax: string; // Line total tax (after discounts) (read-only)
    taxes: TaxLine[]; // Line taxes (read-only)
    meta_data: MetaData[]; // Meta data
}

export interface FeeLine {
    id: number; // Item ID (read-only)
    name: string; // Fee name
    tax_class: string; // Tax class of fee
    tax_status: string; // Tax status of fee. Options: taxable and none
    total: string; // Line total (after discounts)
    total_tax: string; // Line total tax (after discounts) (read-only)
    taxes: TaxLine[]; // Line taxes (read-only)
    meta_data: MetaData[]; // Meta data
}

export interface CouponLine {
    id: number; // Item ID (read-only)
    code: string; // Coupon code
    discount: string; // Discount total (read-only)
    discount_tax: string; // Discount total tax (read-only)
    meta_data: MetaData[]; // Meta data
}

export interface Refund {
    id: number; // Refund ID (read-only)
    reason: string; // Refund reason (read-only)
    total: string; // Refund total (read-only)
}

// Main Order interface
export interface OrderType {
    // Basic order information
    id: number; // Unique identifier for the resource (read-only)
    parent_id: number; // Parent order ID
    number: string; // Order number (read-only)
    order_key: string; // Order key (read-only)
    created_via: string; // Shows where the order was created
    version: string; // Version of WooCommerce which last updated the order (read-only)
    status: string; // Order status: pending, processing, on-hold, completed, cancelled, refunded, failed, trash

    // Currency and pricing
    currency: string; // Currency the order was created with, in ISO format
    currency_symbol?: string; // Currency symbol

    // Dates
    date_created: string; // The date the order was created, in the site's timezone (read-only)
    date_created_gmt: string; // The date the order was created, as GMT (read-only)
    date_modified: string; // The date the order was last modified, in the site's timezone (read-only)
    date_modified_gmt: string; // The date the order was last modified, as GMT (read-only)
    date_paid: string; // The date the order was paid, in the site's timezone (read-only)
    date_paid_gmt: string; // The date the order was paid, as GMT (read-only)
    date_completed: string; // The date the order was completed, in the site's timezone (read-only)
    date_completed_gmt: string; // The date the order was completed, as GMT (read-only)

    // Totals
    discount_total: string; // Total discount amount for the order (read-only)
    discount_tax: string; // Total discount tax amount for the order (read-only)
    shipping_total: string; // Total shipping amount for the order (read-only)
    shipping_tax: string; // Total shipping tax amount for the order (read-only)
    cart_tax: string; // Sum of line item taxes only (read-only)
    total: string; // Grand total (read-only)
    total_tax: string; // Sum of all taxes (read-only)
    prices_include_tax: boolean; // True if prices included tax during checkout (read-only)

    // Customer information
    customer_id: number; // User ID who owns the order. 0 for guests
    customer_ip_address: string; // Customer's IP address (read-only)
    customer_user_agent: string; // User agent of the customer (read-only)
    customer_note: string; // Note left by customer during checkout

    // Addresses
    billing: BillingAddress; // Billing address
    shipping?: ShippingAddress; // Shipping address

    // Payment
    payment_method: string; // Payment method ID
    payment_method_title: string; // Payment method title
    transaction_id: string; // Unique transaction ID

    // Order data
    cart_hash: string; // MD5 hash of cart items to ensure orders are not modified (read-only)
    meta_data: MetaData[]; // Meta data

    // Line items and related data
    line_items: LineItem[]; // Line items data
    tax_lines: TaxLine[]; // Tax lines data (read-only)
    shipping_lines: ShippingLine[]; // Shipping lines data
    fee_lines: FeeLine[]; // Fee lines data
    coupon_lines: CouponLine[]; // Coupons line data
    refunds: Refund[]; // List of refunds (read-only)

    // Control flags
    set_paid?: boolean; // Define if the order is paid (write-only)
}
