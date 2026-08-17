# Implementation Plan: Checkout Flow Fixes & WooCommerce Integration

Status: Draft
Owner: TBD
Related areas: `components/Checkout/CheckoutClient.tsx`, `components/Checkout/StripeCheckoutForm.tsx`, `actions/order-actions.ts`, `actions/stripePaymentIntentActions.ts`, `actions/data-actions.ts`, `lib/store-api-client.ts`, `context/CartContext.tsx`, `app/checkout/page.tsx`

## 1. Background

Cart is solid: WooCommerce Store API (`/wc/store/v1/cart`) via server actions, with httpOnly `Cart-Token`/`Nonce` cookies (`lib/store-api-client.ts`). Checkout, however, does not build on that pipeline. `app/checkout/page.tsx` re-fetches countries/taxes/shipping-zones via the **admin** REST v3 API, `CheckoutClient.tsx` reimplements shipping-zone matching and tax math in the browser, and the order is created by posting straight to `wc/v3/orders` with admin credentials — a parallel, hand-rolled checkout that never touches the server-side cart it just built line items from. Payment confirmation is Stripe PaymentIntents + PaymentElement, but the WooCommerce order is only ever marked "paid" by a **client-side** call after `confirmPayment()` succeeds — there is no Stripe webhook anywhere in the repo (confirmed via grep for `webhook`/`constructEvent`/`STRIPE_WEBHOOK_SECRET`).

`getTaxes`/`getShippingZones` in `actions/data-actions.ts` are only consumed by the checkout page (confirmed via grep) — free to change/remove without touching other routes. `getCountries` is also used globally in `app/layout.tsx`, so it stays.

## 2. Bugs found

### Bug 1 — Critical: checkout redirects users away from a non-empty cart
`components/Checkout/CheckoutClient.tsx:412-414`
```ts
if (cart.items.length === 0) { redirect('/cart'); }
```
`cart` comes from `CartContext`, which initializes to `EMPTY_CART` and only populates via a `useEffect` after mount (`context/CartContext.tsx:90, 106-120`) — `isLoading` isn't even destructured in `CheckoutClient`. Because `CheckoutClient` is a client component, Next still server-renders it on first load with that empty initial state, so this check can fire — and since `redirect()` throws during render, actually redirect — **before the real cart has ever been fetched**. On a cold load or hard refresh of `/checkout`, a customer with items in their cart can get bounced straight back to `/cart`.

### Bug 2 — Critical: order payment status is client-attested, not server-verified
`components/Checkout/StripeCheckoutForm.tsx:61` calls the `updateOrderStatus` server action after the *browser* observes `stripe.confirmPayment()` succeed. `actions/order-actions.ts:134-149` takes `orderId`, `status`, `transactionId`, `paid` straight from the caller and writes them to WooCommerce with no verification against Stripe. Server Actions are POST-able RPC endpoints — anyone can call this directly with any `orderId` and a fabricated `transactionId` to mark an order paid without ever paying. It is also a reliability bug independent of abuse: if the tab closes after Stripe confirms but before this call lands, the customer is charged and the WooCommerce order sits `pending` forever, with no reconciliation path.

### Bug 3 — High: cart is never cleared after a successful order, on either payment path
COD branch (`CheckoutClient.tsx:380-399`) redirects to the thank-you page with no `clearCart()` call. Stripe branch (`StripeCheckoutForm.tsx:65`) destructures `clearCart` from `useCart()` but the call is commented out: `// clearCart(); // Clear cart after successful payment`. Customers land on the thank-you page with the same items still sitting in their cart.

### Bug 4 — High: tax/shipping are recomputed by hand in the browser instead of via WooCommerce's own engine, which the app already models
`types/store-api-type.ts` shows `StoreApiCart` already carries `shipping_rates` and address-aware `totals.total_tax`/`total_shipping_tax` — WooCommerce's Store API cart, which computes real per-zone shipping and real per-tax-class/compound tax once you `POST /cart/update-customer`. None of that is used. Instead `calculateShipping`/`calculateTaxes` (`CheckoutClient.tsx:122-228`) reimplement zone matching and compound tax in JS against admin-fetched `taxesData`/`shippingZones`, ignoring per-product tax classes/exemptions and shipping taxability. Numbers shown at checkout can drift from what WooCommerce actually charges (the Stripe amount is later pulled from the real `order.total`, so a mismatch surfaces to the customer as "the price changed").

