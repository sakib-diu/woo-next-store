'use client'
import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { isValidPostcodeForCountry } from '@/lib/validations/postcode';
import { useAppData } from '@/context/AppDataContext';
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn, decodeHtmlEntities, fromMinorUnit } from '@/lib/utils';
import type { StoreApiAddress } from '@/lib/store-api-client';
import type { PaymentGatewayDataType } from '@/actions/data-actions';
import { CountryDataType, StateDataType } from '@/types/data-type';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { createOrder } from '../../actions/order-actions';
import { createPaymentIntent } from '../../actions/stripePaymentIntentActions';
import { checkoutOrder, fetchCart } from '../../actions/cart-actions';
import { OrderData } from '../../lib/validations/validation';
import { LineItem } from '../../types/order-type';
import { PATH } from '../../constant/pathConstants';
import StripeCheckout from './StripeCheckoutForm';


// State is only required when the selected country actually has WooCommerce-defined states —
// there's no REST-exposed WooCommerce locale rule to check against, so this is the best
// data-grounded approximation (and it also fixes the prior bug where a country with zero
// defined states could never pass validation at all).
//
// Phone and postcode format are both validated against the selected `country` (in superRefine,
// since they're cross-field), mirroring the same rules WooCommerce's Store API enforces
// server-side — catching a mismatched format here instead of a round trip to /checkout that
// comes back as a generic "Invalid parameter(s)" error.
function buildCheckoutSchema(countriesData: CountryDataType[]) {
    return z.object({
        email: z.string().email({ message: "A valid email is required." }),
        emailOffers: z.boolean().optional(),
        phone: z.string().min(1, { message: "Phone number is required." }),
        country: z.string().min(1, { message: "Country is required." }),
        firstName: z.string().min(1, { message: "Last name is required." }),
        lastName: z.string().min(1, { message: "Last name is required." }),
        address: z.string().min(1, { message: "Address is required." }),
        apartment: z.string().optional(),
        city: z.string().min(1, { message: "City is required." }),
        state: z.string().optional(),
        zipcode: z.string().min(1, { message: "ZIP code is required." }),
        paymentMethod: z.enum(["cod", "stripe"]),
        useShippingAsBilling: z.boolean(),
        customerNote: z.string().max(1000, { message: "Note is too long." }).optional(),
    }).superRefine((data, ctx) => {
        const country = countriesData.find(c => c.code === data.country);
        const requiresState = !!country && Object.keys(country.states || {}).length > 0;
        if (requiresState && !data.state) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required.", path: ["state"] });
        }

        if (data.country && data.phone && !isValidPhoneNumber(data.phone, data.country as CountryCode)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid phone number for the selected country.", path: ["phone"] });
        }

        if (data.country && data.zipcode && !isValidPostcodeForCountry(data.zipcode, data.country)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid ZIP/postal code for the selected country.", path: ["zipcode"] });
        }
    });
}

type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>;

import { Address } from '@/types/customer-type';
import { STOREINFO } from '../../constant/storeConstants';

interface CheckoutClientProps {
    countriesData: CountryDataType[];
    paymentGateways: PaymentGatewayDataType[];
    shippingAddress?: Address | null;
}

