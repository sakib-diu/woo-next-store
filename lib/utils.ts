import { CartItem } from "@/context/CartContext"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to a more readable format
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Deterministic key for grouping/matching taxonomy entries by their display name
// (e.g. collapsing "Shoes" / "Shoes" / "Shoes" subcategories that repeat per audience
// category into one facet). Pure and shared between server and client code.
export function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  '#038': '&', '#8211': '–', '#8212': '—', '#8216': '‘', '#8217': '’', '#8220': '“', '#8221': '”',
};

// WooCommerce/WordPress return taxonomy names (categories, tags) with HTML entities encoded
// (e.g. "Pants &amp; Tights"). Unlike `decodeHtmlEntities`, this doesn't touch the DOM, so it's
// safe to call during server rendering without causing a hydration mismatch.
export function decodeEntities(value: string): string {
  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const codePoint = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_HTML_ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function decodeHtmlEntities(html: string) {
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
  }
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return "Today"
  if (diffInDays === 1) return "Yesterday"
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}


export function formatPrice(price: number | string): string {
  const numericPrice = typeof price === "string" ? Number.parseFloat(price) : price

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numericPrice)
  } catch (e) {
    console.log(`Error formating price: ${e}`)
  }
  return String(price)

}

export const calculatePrice = (product: CartItem) => {
  let price: string | number | undefined;

  if (product.selectedColor || product.selectedSize) {
    if (product.selectedVariation?.on_sale) {
      price = product.selectedVariation.sale_price;
    } else if ((product.selectedColor || product.selectedSize) && !product.selectedVariation) {
      price = product.price
    } else {
      price = product.selectedVariation?.regular_price ?? product.selectedVariation?.price;
    }
  } else {
    if (product.on_sale) {
      price = product.sale_price;
    } else {
      price = product.regular_price ?? product.price;
    }
  }

  // Convert to number and ensure we have a valid price
  const numericPrice = typeof price === "string" ? Number.parseFloat(price) : price;
  return numericPrice && numericPrice > 0 ? numericPrice : 0;
}