# Fix: Categories Mega Menu Showing Nothing

Status: Implemented
Owner: TBD
Related areas: `lib/categoryUtils.ts`, `components/Header/Menu/MenuOne.tsx`, `app/shop/page.tsx`, `components/Shop/ShopBreadCrumb.tsx`

## 1. Problem

The "Categories" mega menu in the header (`MenuOne.tsx`) rendered empty — no columns, no links — on both desktop and mobile.

## 2. Root cause

`generateMenuItems()` in `lib/categoryUtils.ts` was leftover logic from the store's original "fashion demo" template. It required a root category literally named `"Fashion"` (or with a `first_order`/`fashion` slug) and built the menu only from that category's children, with two hardcoded child slugs (`second_order_fashion_gender_men` / `_women`) treated specially as gender/audience links:

```ts
const fashionCategory = categories.find(
    (cat) =>
        (cat.slug.toLowerCase().includes("first_order") &&
            cat.slug.toLowerCase().includes("fashion")) ||
        cat.name.toLowerCase() === "fashion"
);
if (!fashionCategory) {
    console.error("The root 'Fashion' category was not found.");
    return []; // menu is always empty
}
```

The live WooCommerce catalog (`wp.joynalbokhsho.me`) has no such category. Its real top-level (`parent === 0`) categories are **Baby & Toddler, Kids, Men, Unisex, Women** (plus an empty `Uncategorized`), each with its own set of product-type subcategories (T-Shirts, Shoes, Hoodies & Sweatshirts, ...) — a flat two-level taxonomy, not a single "Fashion" root. So `fashionCategory` was always `undefined` and the function always returned `[]`.

This is the same taxonomy mismatch already identified and worked around elsewhere in the codebase — `ShopBreadCrumb.tsx` and `app/shop/page.tsx` both treat top-level categories as an **audience** facet (`?audience=`) and group same-named subcategories across audiences into a **product type** facet (`?category=<slugifyKey(name)>`), since the same subcategory name (e.g. "Shoes") exists once per audience (`shoes`, `shoes-men`, `shoes-women`, `shoes-kids`, `shoes-baby-toddler`). `categoryUtils.ts` had never been updated to match.

## 3. Fix

Rewrote `generateMenuItems()` to build the menu generically from whatever categories actually exist, using the same audience/category-group model already established in `ShopBreadCrumb.tsx`/`app/shop/page.tsx`:

- Top-level categories with `count > 0` become the menu's top-level columns (audience), sorted by product count descending.
- Each column's direct children with `count > 0` become its submenu links, sorted by product count descending.
- Each submenu link's `categoryKey` is `slugifyKey(cat.name)` — computed over the raw, HTML-entity-encoded name exactly as `app/shop/page.tsx` does when resolving the `category` query param, so the two stay in sync even though WooCommerce returns names like `Bags &amp; Backpacks`.
- Display names are passed through `decodeEntities()` so entities don't leak into the rendered menu text.
- Categories with `count === 0` (including `Uncategorized`) are dropped — a menu link that always lands on an empty shop page isn't useful.

`MenuOne.tsx` was updated to link each column to `?audience=<slug>` (View All) and each submenu item to `?audience=<slug>&category=<categoryKey>`, matching how `app/shop/page.tsx` resolves those two params into WooCommerce category IDs. The old `isAudienceCat`/`audienceCategory` special-casing (tied to the two hardcoded fashion-template slugs) was removed — every top-level category is now uniformly an audience.

As a side fix, the mobile submenu's `menuItems.sort(...)` (which mutated React state in place during render) was changed to sort a shallow copy (`[...menuItems].sort(...)`).

## 4. Verification

Fetched the live category list via the WooCommerce REST API (`GET /wp-json/wc/v3/products/categories`) to confirm the real taxonomy shape (5 populated top-level categories, each with several populated children) before writing the fix, and re-derived `categoryKey` values by hand against `app/shop/page.tsx`'s matching logic to confirm menu links resolve to the same category IDs the shop page filters on.

`npx tsc --noEmit` shows no new errors introduced by this change (pre-existing, unrelated errors elsewhere in the repo are untouched).
