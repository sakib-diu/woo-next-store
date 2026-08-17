"use server"

import { AttributesWithTermsType, AttributeTermType, CategorieType, CountryDataType, CurrencyType, ProductAttributeType, ProductBrandType, StoreConfig, TagType } from "@/types/data-type";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { unstable_cache } from "next/cache";

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WORDPRESS_SITE_URL || "https://axessories.store/headless",
  consumerKey: process.env.WC_CONSUMER_KEY! as string,
  consumerSecret: process.env.WC_CONSUMER_SECRET! as string,
  version: "wc/v3",
});

// Reference/taxonomy data changes rarely, so it's cached longer than product data.
const REFERENCE_REVALIDATE_SECONDS = 3600;

export const getCountries = async (): Promise<CountryDataType[]> => {
  try {
    const [storeSettings, allCountriesResponse] = await Promise.all([
      getStoreSettings(),
      unstable_cache(
        async () => (await WooCommerce.get("data/countries")).data as CountryDataType[],
        ["countries"],
        { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["countries"] }
      )(),
    ]);

    if (!storeSettings || !allCountriesResponse) {
      console.error("Could not retrieve store settings or country list.");
      return [];
    }

    const shippingLocations = storeSettings.shippingLocations;

    if (shippingLocations.length === 0) {
      return [];
    }

    // 4. Filter the full country list to include only the allowed shipping locations
    const filteredCountries = allCountriesResponse.filter(country =>
      shippingLocations.includes(country.code)
    );

    return filteredCountries;

  } catch (error) {
    console.error("Error fetching filtered countries:", error);
    return [];
  }
}

export interface PaymentGatewayDataType {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
}

// The frontend only ships JS for these gateways today — even if other gateways are enabled in
// wp-admin, there's no checkout UI for them yet, so they're filtered out rather than shown.
const SUPPORTED_GATEWAY_IDS = new Set(['cod', 'stripe']);

export const getPaymentGateways = async (): Promise<PaymentGatewayDataType[]> => {
  try {
    const getCached = unstable_cache(
      async () => {
        const response = await WooCommerce.get('payment_gateways');
        const gateways: PaymentGatewayDataType[] = response.data;
        return gateways
          .filter((gateway) => gateway.enabled && SUPPORTED_GATEWAY_IDS.has(gateway.id))
          .sort((a, b) => a.order - b.order);
      },
      ["payment-gateways"],
      { revalidate: 300, tags: ["payment-gateways"] } // admins toggle gateways more often than shipping zones/taxes
    );
    return await getCached();
  } catch (error) {
    console.error("Error fetching payment gateways:", error);
    return [];
  }
}

export const getAttributesWithTerms = async (): Promise<AttributesWithTermsType[]> => {
  try {
    const getCached = unstable_cache(
      async () => {
        let allAttributes: ProductAttributeType[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await WooCommerce.get('products/attributes', {
            per_page: 100,
            page: page,
          });

          if (response.data && Array.isArray(response.data)) {
            allAttributes = allAttributes.concat(response.data);
          }

          if (page === 1 && response.headers && response.headers['x-wp-totalpages']) {
            totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
          }

          page++;
        } while (page <= totalPages);

        // Fetch terms for each attribute
        const attributesWithTerms: AttributesWithTermsType[] = await Promise.all(allAttributes.map(async (attribute) => {
          const terms: AttributeTermType[] = await WooCommerce.get(`products/attributes/${attribute.id}/terms`, { per_page: 100 }).then(res => res.data);
          return {
            attribute: attribute,
            terms: terms,
          };
        }));

        return attributesWithTerms;
      },
      ["attributes-with-terms"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["attributes"] }
    );

    return await getCached();
  } catch (error) {
    console.error("Error fetching attributes with terms:", error);
    return [];
  }
}