const CheckoutClient: React.FC<CheckoutClientProps> = ({
    countriesData,
    paymentGateways,
    shippingAddress
}) => {
    const { openModalCart } = useModalCartContext()
    const { currentCurrency } = useAppData()
    const {
        cart,
        isLoading,
        clearCart,
        applyCoupon,
        removeCoupon,
        isMutating,
        itemLabels,
        updateCustomerAddress,
        selectShippingRate,
    } = useCart();
    const [totalCart, setTotalCart] = useState<number>(0)
    const [selectedCountry, setSelectedCountry] = useState<string>('')
    const [selectedState, setSelectedState] = useState<string>('')
    const [couponCode, setCouponCode] = useState<string>('')
    const [couponError, setCouponError] = useState<string>('')
    const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentOrderId, setPaymentIntentOrderId] = useState<number | null>(null)
    const router = useRouter();
    // Defense-in-depth against a double-fire beyond the `isSubmitting` disable (e.g. a rapid
    // double-click racing React's state batching) — true order-creation idempotency across
    // retried requests would need backend support, out of scope here.
    const submissionLockRef = useRef(false);

    const checkoutSchema = useMemo(() => buildCheckoutSchema(countriesData), [countriesData]);

    const defaultPaymentMethod: CheckoutFormValues['paymentMethod'] =
        paymentGateways[0]?.id === 'stripe' ? 'stripe' : 'cod';

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        // You can set default values here if needed
        defaultValues: {
            email: '',
            phone: '',
            country: '',
            lastName: '',
            address: '',
            city: '',
            state: '',
            zipcode: '',
            paymentMethod: defaultPaymentMethod,
            useShippingAsBilling: true,
            customerNote: '',
        }
    });

    // Watch form fields to sync with your existing state and logic
    const watchedCountry = watch("country");
    const watchedState = watch("state");
    const watchedCity = watch("city");
    const watchedZipcode = watch("zipcode");

    useEffect(() => {
        setSelectedCountry(watchedCountry || '');
        setSelectedState(watchedState || '');
    }, [watchedCountry, watchedState]);

    // A state code left over from a previously selected country can be invalid for the newly
    // selected one (WooCommerce's server-side validation rejects it, failing checkout with a
    // generic "Invalid parameter(s)" error) — clear it whenever it no longer belongs to the
    // current country's state list.
    const prevCountryRef = useRef<string>('');
    useEffect(() => {
        if (prevCountryRef.current && prevCountryRef.current !== watchedCountry) {
            const country = countriesData.find(c => c.code === watchedCountry);
            const validStateCodes = Object.keys(country?.states || {});
            if (watchedState && !validStateCodes.includes(watchedState)) {
                setValue('state', '');
            }
        }
        prevCountryRef.current = watchedCountry || '';
    }, [watchedCountry, watchedState, countriesData, setValue]);

    const debouncedCountry = useDebounce(selectedCountry, 500);
    const debouncedState = useDebounce(selectedState, 500);
    const debouncedCity = useDebounce(watchedCity, 500);
    const debouncedZipcode = useDebounce(watchedZipcode, 500);

    // Push the (debounced) shipping address to WooCommerce's own cart so it recomputes real
    // shipping_rates/totals — this is what fixes Bug 4/5: nothing here is computed client-side.
    useEffect(() => {
        if (!debouncedCountry) return;
        updateCustomerAddress({
            country: debouncedCountry,
            state: debouncedState,
            city: debouncedCity,
            postcode: debouncedZipcode,
        });
    }, [debouncedCountry, debouncedState, debouncedCity, debouncedZipcode, updateCustomerAddress]);

    const calculateCartTotal = useCallback(() => {
        return fromMinorUnit(cart.totals.total_items, cart.totals.currency_minor_unit)
    }, [cart.totals])

    // Effect for cart total calculation
    useEffect(() => {
        setTotalCart(calculateCartTotal())
    }, [calculateCartTotal])

    const handleCouponApply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!couponCode) return

        setCouponError('')
        setIsApplyingCoupon(true)
        const result = await applyCoupon(couponCode)
        setIsApplyingCoupon(false)

        if (result.success) {
            setCouponCode('')
        } else {
            setCouponError(result.error || 'Invalid coupon code')
        }
    }

    const handleCouponRemove = async () => {
        if (cart.coupons.length === 0) return
        setCouponError('')
        await removeCoupon(cart.coupons[0].code)
    }

    // WooCommerce's Store API already computes the discount server-side per applied coupon.
    const calculateDiscountAmount = useCallback(() => {
        return fromMinorUnit(cart.totals.total_discount, cart.totals.currency_minor_unit)
    }, [cart.totals])

    const shippingRateOptions = useMemo(
        () =>
            cart.shipping_rates.flatMap((pkg) =>
                pkg.shipping_rates.map((rate) => ({ ...rate, package_id: pkg.package_id }))
            ),
        [cart.shipping_rates]
    );

    const getSelectedCountryStates = () => {
        const country = countriesData.find(c => c.code === selectedCountry)
        const states = country?.states || {} as StateDataType[]
        return Object.entries(states).map(([index, state]) => ({
            code: state.code,
            name: state.name
        }))
    }

    const buildAddressPayload = (formData: CheckoutFormValues): { billing: StoreApiAddress; shipping: StoreApiAddress } => {
        const billing: StoreApiAddress = {
            first_name: formData.firstName || '',
            last_name: formData.lastName,
            address_1: formData.address,
            address_2: formData.apartment || '',
            city: formData.city,
            state: formData.state || '',
            postcode: formData.zipcode,
            country: formData.country,
            email: formData.email,
            phone: formData.phone,
        };
        const shipping: StoreApiAddress = {
            first_name: formData.firstName || '',
            last_name: formData.lastName,
            address_1: formData.address,
            address_2: formData.apartment || '',
            city: formData.city,
            state: formData.state || '',
            postcode: formData.zipcode,
            country: formData.country,
        };
        return { billing, shipping };
    };

    const onSubmit = async (formData: CheckoutFormValues) => {
        if (submissionLockRef.current) return;
        submissionLockRef.current = true;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const { billing, shipping } = buildAddressPayload(formData);

            if (formData.paymentMethod === 'cod') {
                // COD goes straight through the Store API's own /checkout — the order is built
                // from the actual server-side cart, not a client-reconstructed line-item list.
                const result = await checkoutOrder({
                    billing_address: billing,
                    shipping_address: shipping,
                    payment_method: 'cod',
                    customer_note: formData.customerNote || '',
                });

                if (!result.ok) {
                    throw new Error(result.error || 'An unknown error occurred while placing your order.');
                }

                router.push(`${PATH.THANKYOU}?orderId=${result.orderId}`);
                return;
            }

            // Stripe keeps creating the order via the admin API (see implementation plan for why
            // Store API checkout isn't safe for this gateway yet), but re-validates against the
            // live server cart immediately before doing so, since the client-held `cart` snapshot
            // could be stale by the time of submit (another tab, a race with a mutation).
            const liveCartResult = await fetchCart();
            if (!liveCartResult.ok) {
                throw new Error(liveCartResult.error);
            }
            const liveItems = liveCartResult.cart.items;
            const cartChanged =
                liveItems.length !== cart.items.length ||
                liveItems.some((liveItem) => {
                    const match = cart.items.find((item) => item.key === liveItem.key);
                    return !match || match.quantity !== liveItem.quantity;
                });
            if (cartChanged) {
                throw new Error('Your cart changed since this page loaded. Please review your cart and try again.');
            }

            const orderPayload: OrderData = {
                payment_method: formData.paymentMethod,
                payment_method_title: 'Stripe',
                billing: {
                    first_name: formData.firstName || '',
                    last_name: formData.lastName,
                    address_1: formData.address,
                    address_2: formData.apartment || '',
                    city: formData.city,
                    state: formData.state || '',
                    postcode: formData.zipcode,
                    country: formData.country,
                    email: formData.email,
                    phone: formData.phone,
                },
                shipping: {
                    email: formData.email,
                    phone: formData.phone,
                    first_name: formData.firstName || '',
                    last_name: formData.lastName,
                    address_1: formData.address,
                    address_2: formData.apartment || '',
                    city: formData.city,
                    state: formData.state || '',
                    postcode: formData.zipcode,
                    country: formData.country,
                },
                customer_note: formData.customerNote || '',
            };

            // No price/total sent here — WooCommerce computes authoritative pricing itself
            // from product_id/variation_id, closing the gap where the client used to dictate price.
            const lineItems: LineItem[] = liveItems.map(item => ({
                product_id: item.type === 'variation' ? undefined : item.id,
                variation_id: item.type === 'variation' ? item.id : undefined,
                quantity: item.quantity,
                name: item.name,
                meta_data: [
                    {
                        id: 0,
                        key: 'product_image',
                        value: item.images[0]?.src || ''
                    },
                    ...(item.variation.length > 0 ? item.variation : itemLabels[item.key] || []).map((attr, i) => ({
                        id: i + 1,
                        key: attr.attribute,
                        value: attr.value,
                    })),
                ]
            }));

            const selectedRate = shippingRateOptions.find(rate => rate.selected);
            const shippingLines = selectedRate ? [{
                method_id: selectedRate.method_id,
                method_title: selectedRate.name,
                total: fromMinorUnit(selectedRate.price, selectedRate.currency_minor_unit).toFixed(2),
            }] : [];

            const result = await createOrder({
                orderData: orderPayload,
                lineItems,
                cart_tax: fromMinorUnit(cart.totals.total_tax, cart.totals.currency_minor_unit),
                shipping_lines: shippingLines,
                coupon_lines: cart.coupons.map(c => ({ code: c.code })),
            });

            if (!result.success || !result.order) {
                throw new Error(result.error || "An unknown error occurred while creating the order.");
            }

            const stripeResponse = await createPaymentIntent(result.order.id)
            if (!stripeResponse || !stripeResponse.clientSecret) {
                throw new Error(stripeResponse?.error || 'Failed to start payment.');
            }
            setClientSecret(stripeResponse.clientSecret);
            setPaymentIntentOrderId(stripeResponse.orderId ?? result.order.id)
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
            submissionLockRef.current = false;
        }
    };

    // This replaces the old render-time `redirect()`, which could fire on a cold load before the
    // client cart had ever actually been fetched (Bug 1) — gated on `isLoading` and pushed into
    // an effect instead of a render-time side effect. The `clientSecret` check keeps it from
    // yanking someone away mid-Stripe-payment if the cart state blips right after checkout.
    const shouldRedirectToCart = !isLoading && cart.items.length === 0 && clientSecret === null;

    useEffect(() => {
        if (shouldRedirectToCart) {
            router.replace(PATH.CART);
        }
    }, [shouldRedirectToCart, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Icon.CircleNotchIcon className="animate-spin" size={32} />
            </div>
        );
    }

    if (shouldRedirectToCart) {
        return null;
    }


    return (
        <>
            <div id="header" className='relative w-full'>
                <div className={`header-menu style-one fixed top-0 left-0 right-0 w-full md:h-[74px] h-[56px]`}>
                    <div className="container mx-auto h-full">
                        <div className="header-main flex items-center justify-between h-full">
                            <Link href={'/'} className='flex items-center'>
                                <div className="heading4">{STOREINFO.name}</div>
                            </Link>
                            <button className="max-md:hidden cart-icon flex items-center relative h-fit cursor-pointer" onClick={openModalCart}>
                                <Icon.HandbagIcon size={24} color='black' />
                                <span className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">{cart.items.length}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="checkout-block relative md:pt-[74px] pt-[56px] mb-10">
                <div className="content-main flex max-lg:flex-col-reverse justify-between">
                    <div className="left flex lg:justify-end w-full">
                        <div className="lg:max-w-[716px] flex-shrink-0 w-full lg:pt-20 pt-12 lg:pr-[70px] pl-[16px] max-lg:pr-[16px]">
                            {clientSecret !== null ? (
                                <StripeCheckout clientSecret={clientSecret} orderId={paymentIntentOrderId!} />
                            )
                                :
                                (
                                    <form onSubmit={handleSubmit(onSubmit)} className="form-checkout">
                                        <div className="mt-8">
                                            <label htmlFor="customerNote" className="block mb-2 font-medium">Order Notes (optional)</label>
                                            <textarea
                                                id="customerNote"
                                                className={`border-line px-4 py-3 w-full rounded-lg min-h-[80px] ${errors.customerNote ? 'border-red' : ''}`}
                                                placeholder="Notes about your order, e.g. special instructions for delivery."
                                                {...register("customerNote")}
                                            />
                                            {errors.customerNote && <p className="text-red text-sm mt-1">{errors.customerNote.message}</p>}
                                        </div>
                                        <div className="login flex justify-between gap-4">
                                            <h4 className="heading4">Contact</h4>
                                            {shippingAddress ? (
                                                <button
                                                    type="button"
                                                    className="text-button underline"
                                                    onClick={() => {
                                                        setValue('country', shippingAddress.country || '');
                                                        setValue('firstName', shippingAddress.first_name || '');
                                                        setValue('lastName', shippingAddress.last_name || '');
                                                        setValue('address', shippingAddress.address_1 || '');
                                                        setValue('apartment', shippingAddress.address_2 || '');
                                                        setValue('city', shippingAddress.city || '');
                                                        setValue('state', shippingAddress.state || '');
                                                        setValue('zipcode', shippingAddress.postcode || '');
                                                    }}
                                                >
                                                    Fill with saved address
                                                </button>
                                            ) : (
                                                <Link href={"/login"} className="text-button underline">Login here</Link>
                                            )}
                                        </div>
                                        <div>
                                            <input type="email" className={`border-line mt-5 px-4 py-3 w-full rounded-lg ${errors.email ? 'border-red' : ''}`} placeholder="you@example.com" {...register("email")} />
                                            {errors.email && <p className="text-red text-sm mt-1">{errors.email.message}</p>}

                                            <div className="flex items-center mt-5">
                                                <div className="block-input">
                                                    <input type="checkbox" id="emailOffers" {...register("emailOffers")} />
                                                    <Icon.CheckSquareIcon weight='fill' className="icon-checkbox text-2xl" />
                                                </div>
                                                <label htmlFor="emailOffers" className="pl-2 cursor-pointer">Email me with news and offers</label>
                                            </div>

                                            <input type="tel" className={`border-line mt-5 px-4 py-3 w-full rounded-lg ${errors.phone ? 'border-red' : ''}`} placeholder="+1 (201) 555-0123" {...register("phone")} />
                                            {errors.phone && <p className="text-red text-sm mt-1">{errors.phone.message}</p>}
                                        </div>

                                        <div className="information md:mt-10 mt-6">
                                            <div className="heading5">Delivery</div>
                                            <div className="form-checkout mt-5">
                                                <div className="grid sm:grid-cols-2 gap-4 gap-y-5 flex-wrap">
                                                    <div className="col-span-full select-block">
                                                        <select className={`border px-4 py-3 w-full rounded-lg ${errors.country ? 'border-red' : 'border-line'}`} {...register("country")}>
                                                            <option value="">Choose Country/Region</option>
                                                            {countriesData.map((country) => (
                                                                <option key={country.code} value={country.code}>{country.name}</option>
                                                            ))}
                                                        </select>
                                                        <Icon.CaretDownIcon className="arrow-down" />
                                                        {errors.country && <p className="text-red text-sm mt-1">{errors.country.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.lastName ? 'border-red' : ''}`} placeholder="John" {...register("firstName")} />
                                                        {errors.firstName && <p className="text-red text-sm mt-1">{errors.firstName.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.lastName ? 'border-red' : ''}`} placeholder="Doe" {...register("lastName")} />
                                                        {errors.lastName && <p className="text-red text-sm mt-1">{errors.lastName.message}</p>}
                                                    </div>

                                                    <div className="col-span-full">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.address ? 'border-red' : ''}`} placeholder="123 Main St" {...register("address")} />
                                                        {errors.address && <p className="text-red text-sm mt-1">{errors.address.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className="border-line px-4 py-3 w-full rounded-lg" placeholder="Apt 4B (optional)" {...register("apartment")} />
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.city ? 'border-red' : ''}`} placeholder="New York" {...register("city")} />
                                                        {errors.city && <p className="text-red text-sm mt-1">{errors.city.message}</p>}
                                                    </div>

                                                    <div className="select-block">
                                                        <select className={`border px-4 py-3 w-full rounded-lg ${errors.state ? 'border-red' : 'border-line'}`} disabled={!selectedCountry} {...register("state")}>
                                                            <option value="">State</option>
                                                            {getSelectedCountryStates().map((state) => (
                                                                <option key={state.code} value={state.code}>{state.name}</option>
                                                            ))}
                                                        </select>
                                                        <Icon.CaretDown className="arrow-down align-middle" />
                                                        {errors.state && <p className="text-red text-sm mt-1">{errors.state.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.zipcode ? 'border-red' : ''}`} placeholder="10001" {...register("zipcode")} />
                                                        {errors.zipcode && <p className="text-red text-sm mt-1">{errors.zipcode.message}</p>}
                                                    </div>
                                                </div>

                                                <h4 className="heading4 md:mt-10 mt-6">Shipping method</h4>
                                                <div className="shipping-methods mt-5">
                                                    {selectedCountry ? (
                                                        shippingRateOptions.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {shippingRateOptions.map((rate) => (
                                                                    <div key={rate.rate_id} className="flex items-center justify-between p-4 border border-line rounded-lg">
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="radio"
                                                                                name="shipping_method"
                                                                                id={`shipping_${rate.rate_id}`}
                                                                                value={rate.rate_id}
                                                                                checked={rate.selected}
                                                                                onChange={() => selectShippingRate(rate.package_id, rate.rate_id)}
                                                                            />
                                                                            <label htmlFor={`shipping_${rate.rate_id}`} className="cursor-pointer">
                                                                                {rate.name}
                                                                            </label>
                                                                        </div>
                                                                        <span className="text-title">
                                                                            {fromMinorUnit(rate.price, rate.currency_minor_unit) === 0 ? (
                                                                                'Free'
                                                                            ) : (
                                                                                <>
                                                                                    {decodeHtmlEntities(currentCurrency?.symbol || '$')}
                                                                                    {fromMinorUnit(rate.price, rate.currency_minor_unit).toFixed(2)}
                                                                                </>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="body1 text-secondary2 py-6 px-5 border border-line rounded-lg bg-surface">
                                                                No shipping methods available for this location
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="body1 text-secondary2 py-6 px-5 border border-line rounded-lg bg-surface">
                                                            Enter your shipping address to view available shipping methods
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="payment-block md:mt-10 mt-6">
                                                    <h4 className="heading4">Payment</h4>
                                                    <p className="body1 text-secondary2 mt-3">All transactions are secure and encrypted.</p>
                                                    <div className="list-payment mt-5">
                                                        <div className="payment-methods">
                                                            {paymentGateways.length === 0 ? (
                                                                <div className="body1 text-secondary2 py-4 px-5 border border-line rounded-lg bg-surface">
                                                                    No payment methods are currently available. Please contact support.
                                                                </div>
                                                            ) : (
                                                                paymentGateways.map((gateway, idx) => (
                                                                    <div
                                                                        key={gateway.id}
                                                                        className={cn(
                                                                            "item flex items-center gap-2 relative px-5 border border-line",
                                                                            idx === 0 ? "rounded-t-lg" : "",
                                                                            idx === paymentGateways.length - 1 ? "rounded-b-lg" : ""
                                                                        )}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            value={gateway.id}
                                                                            className="cursor-pointer"
                                                                            {...register("paymentMethod")}
                                                                        />
                                                                        <label className="w-full py-4 cursor-pointer">{decodeHtmlEntities(gateway.title) || gateway.title}</label>
                                                                        {gateway.id === 'cod' ? (
                                                                            <Icon.TruckIcon className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                                                                        ) : (
                                                                            <Icon.CreditCardIcon className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="block-button md:mt-10 mt-6">
                                                    <button type="submit"
                                                        className={cn("button-main w-full bg-black",
                                                            isSubmitting ? 'cursor-not-allowed opacity-50' : '',
                                                            watch("paymentMethod") === 'cod' ? 'bg-primary havor:bg-primary/90' : 'bg-primary hover:bg-primary/90'
                                                        )}
                                                        disabled={isSubmitting || paymentGateways.length === 0}
                                                    >
                                                        {isSubmitting ? 'Processing...' : watch("paymentMethod") === 'cod' ? 'Place Order' : 'Pay Now'}
                                                    </button>
                                                    {submitError && <p className="text-red text-center text-sm mt-2">{submitError}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                        </div>
                    </div>
                    <div className="right justify-start flex-shrink-0 lg:w-[47%] bg-surface lg:py-20 py-12">
                        <div className="lg:sticky lg:top-24 h-fit lg:max-w-[606px] w-full flex-shrink-0 lg:pl-[80px] pr-[16px] max-lg:pl-[16px]">
                            <div className="list_prd flex flex-col gap-7">
                                {cart.items.map((item) => {
                                    const itemMinorUnit = item.prices.currency_minor_unit
                                    const onSale = item.prices.sale_price !== item.prices.regular_price
                                    return (
                                        <div key={item.key} className="item flex items-center justify-between gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="bg_img relative flex-shrink-0 w-[100px] h-[100px]">
                                                    <Image
                                                        src={item.images[0]?.src || "/images/product/1000x1000.png"}
                                                        fill={true}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                    <span className="quantity flex items-center justify-center absolute -top-3 -right-3 w-7 h-7 rounded-full bg-black text-white">
                                                        {item.quantity}
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong className="name text-title">{decodeHtmlEntities(item.name)}</strong>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Icon.Tag className="text-secondary" />
                                                        <span className="code text-secondary">
                                                            {item.sku || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {onSale && (
                                                    <del className="caption1 text-secondary text-end org_price">
                                                        {decodeHtmlEntities(currentCurrency?.symbol || '$')}{fromMinorUnit(item.prices.regular_price, itemMinorUnit).toFixed(2)}
                                                    </del>
                                                )}
                                                <strong className="text-title price">
                                                    {decodeHtmlEntities(currentCurrency?.symbol || '$')}{fromMinorUnit(item.prices.price, itemMinorUnit).toFixed(2)}
                                                </strong>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {cart.coupons.length > 0 ? (
                                <div className="applied-coupon flex items-center justify-between mt-8 p-3 bg-green-200 border border-green-600 rounded-lg">
                                    <span className="text-green-700 font-semibold">Coupon &quot;{cart.coupons[0].code}&quot; applied</span>
                                    <button
                                        type="button"
                                        onClick={handleCouponRemove}
                                        disabled={isMutating}
                                        className="text-red hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <form className="form_discount flex gap-3 mt-8" onSubmit={handleCouponApply}>
                                    <input
                                        type="text"
                                        placeholder="Discount code"
                                        className="w-full border border-line rounded-lg px-4"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                    />
                                    <button type="submit" disabled={isApplyingCoupon} className="flex-shrink-0 button-main bg-black">
                                        {isApplyingCoupon ? 'Applying...' : 'Apply'}
                                    </button>
                                </form>
                            )}
                            {couponError && (
                                <div className="coupon-error mt-4 p-3 bg-red/10 border border-red rounded-lg">
                                    <span className="text-red">{couponError}</span>
                                </div>
                            )}
                            <div className="subtotal flex items-center justify-between mt-8">
                                <strong className="heading6">Subtotal</strong>
                                <strong className="heading6">{decodeHtmlEntities(currentCurrency?.symbol || '$')}{totalCart.toFixed(2)}</strong>
                            </div>
                            {cart.coupons.length > 0 && (
                                <div className="discount flex items-center justify-between mt-4">
                                    <strong className="heading6">Discount</strong>
                                    <strong className="heading6 text-green-700">-{decodeHtmlEntities(currentCurrency?.symbol || '$')}{calculateDiscountAmount().toFixed(2)}</strong>
                                </div>
                            )}
                            <div className="ship-block flex items-center justify-between mt-4">
                                <strong className="heading6">Shipping</strong>
                                <span className="body1">
                                    {cart.totals.total_shipping === null ? (
                                        <span className="text-secondary">Enter shipping address</span>
                                    ) : (
                                        <span className='heading6'>
                                            {decodeHtmlEntities(currentCurrency?.symbol || '$')}{fromMinorUnit(cart.totals.total_shipping, cart.totals.currency_minor_unit).toFixed(2)}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {cart.totals.tax_lines.map((tax, idx) => (
                                <div key={`${tax.name}-${idx}`} className="tax-block flex items-center justify-between mt-4">
                                    <strong className="heading6">{tax.name.toUpperCase()}</strong>
                                    <strong className="heading6">{decodeHtmlEntities(currentCurrency?.symbol || '$')}{fromMinorUnit(tax.price, cart.totals.currency_minor_unit).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div className="total-cart-block flex items-center justify-between mt-4">
                                <strong className="heading4">Total</strong>
                                <div className="flex items-end gap-2">
                                    <span className="body1 text-secondary">{currentCurrency?.code || 'USD'}</span>
                                    <strong className="heading4">
                                        {decodeHtmlEntities(currentCurrency?.symbol || '$')}{fromMinorUnit(cart.totals.total_price, cart.totals.currency_minor_unit).toFixed(2)}
                                    </strong>
                                </div>
                            </div>
                            {cart.coupons.length > 0 && (
                                <div className="total-saving-block flex items-center gap-2 mt-4">
                                    <Icon.TagIcon weight='bold' className="text-xl" />
                                    <strong className="heading5">TOTAL SAVINGS</strong>
                                    <strong className="heading5">{decodeHtmlEntities(currentCurrency?.symbol || '$')}{calculateDiscountAmount().toFixed(2)}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default CheckoutClient
