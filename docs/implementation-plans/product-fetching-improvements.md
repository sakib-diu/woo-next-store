# Implementation Plan: Fix Product Data Fetching & Shop Pagination

Status: Draft
Owner: TBD
Related areas: `app/shop/`, `app/product/[id]/`, `components/Product/`, `components/Modal/ModalQuickview.tsx`, `actions/products-actions.ts`, `actions/data-actions.ts`

## 1. Background

The app is a Next.js App Router storefront backed by the **WooCommerce REST API** (`wc/v3`) via `@woocommerce/woocommerce-rest-api`, which uses **axios internally, not the native `fetch()`**. There is no GraphQL layer.

An audit of the four product-fetching surfaces (product card, product detail page, quick-view modal, shop listing page) found a consistent root cause plus four independent duplication/scaling bugs:

### Root cause: caching options are silently no-ops
Every `WooCommerce.get(endpoint, params)` call passes Next.js `fetch()`-style options (`cache: 'no-store'`, `cache: 'default', next: { revalidate: 100 }`, `caches: true`) as the **params argument**. Because this client uses axios, these are not fetch options at all — they get spread into the axios `params` object and serialized onto the request **query string** (e.g. `?per_page=100&page=1&cache=no-store`). They do nothing for caching and pollute the outgoing request. Net effect: **there is no real caching anywhere in the data layer**, and Next's automatic request-memoization/dedup (which only applies to native `fetch()`) never kicks in either.

Affected: every call in `actions/products-actions.ts` and `actions/data-actions.ts`.

### Bug 1 — Shop page loads the entire catalog on every request
`getAllProductsPaginated()` (`actions/products-actions.ts:52-107`) is misnamed: it loops `page = 1, 2, 3...` fetching `per_page: 100` until `page > totalPages`, accumulating **the whole product catalog** into one array, then returns it. `app/shop/page.tsx:26` calls it with **no params**, so `/shop` triggers `ceil(totalProducts / 100)` sequential WooCommerce REST round-trips before it can render, and ships the entire catalog to the client as serialized props.

### Bug 2 — Shop pagination is local component state, not URL-driven
`components/Shop/ShopBreadCrumb.tsx:37` — `currentPage` is `useState(0)`, purely local. Changing page just re-slices (`filteredData.slice(offset, offset + productsPerPage)`, line ~210) the already-fully-loaded in-memory array. There is no `?page=` query param, so:
- Refresh resets to page 1.
- Page links aren't shareable or bookmarkable.
- Browser back/forward doesn't restore page position.
- Nothing is crawlable per-page for SEO.

(Contrast: `category` *is* synced via a raw `window.history.pushState` call, bypassing `useRouter`, which is itself non-idiomatic but at least persists across refresh — page number gets none of that.)

### Bug 3 — All filtering/sorting happens client-side over the full dataset
Category, gender, type/tag, size, color, brand, price range, on-sale, and sort are all filtered/sorted in-memory in `ShopBreadCrumb.tsx` (lines ~114-217), even though WooCommerce REST natively supports `category`, `tag`, `min_price`, `max_price`, `orderby`, etc. as query params. The `searchParams` already threaded into `app/shop/page.tsx` (`type`, `gender`, `category`) are only used to seed initial client state — never passed to the actual data fetch.

### Bug 4 — N+1 variation fetching in the product grid
`components/Product/Product.tsx:82-105` — every product card independently calls the server action `getProductVariationsById` in a `useEffect` on mount if the product has attributes. A grid of 9-24 cards fires 9-24 separate round trips. No loading state, no error surface (`eslint-disable react-hooks/exhaustive-deps` masks this).

### Bug 5 — Duplicate variation fetch between card and quick-view
`components/Modal/ModalQuickview.tsx:60-103` re-fetches variations for the same product ID via the same server action, independently of the card that opened it (`context/ModalQuickviewContext.tsx` only passes along the already-known product object, no shared cache). Opening quick-view after the card already loaded variations means fetching the same data twice, with no coordination and no re-fetch avoidance if the user closes/reopens the same product.

### Bug 6 — Duplicate product fetch on the detail page
`app/product/[id]/page.tsx` calls `getProductById({ id })` once in `generateMetadata` (line ~16) and again in the page body (line ~49). Because this goes through axios rather than native `fetch()`, Next's automatic per-request dedup does not apply — this is two live network calls to WooCommerce for the same product on every detail-page load.