export const getProductCategories = async (): Promise<CategorieType[]> => {
  try {
    const getCached = unstable_cache(
      async () => {
        let allCategories: CategorieType[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await WooCommerce.get('products/categories', {
            per_page: 100,
            page: page,
          });

          if (response.data && Array.isArray(response.data)) {
            allCategories = allCategories.concat(response.data);
          }

          // Get total pages from headers on the first request
          if (page === 1 && response.headers && response.headers['x-wp-totalpages']) {
            totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
          }

          page++;
        } while (page <= totalPages);

        return allCategories;
      },
      ["product-categories"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["categories"] }
    );

    return await getCached();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export const getProductTags = async (): Promise<TagType[]> => {
  try {
    const getCached = unstable_cache(
      async () => {
        let allTags: TagType[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await WooCommerce.get('products/tags', {
            per_page: 100,
            page: page,
          });

          if (response.data && Array.isArray(response.data)) {
            allTags = allTags.concat(response.data);
          }

          // Get total pages from headers on the first request
          if (page === 1 && response.headers && response.headers['x-wp-totalpages']) {
            totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
          }

          page++;
        } while (page <= totalPages);

        return allTags;
      },
      ["product-tags"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["tags"] }
    );

    return await getCached();
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}


export const getCurrentCurrency = async (): Promise<CurrencyType> => {
  try {
    const getCached = unstable_cache(
      async () => (await WooCommerce.get('data/currencies/current')).data as CurrencyType,
      ["current-currency"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["currency"] }
    );
    return await getCached();
  } catch (error) {
    console.error("Error fetching current currency:", error);
    throw new Error("Failed to fetch current currency");
  }
}

export const getBrands = async (): Promise<ProductBrandType[]> => {
  try {
    const getCached = unstable_cache(
      async () => (await WooCommerce.get('products/brands')).data as ProductBrandType[],
      ["product-brands"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["brands"] }
    );
    return await getCached();
  } catch (e) {
    console.error("Error fetching brands:", e);
    return [];
  }
}

export const getStoreSettings = async (): Promise<StoreConfig | null> => {
  try {
    const getCached = unstable_cache(
      async () => {
        const { data: settings } = await WooCommerce.get("settings/general");

        if (!settings || !Array.isArray(settings)) {
          throw new Error("Invalid settings format received from API.");
        }

        // Helper to find a setting's value by its ID
        const findSettingValue = (id: string, defaultValue: string | string[] = '') => {
          const setting = settings.find((s) => s.id === id);
          return setting ? setting.value : defaultValue;
        };

        // Find the currency symbol from the options list
        const currencyCode = findSettingValue('woocommerce_currency');
        const currencyOptions = settings.find(s => s.id === 'woocommerce_currency')?.options || {};
        const currencyString = currencyOptions[currencyCode] || '';
        // Extract symbol from string like "United States (US) dollar (&#36;) — USD"
        const symbolMatch = currencyString.match(/\(([^)]+)\)/);
        const currencySymbol = symbolMatch ? symbolMatch[1].replace(/&#x20b9;/g, '₹').replace(/&[a-z]+;/g, '') : '$';

        const organizedSettings: StoreConfig = {
          address: {
            address1: findSettingValue('woocommerce_store_address'),
            address2: findSettingValue('woocommerce_store_address_2'),
            city: findSettingValue('woocommerce_store_city'),
            postcode: findSettingValue('woocommerce_store_postcode'),
            countryState: findSettingValue('woocommerce_default_country'),
          },
          currency: currencyCode,
          currencySymbol: currencySymbol,
          currencyPosition: findSettingValue('woocommerce_currency_pos'),
          thousandSeparator: findSettingValue('woocommerce_price_thousand_sep'),
          decimalSeparator: findSettingValue('woocommerce_price_decimal_sep'),
          numberOfDecimals: parseInt(findSettingValue('woocommerce_price_num_decimals', '2'), 10),
          isTaxesEnabled: findSettingValue('woocommerce_calc_taxes') === 'yes',
          areCouponsEnabled: findSettingValue('woocommerce_enable_coupons') === 'yes',
          sellingLocations: findSettingValue('woocommerce_specific_allowed_countries', []),
          shippingLocations: findSettingValue('woocommerce_specific_ship_to_countries', []),
        };

        return organizedSettings;
      },
      ["store-settings"],
      { revalidate: REFERENCE_REVALIDATE_SECONDS, tags: ["store-settings"] }
    );

    return await getCached();
  } catch (error) {
    console.error("Error fetching store settings:", error);
    return null;
  }
};
