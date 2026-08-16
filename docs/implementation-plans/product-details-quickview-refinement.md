# Implementation Plan: Product Detail Page & QuickView Refinement

Status: Draft
Owner: TBD
Related areas: `app/product/[id]/`, `components/Product/Detail/Default.tsx`, `components/Modal/ModalQuickview.tsx`, `components/Product/Product.tsx`, `components/Product/QuickShopDrawer.tsx`, `context/ModalQuickviewContext.tsx`, `actions/products-actions.ts`, `types/product-type.ts`
Depends on: `docs/implementation-plans/product-fetching-improvements.md` (Phases 0/2 of that plan — real caching, `React.cache` dedup, shared SWR variation hook — are already implemented; this plan builds on top of that foundation and does not re-litigate it)

## 1. Background

The product detail page (`app/product/[id]/page.tsx` → `components/Product/Detail/Default.tsx`) and the QuickView modal (`components/Modal/ModalQuickview.tsx`) are functionally working, styled correctly, and laid out correctly, as observed. An architecture audit found they are two independently-hand-built implementations of the same feature — attribute/variant selection, pricing display, add-to-cart, payment badges, meta info — copy-pasted rather than shared, plus a third partial copy in `Product.tsx`'s `QuickShopDrawer`. On top of the duplication there are a handful of real correctness bugs, a systemic modal accessibility gap, an image-loading anti-pattern applied inconsistently, and a missing SEO layer (no structured data). None of this is visible as a "broken" bug in normal manual testing, which is why it's shipped — it shows up as crashes/inconsistencies only under specific conditions (currency fetch failure, variable-product stock edge cases, keyboard/screen-reader use).

This plan is scoped to the detail page + QuickView + QuickShopDrawer surfaces only. Shop-page pagination/filtering is covered by the existing sibling plan.

---

## 2. Findings

### Correctness bugs (fix regardless of any refactor)

**Bug A — Detail page crashes if currency fetch fails.** `Default.tsx:405,413` does `decodeHtmlEntities(currentCurrency!.symbol)`, a non-null assertion on a value `AppDataContext` types as `CurrencyType | null` (it's set to `null` on fetch failure via `Promise.allSettled` in `app/layout.tsx:61`). `ModalQuickview.tsx:300,308` correctly guards the same read with `currentCurrency ? … : '$'`. If the currency API is ever slow/down, every visitor loading a product detail page gets a runtime `TypeError`; QuickView degrades gracefully instead. This is the highest-priority fix in this plan — it's a full-page crash, not a cosmetic issue.

**Bug B — Quantity stepper is capped by the wrong stock number for variable products.** `Default.tsx:483` and `ModalQuickview.tsx:380` both cap the quantity stepper at `data.stock_quantity` / `selectedProduct?.stock_quantity` — the *parent* product's stock, not `selectedVariation.stock_quantity`. WooCommerce tracks stock per-variation for variable products, so once a variation is selected, the quantity max shown to the user is wrong (can under- or over-cap depending on how the parent product's own stock field is populated).

**Bug C — Breadcrumb hardcodes "Product" instead of the real category.** `components/Breadcrumb/BreadcrumbProduct.tsx:29` renders the literal string `"Product"` as the middle crumb instead of the product's actual category name — a minor but easy UX/SEO fix (category breadcrumbs are a common rich-result signal). The same file has dead, commented-out prev/next product navigation (lines 33-55) that should either be finished or deleted.

**Bug D — Silent variation-fetch failures.** `useProductVariations`'s `error` value is destructured nowhere in `ModalQuickview.tsx` or `Product.tsx`. On fetch failure the hook falls back to `variations: []`, which the UI interprets as "this product has no variations" rather than "we couldn't load variations" — a user can end up unable to select a color/size (and thus unable to add to cart) with no indication anything went wrong.

**Bug E — Two redundant `useEffect`s recompute the same state.** `ModalQuickview.tsx:91-102` and `:104-112` both recompute `selectedVariation` from `findMatchingVariation()` on overlapping dependencies — dead-weight re-renders and a maintenance trap (a future edit to one is easy to forget to mirror in the other).

### Duplication (same logic/markup hand-copied 3-4x)

Four independent surfaces reimplement the same product-selection/purchase flow: `Product.tsx` (grid card + inline quick-add), `Product.tsx`'s `QuickShopDrawer` (mobile bottom sheet), `Default.tsx` (detail page), `ModalQuickview.tsx` (quickview modal). Across these four, the following are each duplicated 3-4 times with no shared source of truth:

- `activeColor`/`activeSize`/`selectedVariation` state + `findMatchingVariation()` + `handleActiveColor`/`handleActiveSize` "auto-correct paired attribute" logic (~300+ lines of near-identical code across `Product.tsx:96-156`, `Default.tsx:123-214`, `ModalQuickview.tsx:67-159`).
- The price/sale-price/percent-off display block and its `Math.floor(100 - (sale/regular*100))` formula (`Default.tsx:403-424`, `ModalQuickview.tsx:292-320`, `Product.tsx:189`).
- Color/size swatch-picker markup (four separate JSX implementations).
- The "Guaranteed safe checkout" payment-badge block, byte-for-byte identical JSX (`Default.tsx:565-608`, `ModalQuickview.tsx:457-499`).
- The SKU/Categories/Tags meta block, including the same category-name-casing hack (`Default.tsx:527-564`, `ModalQuickview.tsx:424-456`).
- Add-to-cart/buy-now orchestration (find variation → validate → `addToCart()` → `openModalCart()`/navigate) and its enable/disable condition (`stock === 'outofstock' || (isColorReq && !activeColor) || (isSizeReq && !activeSize)`), inlined twice per file instead of named once.

This is the largest single opportunity in this plan: consolidating it removes several hundred lines of drift-prone duplicate code and means a future change (e.g. new attribute type, new validation rule) is made once instead of four times.

### QuickView-specific gaps

- **No image gallery.** QuickView shows a flat scrollable row of every image with no active-image/thumbnail-switch concept, while the detail page has a full Swiper main+thumbnail+lightbox gallery. `photoIndex`/`openPopupImg` state exists in `ModalQuickview.tsx:26-27` but is never wired to anything — a visibly abandoned attempt at parity.
- **Base product record can be stale.** Opening QuickView doesn't fetch a fresh product record — it reuses whatever was embedded in the grid card from a listing query. Stock/price staleness is bounded by the listing page's cache window, which is usually fine but worth being explicit about (documented as an accepted tradeoff, not necessarily a bug to fix).
- **`priority={true}` on every image in the gallery loop** (`ModalQuickview.tsx:254`), same anti-pattern as below.

### Images

- **No `sizes` prop anywhere** across `Default.tsx`, `ModalQuickview.tsx`, `Product.tsx` — `next/image` can't pick an appropriately-sized responsive image without it, so mobile visitors likely download desktop-sized images on every product surface in the app.
- **`priority` is inverted from its intended use.** The detail page's actual LCP candidate (the main hero gallery image, `Default.tsx:293-309`) has no `priority` at all, while `Product.tsx:245,259` sets `priority={true}` unconditionally on *every* grid card image across every listing surface (shop, search, wishlist, home sliders, related products — 8+ call sites), and `ModalQuickview.tsx:254` does the same for every quickview gallery image. This defeats browser prioritization broadly, not just locally.
- **`next.config.ts:13-18`** sets `remotePatterns: [{ protocol: "https", hostname: "**" }]` — allows `next/image` to optimize/proxy any HTTPS host, effectively disabling the allowlist. Should be scoped to the actual WordPress media host(s).
- Three independent `<Swiper>` instances on the detail page (main/thumbnails/lightbox) all iterate the same `data.images`, and `swiper/css/bundle` is imported wholesale rather than the specific modules used (`navigation`, `scrollbar`, `thumbs`).

### Accessibility (systemic across all modals, not just QuickView)

Zero occurrences of `aria-`, `role=`, `Escape` handling, or `tabIndex` anywhere in `components/Modal/*.tsx`. Specific to QuickView:
- No `role="dialog"`/`aria-modal`/`aria-labelledby` on the modal container.
- No Escape-to-close, no focus trap, no focus-in-on-open or focus-return-on-close.
- Close button is a `<div onClick>`, not a `<button>`, with no accessible name.
- Color/size swatches are `<div onClick>` (not `<button>`/`role="radio"` in a `radiogroup`), not keyboard-operable, selected state conveyed only by a CSS class.
- Wishlist toggle is a `<div>`, no `aria-pressed`.
- All four payment-network logos share the identical `alt='payment'`.

Since this pattern repeats identically in `ModalSizeguide`, `ModalCart`, `ModalWishlist`, `ModalCompare`, `ModalSearch`, the fix belongs at a shared level (one accessible dialog primitive), not patched per-modal.

### SEO

