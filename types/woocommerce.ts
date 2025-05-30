export interface Product {
    id: number
    name: string
    price: string
    regular_price: string
    sale_price: string
    featured: boolean
    date_on_sale_from: string | null
    date_on_sale_to: string | null
    total_sales: number
    purchasable: boolean
    stock_status: string
    stock_quantity: number | null
    shipping_required: boolean
    average_rating: string
    dimensions: {
        length: string,
        width: string,
        height: string
    },
    categories: { id: number, name: string, slug: string }[]
    images: { id: number, src: string, alt: string, name: string }[]
    attributes: {
        id: number,
        name: string,
        slug: string,
        position: number,
        visible: boolean,
        variation: boolean,
        options: string[]
    }[]
    default_attributes: {
        id: number,
        name: string,
        option: string
    }[]
    selectedAttributes?: {
        Color?: string
        Size?: string
    },
    description: string
    short_description: string
    variations: number[]
    variation_id?: number
    type: string
    status: string
    catalog_visibility: string
    on_sale: boolean
    virtual: boolean
    downloadable: boolean
    manage_stock: boolean
    backorders: string
    backorders_allowed: boolean
    backordered: boolean
    sold_individually: boolean
    weight: string
    shipping_taxable: boolean
    shipping_class: string
    shipping_class_id: number
    reviews_allowed: boolean
    rating_count: number
    price_html: string
    has_options: boolean
}

export interface VariationProduct {
    id: number
    name: string
    stock_status: string
    stock_quantity: number | null
    price: string
    regular_price: string
    sale_price: string
    image: { src: string, alt: string, name: string }
    attributes: {
        id: number,
        slug: string,
        name: string,
        option: string
    }[]
    description?: string
}

export interface Order {
    id: number;
    status: string;
    parent_id: string;
    number: string;
    total_tax: string;
    total: string;
    date_created: string;
    billing: {
        first_name: string;
        last_name: string;
        address_1: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
        email: string;
        phone: string;
    };
    shipping?: {
        first_name: string;
        last_name: string;
        address_1: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    line_items: {
        product_id: number;
        quantity: number;
        size?: string;
        variation_id: number;
    }[];
    customer_id: number;
}

export interface Customer {
    id: number;
    email: string;
    phone: string;
    date_created: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url?: string;
    billing: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2?: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
        email: string;
        phone: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2?: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
}

export interface DownloadData {
    download_id: string;
    download_url: string;
    product_id: number;
    product_name: string;
    download_name: string;
    order_id: number;
    order_key: string;
    downloads_remaining: string;
    access_expires: string;
    access_expires_gmt: string;
    file: {
        name: string;
        file: string;
    };
   
}

export interface CountryData {
    code: string;
    name: string;
    states: StateData[]
}

export interface StateData { 
    code: string 
    name: string 
}

export interface TaxtData {
    id: number;
    country: string;
    state: string;
    postcode: string;
    city: string;
    rate: string;
    name: string;
    priority: number;
    compound: boolean;
    shipping: boolean;
    order: number;
    class: string;
    postcodes: string[];
    cities: string[];
}

export interface ShippingMethodData {
    id: number;
    instance_id: number;
    title: string;
    order: number;
    enabled: boolean;
    method_id: string;
    method_title: string;
    method_description: string;
    settings: {
        title: {
            id: string;
            label: string;
            description: string;
            type: string;
            value: string;
            default: string;
            tip: string;
            placeholder: string;
        };
        tax_status: {
            id: string;
            label: string;
            description: string;
            type: string;
            value: string;
            default: string;
            tip: string;
            placeholder: string;
            options: {
                [key: string]: string;
            };
        };
        cost?: {
            id: string;
            label: string;
            description: string;
            type: string;
            value: string;
            default: string;
            tip: string;
            placeholder: string;
        };
        min_amount: {
            value: string
        }
    };
}

export interface ShippingZoneData {
    id: number;
    name: string;
    order: number;
    methods: ShippingMethodData[];
    locations: ShippingLocationData[];
}
export interface ShippingLocationData {
    code: string;
    type: string;
}

export interface CurrencyData {
    code: string;
    name: string;
    symbol: string;
}

export interface CouponData {
    id: number;
    code: string;
    amount: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    discount_type: string;
    description: string;
    date_expires: string | null;
    date_expires_gmt: string | null;
    usage_count: number;
    individual_use: boolean;
    product_ids: number[];
    excluded_product_ids: number[];
    usage_limit: number | null;
    usage_limit_per_user: number | null;
    limit_usage_to_x_items: number | null;
    free_shipping: boolean;
    product_categories: number[];
    excluded_product_categories: number[];
    exclude_sale_items: boolean;
    minimum_amount: string;
    maximum_amount: string;
    email_restrictions: string[];
    used_by: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta_data: any[];
}