### Minor
- `getAllProductsPaginated`'s name is misleading given Bug 1 — it should either actually paginate, or be renamed/split.
- `components/store/Products-grid.tsx` is a dead, empty (0-byte) file — safe to delete.

---

## 2. Goals

1. Shop page pagination becomes URL/searchParams-driven, server-rendered per page, using real WooCommerce `page`/`per_page` — shareable, bookmarkable, back-button-correct, and crawlable.
2. Shop filtering/sorting moves server-side into the WooCommerce query, so each page request fetches only the products it needs to render.
3. Product/variation data fetching is de-duplicated: one fetch per product per request lifecycle, shared between card, quick-view, and detail page where possible.
4. Real caching is restored using mechanisms that actually work with an axios-based client (Next `unstable_cache` / `React.cache`, or tag-based revalidation), replacing the no-op options.
5. No behavior regressions in filters, sort, quick-view, or product detail pages during the migration — ship incrementally, verify each phase.

### Non-goals
- Migrating WooCommerce REST to WPGraphQL (out of scope; REST + `X-WP-Total`/`X-WP-TotalPages` is sufficient and already partially wired).
- Introducing a new state library (React Query/SWR) is *optional*, evaluated in Phase 3, not assumed up front.

---

## 3. Proposed approach

### Phase 0 — Fix the caching no-op (foundation, low risk)
Real caching must exist before we lean on it elsewhere, and it's an isolated, mechanical fix.

- Replace the fake `cache`/`next`/`caches` params passed into `WooCommerce.get(...)` with **`unstable_cache`** wrapping each server action (or a hand-rolled `fetch()`-based WooCommerce client using signed query auth instead of the axios SDK, if we want native tag/`revalidate` support — evaluate cost/benefit before committing to a client swap).
  - Minimal-risk option: keep the axios SDK, wrap each exported action body in `unstable_cache(fn, keyParts, { revalidate, tags })`.
  - Cleaner option: replace `@woocommerce/woocommerce-rest-api` with a thin native-`fetch()` wrapper that signs WooCommerce REST requests (OAuth1 query params for HTTP, or Basic Auth header over HTTPS) — this restores automatic Next request memoization "for free" and unlocks `revalidateTag`. Worth a short spike to compare against the `unstable_cache` wrap.