- No JSON-LD `Product` structured data anywhere (`application/ld+json` — zero matches repo-wide). No price/availability/rating rich snippets for an e-commerce PDP.
- No `alternates.canonical` set in `generateMetadata` (`app/product/[id]/page.tsx:19-43`).
- No Twitter card metadata (OG only).
- Route is the numeric WooCommerce ID (`/product/[id]`), not the product's `slug` (which exists on the type but is unused for routing) — a structural SEO limitation, noted but out of scope to fix here (would need slug-based lookup + redirect strategy).

### Performance

- `ModalQuickview` (and all other modals) is statically imported and always mounted in `app/layout.tsx:88`, shipping its JS (which pulls in `html-react-parser`, icon libs, etc.) on every page load even for visitors who never open it. A `next/dynamic(..., { ssr: false })` candidate.
- `import { isNull } from 'lodash'` in `Product.tsx:13` imports from the lodash root rather than `lodash/isNull`, risking pulling the whole package into the client bundle for a trivial null check.
- No `<Suspense>` boundary around related products on the detail page (`page.tsx:65`) — the related-products fetch is a genuine sequential mini-waterfall after the main `Promise.all`, blocking the full response instead of streaming in independently.

### Dead code / type hygiene (cheap wins, do early)

- `components/Product/Detail/{Sale,Grouped,External,OutOfStock,VariableProduct,CountdownTimer,BoughtTogether,Sidebar,Discount,FixedPrice,OnSale}.tsx` — 11 files, confirmed unimported anywhere, built against an unrelated legacy mock type. Delete.
- `types/ProductType.tsx` (legacy mock `ProductType`, fields like `originPrice`/`rate`/`sold` that don't exist in the real API) is still imported live by `context/CompareContext.tsx` and dead-imported (never used) in `ModalQuickview.tsx:12`. The real type is `types/product-type.ts`'s `Product`.
- `types/woocommerce.ts.bk` — stray backup file.
- `ModalQuickview.tsx` casts `selectedProduct as unknown as ProductType2` when calling `addToCart` — an `as unknown as` double-cast masking a real type mismatch between QuickView's product shape and what `CartContext` expects.
- Compare feature (`useCompare`) is wired into state/hooks in both `Default.tsx` and `ModalQuickview.tsx` but its trigger UI is commented out in both — either finish it or remove the dead wiring.
- `Default.tsx:78-92` — an `isMounted` flag that's set but never read (dead cancellation-guard remnant).
- `ReviewForm.tsx:68,85` — `console.log` of submitted PII (name/email/message) left in the client bundle.
- `createProductReview` (`actions/products-actions.ts:246-253`) hardcodes `status: "approved"` — every review auto-publishes with no moderation queue and no rate-limiting/CAPTCHA on the form. Flagged for awareness; a moderation-queue decision is a product call, not just a code fix.

---

## 3. Goals

1. Eliminate the crash risk and the two variation/stock correctness bugs (A, B) — ship first, independently of everything else.
2. Consolidate the four duplicated variant-selection/purchase implementations behind one shared hook and a small set of shared presentational components, so QuickView, QuickShop, and the detail page render the same behavior from one source of truth.
3. Bring QuickView's image handling to parity with the detail page (or deliberately simplify it — see Open Questions) and fix the `priority`/`sizes` anti-patterns across all three surfaces.
4. Make QuickView (and the shared modal pattern generally) keyboard- and screen-reader-accessible.
5. Add baseline PDP SEO (JSON-LD `Product`, canonical URL).
6. Remove dead code and type confusion so the real `Product` type is the only one anyone reaches for.

### Non-goals
- Rewriting the shop listing/pagination flow (separate plan already covers it).
- Migrating the URL scheme from numeric ID to slug-based routing (noted as a limitation, not scheduled here).
- Building a full design-system/headless-UI migration — Phase 3 below scopes the accessibility fix to what QuickView needs, with a note that the same primitive should be reused for the other modals as a fast-follow, not a blocking dependency.

---

## 4. Proposed approach

### Phase 0 — Correctness fixes (no refactor required, ship immediately)
- Fix Bug A: replace `currentCurrency!.symbol` with the same `currentCurrency ? … : '$'` guard already used in `ModalQuickview.tsx`, in both spots in `Default.tsx`.
- Fix Bug B: cap the quantity stepper at `selectedVariation?.stock_quantity ?? data.stock_quantity` (detail page) and the equivalent in QuickView, so a selected variation's own stock is respected once one is chosen.
- Fix Bug C: pass the product's real category into `BreadcrumbProduct`; delete the dead commented-out prev/next block or implement it, pick one.
- Fix Bug D: surface `error` from `useProductVariations` in both `Product.tsx` and `ModalQuickview.tsx` — at minimum disable add-to-cart with an inline "couldn't load options, try again" message rather than silently treating the product as variation-less.
- Fix Bug E: collapse the two redundant `useEffect`s in `ModalQuickview.tsx` into one.
- Scope `next.config.ts` `remotePatterns` to the actual WordPress media hostname(s) instead of `**`.

**Verification:** manually force `currentCurrency` to `null` (or simulate the layout's currency fetch failing) and confirm the detail page renders instead of throwing; select a variation with different stock than the parent product and confirm the quantity max reflects the variation.

### Phase 1 — Extract shared variant-selection hook
- Introduce `hooks/useVariantSelection(product, variations)` encapsulating: `activeColor`, `activeSize`, `selectedVariation`, `quantity`, `findMatchingVariation`, `handleActiveColor`, `handleActiveSize`, the enable/disable purchase condition, and the percent-sale calculation. This is a pure consolidation of existing, already-working logic — no behavior change, just one implementation instead of three.
- Migrate `Default.tsx`, `ModalQuickview.tsx`, and `Product.tsx` (including its `QuickShopDrawer` usage) to consume the hook, deleting their local copies.
- Extract a thin `handlePurchase({ mode: 'cart' | 'buy-now' })` helper (or a small `useAddToCart(product, variantSelection)` hook alongside it) so the find-variation → validate → `addToCart()` → `openModalCart()`/navigate sequence is written once.

**Verification:** attribute selection, auto-correction of an invalid paired attribute, quantity stepping, and add-to-cart/buy-now all behave identically to current behavior on card, QuickShop, detail page, and QuickView — regression-test each surface manually since this phase touches state logic on all four.

### Phase 2 — Extract shared presentational components
Once state is unified, the markup duplication mostly falls out naturally:
- `<ProductPriceBlock product currency variation />` — replaces the 3x duplicated price/sale/percent-off JSX.
- `<AttributePicker type="color"|"size" options active onChange />` — replaces the 4x duplicated swatch markup, and is the natural place to fix the swatch accessibility gaps from Phase 3 once.
- `<PaymentBadges />` — replaces the byte-identical block in `Default.tsx`/`ModalQuickview.tsx`, with distinct `alt` text per logo fixed here.
- `<ProductMetaList product />` (SKU/categories/tags) — replaces the duplicated meta block.

**Verification:** visual diff of detail page and QuickView before/after — layout/styling should be pixel-identical to current, since this phase only relocates existing markup into shared components.

### Phase 3 — QuickView image parity + `priority`/`sizes` fixes
- Decide QuickView's gallery approach (see Open Questions) — either reuse the detail page's gallery component (extracted from `Default.tsx`'s Swiper setup) at a smaller size, or intentionally keep QuickView's gallery simple but wire up the already-declared-but-dead `photoIndex` state to at least support click-to-switch-active-image, and remove the dead state if the simpler route is chosen instead.
- Add `sizes` to every `next/image` usage across `Default.tsx`, `ModalQuickview.tsx`, `Product.tsx`, matched to each surface's actual rendered width (e.g. grid card `sizes="(max-width: 768px) 50vw, 25vw"`, detail hero `sizes="(max-width: 1024px) 100vw, 50vw"`).
- Move `priority` onto the detail page's main hero image only; remove the unconditional `priority={true}` from `Product.tsx`'s grid card and `ModalQuickview.tsx`'s gallery loop (only the first/active image, if any, should carry it — and only where that instance is plausibly above-the-fold, which a QuickView modal image usually is while open, so `priority` on just the initially-active QuickView image is reasonable, not the whole loop).

**Verification:** Lighthouse/PageSpeed LCP metric on a product detail page before/after; confirm Network tab shows appropriately-sized (not full-resolution) images loading on a mobile viewport.

### Phase 4 — Modal accessibility
- Build one accessible dialog primitive (either hand-rolled focus-trap + Escape + `role="dialog"`/`aria-modal` + focus-return, or adopt Radix/Headless UI `Dialog` — evaluate bundle-size cost given `ModalQuickview` is already flagged for lazy-loading in Phase 5) and apply it to `ModalQuickview` first.
- Convert the close button and swatch pickers to real `<button>` elements with appropriate `aria-label`/`aria-pressed`/`role="radio"` semantics (naturally lands inside the `<AttributePicker>` component from Phase 2, so do this as part of that extraction rather than twice).
- Fast-follow (separate small PR, not blocking this plan): apply the same primitive to `ModalCart`, `ModalWishlist`, `ModalCompare`, `ModalSearch`, `ModalSizeguide`.

**Verification:** keyboard-only walkthrough (Tab into "Quick View" trigger, Enter to open, Tab should stay within the modal, Escape closes and returns focus to the trigger) plus a screen reader smoke test (VoiceOver/NVDA announces the dialog and its controls).

### Phase 5 — SEO + performance polish
- Add JSON-LD `Product` schema (`name`, `image`, `description`, `sku`, `offers.price/priceCurrency/availability`, `aggregateRating` when reviews exist) to `app/product/[id]/page.tsx`.
- Add `alternates: { canonical: … }` to `generateMetadata`.
- Wrap related products in a `<Suspense>` boundary fed by its own fetch so it no longer blocks the initial page response.
- `next/dynamic(() => import('@/components/Modal/ModalQuickview'), { ssr: false })` in `app/layout.tsx` (and the other modals, same fast-follow note as Phase 4).
- Fix `import { isNull } from 'lodash'` → `lodash/isNull` or a plain `=== null` check.

**Verification:** confirm rich-results test (Google's structured data testing tool) validates the `Product` JSON-LD; confirm initial JS payload on a non-product page shrinks after the dynamic-import change (bundle analyzer before/after).

### Phase 6 — Dead code & type cleanup
- Delete the 11 unused `components/Product/Detail/*.tsx` files, `types/ProductType.tsx`, `types/woocommerce.ts.bk`.
- Retype `CompareContext.tsx` against the real `Product` type (low-risk since Compare's trigger UI is already commented out everywhere) — or remove the Compare feature's dead wiring entirely if there's no near-term plan to finish it (product decision, see Open Questions).
- Drop the dead `ProductType` import in `ModalQuickview.tsx` and the `as unknown as ProductType2` double-cast once Phase 1's shared hook/types make the cast unnecessary.
- Remove the `console.log`s of PII in `ReviewForm.tsx`.
- Remove the dead `isMounted` flag in `Default.tsx`.

**Verification:** `tsc --noEmit` clean (consider also flipping `next.config.ts`'s `ignoreBuildErrors`/`ignoreDuringBuilds` to `false` once the type layer is cleaned up, as a guardrail against future drift — separate follow-up, not required to close this plan).

---

## 5. Sequencing & risk

| Phase | Effort | Risk | Depends on |
|---|---|---|---|
| 0 — Correctness fixes | S | Low (isolated, no shared-state changes) | none |
| 1 — Shared variant-selection hook | M | Medium (touches state on 4 surfaces at once) | Phase 0 |
| 2 — Shared presentational components | M | Low–Medium (markup relocation, should be visually identical) | Phase 1 |
| 3 — Image parity + priority/sizes | S–M | Low | can run parallel to Phase 1/2 |
| 4 — Modal accessibility | M | Low–Medium (new interaction behavior: focus trap, Escape) | Phase 2 (swatch buttons live in `AttributePicker`) |
| 5 — SEO + perf polish | S–M | Low | Phase 1 optional (JSON-LD/canonical are independent; dynamic-import benefits from Phase 4's a11y work being in place first so the lazy-loaded modal is already correct) |
| 6 — Dead code/type cleanup | S | Low | Phase 1 (need the shared hook before deleting the `ProductType2` cast) |

Recommended order: **0 → 1 → 2 → (3 and 4 in parallel) → 5 → 6.** Phase 0 should ship standalone and immediately — it's pure bug fixes with no dependency on the rest of the plan.

---

## 6. Open questions

- **QuickView gallery:** reuse/extract the detail page's Swiper gallery at a smaller size (more consistent UX, more Swiper JS in the modal bundle), or keep QuickView's gallery deliberately lightweight (just wire up click-to-switch on the existing flat image row, skip the lightbox)? Recommend the lightweight route given QuickView is meant to be a fast preview, not a full gallery experience — but confirm against design intent before Phase 3.
- **Compare feature:** finish wiring its UI back in, or remove the dead `useCompare` calls from `Default.tsx`/`ModalQuickview.tsx` entirely? Affects whether Phase 6 retypes `CompareContext` or deletes it.
- **Review moderation:** is auto-approving every submitted review (`actions/products-actions.ts:246-253`) intentional? If not, this needs a moderation-queue decision before a code fix — flagged here as out-of-scope-but-adjacent, not scheduled into this plan's phases.
- **Modal primitive choice (Phase 4):** hand-rolled focus-trap/Escape logic (zero new dependencies, more code to maintain) vs. Radix/Headless UI `Dialog` (battle-tested a11y, adds a dependency touching six modal components) — worth a short spike comparing bundle-size cost against the `next/dynamic` savings from Phase 5 before committing.