### Bug 5 — Medium: displayed per-tax-line breakdown doesn't sum to the actual tax charged
`CheckoutClient.tsx:743-748` recomputes each tax line as `rate * totalCart` (pre-discount subtotal), while the grand total uses `calculateTaxes`'s discount-adjusted, compound-aware `taxAmount` (`CheckoutClient.tsx:185-228`). With any coupon applied, the itemized tax lines shown will be inflated relative to what's actually added to the total.

### Bug 6 — Medium: order is built from a client-held cart snapshot, not the live server cart
`CheckoutClient.tsx:310` copies `cart.items` (React state) at submit time to build `lineItems`, with no re-validation against the authoritative server-side cart immediately before order creation.

### Bug 7 — Low: no idempotency guard
`isSubmitting` only disables the button; a retried request (network hiccup, double-click racing a slow render) can create duplicate WooCommerce orders and duplicate Stripe PaymentIntents.

### Design gap — payment methods & required fields are hardcoded, not WooCommerce-driven
COD/Stripe are hardcoded in the JSX and in the zod enum; `state`/`postcode` are always required regardless of country locale. Enabling/disabling/reordering a gateway in wp-admin, or a country whose locale doesn't require a state, has no effect on the frontend without a code change.

---

## 3. Goals

1. Checkout no longer produces false "your cart is empty" redirects.
2. Stripe payment confirmation is verified server-side (webhook) and is the sole source of truth for order status — closes both the fraud vector and the "charged but order stuck pending" reliability gap.
3. Cart is reliably cleared after every successful order.
4. Shipping/tax calculation is delegated to WooCommerce's Store API cart instead of being reimplemented client-side, so displayed totals always match what WooCommerce actually charges.
5. Order placement is built from the live server-side cart rather than a client-side reconstruction.
6. Payment method list (and eventually required-field rules) reflect live WooCommerce config instead of being hardcoded.
7. Ship incrementally — each phase independently verifiable, no big-bang rewrite.

### Non-goals
- Replacing Stripe Elements/PaymentElement with a different payment UI.
- Migrating cart storage off the Store API (already correct).

---

## 4. Proposed approach

### Phase 0 — Quick fixes (low risk, ship first, <1 day)
- Gate the empty-cart check on `isLoading` (destructure it from `useCart()`) and move it into a `useEffect` + `router.replace` instead of calling `redirect()` unconditionally during render — fixes Bug 1.
- Call `clearCart()` after order success on both the COD branch (`CheckoutClient.tsx`, after `router.push` to thank-you) and the Stripe success path (`StripeCheckoutForm.tsx:65`, uncomment/wire the existing call) — fixes Bug 3.
- Fix the tax-line display (`CheckoutClient.tsx:743-748`) to reuse the same discount/compound-adjusted base `calculateTaxes` uses internally, instead of recomputing against pre-discount `totalCart` — fixes Bug 5.

**Verification:** manually walk both COD and Stripe checkouts from a hard refresh of `/checkout`, confirm no false redirect, confirm cart is empty on the thank-you page, confirm displayed tax lines sum to the grand total tax with a coupon applied.