- Define cache tags per resource (`product:${id}`, `products:list`, `categories`, etc.) so mutations (`createProductReview`) can call `revalidateTag` instead of the current blanket `revalidatePath('/products/[id]')` (which doesn't even match the real route pattern — should be `/product/[id]`, worth fixing regardless).
- Remove all the now-meaningless `cache`/`caches`/`next` keys from the `params` objects sent to `WooCommerce.get`.

**Verification:** confirm via network logs / WooCommerce access logs that repeated navigations within the revalidate window don't re-hit the API.

### Phase 1 — Shop page: URL-driven, server-side paginated & filtered
This is the core fix for the pagination complaint.

- Extend `app/shop/page.tsx`'s `searchParams` type to include `page`, `per_page` (optional, default 9 to match current UX), `sort`, `min_price`, `max_price`, `size`, `color`, `brand`, `on_sale`, in addition to existing `type`/`gender`/`category`.
- Replace `getAllProductsPaginated()` (no-args, whole-catalog) with a real single-page call: `getProducts({ params: { page, per_page, category, tag, min_price, max_price, orderby, order, on_sale } })` that returns just that page plus `totalItems`/`totalPages` from the `X-WP-Total(Pages)` headers — no `do...while` accumulation loop.
- Keep `getAllProductsPaginated` only where it's legitimately needed (e.g. the related-products `include` lookup in `app/product/[id]/page.tsx`, which fetches a small bounded set) — rename it to something accurate like `getProductsByIds` for that call site, and delete the whole-catalog loop path once the shop page stops using it.
- `components/Shop/ShopBreadCrumb.tsx` changes:
  - Remove `currentPage` local state and the in-memory `filteredData`/slice logic.
  - Pagination controls (`HandlePagination`) become `<Link href={buildShopUrl({ ...currentParams, page: n })}>` (or `router.push` with `scroll:false` if client-side transition is preferred) so the URL is the source of truth for page number.
  - Filter changes (category/size/color/brand/price/sort) update the URL's query params (via `useRouter`/`useSearchParams`, replacing the ad hoc `window.history.pushState` for category) and reset `page` to 1 — triggering a fresh server fetch rather than a client re-filter.
  - Consider `router.replace` (not `push`) for filter changes to avoid polluting browser history with every checkbox click, while page navigation uses `push` so back/forward moves between pages.
- Decide client vs server filter UI interactivity trade-off: filters can stay client components (checkboxes etc.) but they now *navigate* (update the URL) instead of *computing* — data fetching moves to the server component boundary.

**Verification:** loading `/shop?page=2&category=x` directly in a fresh browser tab renders page 2 pre-filtered without a client-side flash; refresh preserves page; back/forward moves between pages; network tab shows one bounded WooCommerce request per navigation, not a full-catalog fetch.

### Phase 2 — De-duplicate product/variation fetching
- **Card vs quick-view (Bug 4 & 5):** Fetch variations once per product per page load and share it, instead of two independent `useEffect`s. Two viable approaches, pick one:
  - (a) Lift variation fetching out of `Product.tsx` entirely; only fetch on-demand when actually needed for price/variant display (e.g. lazy on hover/interaction) instead of unconditionally on every card mount — cuts the N+1 down to only cards the user actually interacts with.
  - (b) Introduce a small client-side cache keyed by product ID (a `Map` in context, or adopt SWR/React Query with `useSWR(['variations', id], ...)`) so `Product.tsx` and `ModalQuickview.tsx` both read through the same cache key and only one network call happens per product ID per session, with automatic revalidation control.
  - Recommendation: (b) is the more robust fix and also resolves the missing-loading-state issue in `Product.tsx` "for free" (shared loading/error state). Evaluate adding SWR (lightweight, matches Next's data model) scoped just to this variation-fetch concern rather than a wholesale rewrite.
- **Detail page duplicate fetch (Bug 6):** Wrap `getProductById` in `React.cache()` (request-scoped memoization) so `generateMetadata` and the page body share one call within the same request — this works even over axios since `React.cache` memoizes by arguments regardless of what's inside the function, as long as it runs within the same request/render pass.

**Verification:** for a product page load, exactly one WooCommerce `products/{id}` call and one `products/{id}/variations` call fire per request (checked via server logs); opening quick-view for a card already rendered on the shop page does not issue a second variations request.

### Phase 3 — Cleanup
- Delete dead `components/store/Products-grid.tsx`.
- Fix `revalidatePath('/products/[id]')` → correct path / switch to tag-based revalidation from Phase 0.
- Add basic user-facing error states where currently silent (empty catch blocks in `Product.tsx` and `ModalQuickview.tsx` variation fetches).
- Update `types/product-type.ts` — remove the `product: {} as Product` type lie in `getProductById`'s error branch in favor of `product: null` and adjust call sites' null checks.

---

## 4. Sequencing & risk

| Phase | Effort | Risk | Depends on |
|---|---|---|---|
| 0 — Real caching | S–M | Low (isolated to actions layer) | none |
| 1 — Shop pagination/filtering to server | M–L | Medium (touches shared filter UI + URL state) | Phase 0 (so paginated calls are cached) |
| 2 — De-dupe variations & detail fetch | S–M | Low–Medium (behavior-sensitive: variant selection UX) | Phase 0 |
| 3 — Cleanup | S | Low | Phases 0–2 |

Phases 0 and 2 can proceed in parallel; Phase 1 is the highest-value fix for the specific pagination complaint and should be prioritized once Phase 0 lands.

## 5. Open questions

- Do we want infinite-scroll/"load more" instead of numbered pages for `/shop`? Current UI is numbered pages (`react-paginate`); keeping that pattern but URL-driven is the smaller change. Confirm desired UX before Phase 1.
- Is adding SWR/React Query acceptable as a new dependency, or should Phase 2's shared variation cache be hand-rolled in context to keep the dependency surface unchanged?
- Should we replace the `@woocommerce/woocommerce-rest-api` axios SDK with a native-`fetch()` wrapper (unlocks full Next cache/tag support) as part of Phase 0, or defer that as a larger follow-up? Recommend a short spike to decide.