### Phase 1 — Stripe webhook (do this ASAP, independent of the rest, 1-2 days)
- Add `app/api/webhooks/stripe/route.ts` (Route Handler): read the raw body, verify with `stripe.webhooks.constructEvent` using a new `STRIPE_WEBHOOK_SECRET` env var.
- On `payment_intent.succeeded`: look up `metadata.woocommerce_order_id`, verify `amount_received`/currency against the order's total/currency, then call `updateOrderStatus` server-side; clear the cart tied to that order/session.
- On `payment_intent.payment_failed`: mark the order failed / leave a note.
- Stop treating the client-side `updateOrderStatus` call in `StripeCheckoutForm.tsx` as authoritative — either remove it or repurpose it into a pure "poll for status / show success UI" step that no longer writes order state itself.
- Register the endpoint locally via `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for testing, and in the Stripe dashboard for staging/prod — fixes Bug 2.

**Verification:** trigger a test PaymentIntent via the Stripe CLI, confirm the order transitions to paid only via the webhook path, confirm a forged direct call to `updateOrderStatus` (if left in place) can no longer be the deciding factor for payment state; confirm a tab closed immediately after `confirmPayment()` still results in the order being marked paid once the webhook fires.

### Phase 2 — Store API-driven shipping & tax (2-4 days)
- Add `updateCustomer(address)` and `selectShippingRate(packageId, rateId)` to `lib/store-api-client.ts`, thread through `actions/cart-actions.ts` and `context/CartContext.tsx`.
- Replace `calculateShipping`/`calculateTaxes`/`getSelectedCountryStates` in `CheckoutClient.tsx` with debounced `updateCustomer` calls, rendering `cart.shipping_rates` and `cart.totals` directly instead of hand-computed values — fixes Bug 4.
- Once nothing in checkout depends on them, delete the `getTaxes`/`getShippingZones` calls from `app/checkout/page.tsx` and remove the now-dead code paths in `actions/data-actions.ts` (`getTaxes`, `getShippingZones`, `getShippingData`).

**Verification:** compare displayed shipping/tax against wp-admin's own calculation for a handful of real addresses per configured shipping zone and tax class, including at least one compound-tax and one coupon scenario.

### Phase 3 — Move order placement onto `/wc/store/v1/checkout` (2-3 days, highest risk — stage carefully)
- Replace the `wc/v3/orders` POST in `actions/order-actions.ts::createOrder` with the Store API's own `POST /checkout`, which creates the order from the actual server-side cart instead of a client-reconstructed `lineItems`/`shipping_lines`/`coupon_lines`/`cart_tax` payload — fixes Bug 6.
- Keep the existing Stripe PaymentIntent step immediately after order creation (Phase 1's webhook remains the source of truth for marking it paid).

**Verification:** run both COD and Stripe orders through staging end-to-end, diff resulting WooCommerce order line items/totals/tax lines against what Phase 2's checkout UI displayed, confirm coupon and shipping-line data still attaches correctly.

### Phase 4 — Dynamic payment methods & locale-aware required fields (1-2 days)
- Add `getPaymentGateways()` to `actions/data-actions.ts` (cached ~5 min, since admins toggle gateways more often than shipping zones) hitting `GET /wc/v3/payment_gateways`, filtered to `enabled: true`.
- Render the payment radio list in `CheckoutClient.tsx` from that data instead of the hardcoded COD/Stripe pair (still only implement UI for gateways the frontend has JS for — COD/Stripe today — but ordering/enabled state becomes live).
- Use the locale info already present in the `data/countries` response (already fetched via `getCountries`) to make `state`/`postcode` conditionally required per country in the zod schema, instead of always required.

**Verification:** disable/reorder a gateway in wp-admin and confirm the checkout UI reflects it without a redeploy; test a country whose WooCommerce locale doesn't require a state field.

### Phase 5 — Hardening
- Idempotency key passed through to `createOrder`/Stripe PaymentIntent creation so retries can't create duplicate orders — fixes Bug 7.
- Replace bare `console.log`/`console.error` in the checkout/order/payment action files with whatever structured logging the team standardizes on.
- Consider basic rate limiting on checkout submission if not already covered upstream.

---

## 5. Sequencing notes

- Phase 0 and Phase 1 are independent of each other and of everything else — safe to land in either order, immediately.
- Phase 2 must land before Phase 3 (Phase 3's Store API checkout call assumes the cart already carries correct shipping/tax via `update-customer`/`select-shipping-rate`).
- Phase 4 has no hard dependency on Phases 2-3 and could be pulled forward if dynamic payment methods are a higher near-term priority than the shipping/tax rework.

---

## 6. Dev testing

### Local setup

1. **Env vars** — `.env` needs `STRIPE_SECRET_KEY` (`sk_test_...`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`). **Double-check the prefixes are on the right variable** — these were found swapped once already during this work (the real secret key ends up shipped into the public client bundle if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` holds an `sk_...` value). `sk_` always means secret, `pk_` always means publishable, no exceptions.
2. **Webhook secret** — run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, copy the printed `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET`, then (re)start the dev server so it picks up the new value. `stripe listen` must stay running for the whole test session; each new `stripe listen` invocation prints a new secret, so re-copy it if you restart the listener.
3. **Account match** — the Stripe CLI must be logged in (`stripe login`) to the **same** Stripe account as `.env`'s `STRIPE_SECRET_KEY`. Check with `stripe config --list` (`account_id`, `test_mode_api_key`) against the account the secret key actually belongs to. If they're different accounts, `stripe listen` will never see events from PaymentIntents your app creates — signature verification will still work against synthetic `stripe trigger` events, but a real order will never get its webhook.
4. **WooCommerce API key permissions** — `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` must have **write** access (WooCommerce → Settings → Advanced → REST API, key permission level "Read/Write"). A read-only key lets every GET-based feature work fine (countries, gateways, product data) while silently breaking `createOrder`/`checkoutOrder` — the failure only shows up when someone actually tries to place an order, so verify this explicitly rather than trusting that the rest of the site working means checkout will too.

### Test flow — COD

- Add an item, fill in an address inside a configured shipping zone, select Cash on Delivery, place the order.
- Confirm in wp-admin: order was created via `POST /wc/store/v1/checkout` (Phase 3), line items/shipping/tax match what the cart showed.

### Test flow — Stripe

- Same, but select Credit/Debit Card and pay with a Stripe test card (`4242 4242 4242 4242`, any future expiry, any CVC).
- Confirm the order does **not** flip to paid the instant `confirmPayment()` resolves — it should show "Confirming Order..." briefly (the poll in `StripeCheckoutForm`) and only become `processing`/paid in wp-admin once the webhook fires. If `stripe listen` isn't running or is pointed at the wrong account (see above), the order will sit `pending` indefinitely — that's the expected failure mode for that misconfiguration, not a code bug.
- To sanity-check the fraud-vector fix (Bug 2): `updateOrderStatus` is no longer imported by any client component, so there's no Server Action reference the browser can call to write order status directly anymore.

### Scripted webhook-mechanics check (no real order needed)

`stripe trigger payment_intent.succeeded` against a running `stripe listen` session exercises signature verification and event routing without a real order. Expect a `200` and a logged `no woocommerce_order_id metadata` line — the fixture event has no metadata tying it to a WooCommerce order, so that's the correct, non-failing outcome for this specific check. It does **not** substitute for the full COD/Stripe test flows above.

---

## 7. Moving to production

- **Register a real webhook endpoint** in the Stripe Dashboard (Developers → Webhooks) pointing at `https://<production-domain>/api/webhooks/stripe`, subscribed to at least `payment_intent.succeeded` and `payment_intent.payment_failed`. Copy **that** endpoint's signing secret into the production environment as `STRIPE_WEBHOOK_SECRET` — it is a different value from whatever `stripe listen` printed locally; each endpoint/listener has its own secret.
- **Swap in live keys** (`sk_live_...` / `pk_live_...`) and re-verify they're on the correct variables — a swapped live secret key is a materially worse version of the bug found during dev testing (a real, unrestricted Stripe secret key shipped to every visitor's browser).
- **Confirm write permission** on the production `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` — same silent-failure shape as dev if it's read-only.
- **Runtime** — `app/api/webhooks/stripe/route.ts` declares `export const runtime = 'nodejs'` (the Stripe SDK's signature verification needs Node's `crypto`). Confirm the hosting platform isn't forcing this route onto an Edge runtime.
- **Watch COD orders after deploy** — Phase 3 moved COD order creation from the admin API to `POST /wc/store/v1/checkout`, a genuine behavior change on that path. Place (and verify in wp-admin) one real COD order shortly after the production deploy, even though it was already verified against the live WooCommerce site during dev testing.
- **Watch for "cart changed" errors after deploy** — the Stripe path's live-cart re-validation (added as part of Phase 3's revised scope) throws a user-facing error if the server cart doesn't match the client snapshot at submit time. Keep an eye on logs/error reports for the first while in case it fires more than expected under real traffic patterns (e.g. multiple tabs), which would point at the diff logic being too strict rather than an actual stale-cart case.
- **Native Stripe Blocks/UPE integration remains out of scope** — the research done for Phase 3 (see the plan's "revised scope" note) found the WooCommerce Stripe Gateway plugin's own payment flow needs backend (WordPress-side) nonce-bridging work to be reachable from this headless frontend. That's a separate initiative, not part of this deploy.
