'use client'
import { isValidPhoneNumber } from "libphonenumber-js";
import { useAppData } from '@/context/AppDataContext';
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn, decodeHtmlEntities, fromMinorUnit } from '@/lib/utils';
import { CountryDataType, ShippingMethodDataType, ShippingZoneDataType, StateDataType, TaxDataType } from '@/types/data-type';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { createOrder } from '../../actions/order-actions';
import { createPaymentIntent } from '../../actions/stripePaymentIntentActions';
import { OrderData } from '../../lib/validations/validation';
import { LineItem } from '../../types/order-type';
import { PATH } from '../../constant/pathConstants';
import StripeCheckout from './StripeCheckoutForm';


// 1. Zod Schema for client-side validation
const checkoutSchema = z.object({
    email: z.string().email({ message: "A valid email is required." }),
    emailOffers: z.boolean().optional(),
    phone: z.string().refine(isValidPhoneNumber, { message: "A valid phone number is required." }),
    country: z.string().min(1, { message: "Country is required." }),
    firstName: z.string().min(1, { message: "Last name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    address: z.string().min(1, { message: "Address is required." }),
    apartment: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    zipcode: z.string().min(1, { message: "ZIP code is required." }),
    paymentMethod: z.enum(["cod", "stripe"]),
    useShippingAsBilling: z.boolean(),
    customerNote: z.string().max(1000, { message: "Note is too long." }).optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

import { Address } from '@/types/customer-type';
import { STOREINFO } from '../../constant/storeConstants';

interface CheckoutClientProps {
    countriesData: CountryDataType[];
    taxesData: TaxDataType[];
    shippingData: ShippingMethodDataType[];
    shippingZones?: ShippingZoneDataType[];
    shippingAddress?: Address | null;
}

const CheckoutClient: React.FC<CheckoutClientProps> = ({
    countriesData,
    taxesData,
    shippingData,
    shippingZones = [],
    shippingAddress
}) => {
    const { openModalCart } = useModalCartContext()
    const { currentCurrency } = useAppData()
    const { cart, clearCart, applyCoupon, removeCoupon, isMutating } = useCart();
    const [totalCart, setTotalCart] = useState<number>(0)
    const [selectedCountry, setSelectedCountry] = useState<string>('')
    const [selectedState, setSelectedState] = useState<string>('')
    const [couponCode, setCouponCode] = useState<string>('')
    const [shippingCost, setShippingCost] = useState<number>(0)
    const [taxAmount, setTaxAmount] = useState<number>(0)
    const [selectedTaxs, setSelectedTaxs] = useState<TaxDataType[]>([])
    const [couponError, setCouponError] = useState<string>('')
    const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false)
    const [availableShippingMethods, setAvailableShippingMethods] = useState<ShippingMethodDataType[]>([])
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentOrderId, setPaymentIntentOrderId] = useState<number | null>(null)
    const router = useRouter();


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
            paymentMethod: 'cod',
            useShippingAsBilling: true,
            customerNote: '',
        }
    });

    // Watch form fields to sync with your existing state and logic
    const watchedCountry = watch("country");
    const watchedState = watch("state");

    useEffect(() => {
        setSelectedCountry(watchedCountry || '');
        setSelectedState(watchedState || '');
    }, [watchedCountry, watchedState]);


    const debouncedCountry = useDebounce(selectedCountry, 500);
    const debouncedState = useDebounce(selectedState, 500);

    // Calculate available shipping methods based on selected location
    const calculateShipping = useCallback((country: string, state: string) => {
        if (!country) {
            setAvailableShippingMethods([])
            setShippingCost(0)
            setSelectedShippingMethod('')
            return
        }

        // Find matching shipping zone
        let matchingZone = null
        let matchingMethods: ShippingMethodDataType[] = []

        // Check if we have shipping zones data, if not use the flat shipping data
        if (shippingZones.length > 0) {
            for (const zone of shippingZones) {
                if (zone.id === 0) continue // Skip "Locations not covered" initially

                const isMatch = zone.locations?.some((location) => {
                    if (location.type === 'country' && location.code === country) {
                        return true // Match country-only zones
                    }
                    if (location.type === 'state' && location.code === `${country}:${state}`) {
                        return true // Match state zones
                    }
                    return false
                })

                if (isMatch) {
                    matchingZone = zone
                    matchingMethods = zone.methods || []
                    break
                }
            }

            // If no matching zone found, use zone 0 (locations not covered)
            if (!matchingZone) {
                const defaultZone = shippingZones.find(zone => zone.id === 0)
                if (defaultZone) {
                    matchingMethods = defaultZone.methods || []
                }
            }
        } else {
            // Fallback to flat shipping data if zones not available
            matchingMethods = shippingData
        }

        // Filter enabled methods
        const enabledMethods = matchingMethods.filter(method => method.enabled)
        setAvailableShippingMethods(enabledMethods)

        // Auto-select first method if available
        if (enabledMethods.length > 0) {
            const firstMethod = enabledMethods[0]
            setSelectedShippingMethod(firstMethod.id.toString())
            setShippingCost(Number(firstMethod.settings.cost?.value || 0))
        } else {
            setSelectedShippingMethod('')
            setShippingCost(0)
        }
    }, [shippingZones, shippingData])


    // Calculate applicable taxes based on selected location
    const calculateTaxes = useCallback((country: string, state: string, subtotal: number) => {
        if (!country || subtotal <= 0) {
            setTaxAmount(0)
            return
        }

        // Find applicable tax rates
        const applicableTaxes = taxesData.filter(tax => {
            // Check country match
            if (tax.country && tax.country !== country) {
                return false
            }

            // Check state match if specified
            // if (tax.state && state && tax.state !== state) {
            //     return false
            // }

            return true
        })

        // Sort by priority (lower number = higher priority)
        applicableTaxes.sort((a, b) => a.priority - b.priority)
        setSelectedTaxs(applicableTaxes)


        let totalTax = 0
        let taxableAmount = subtotal

        // Calculate taxes based on priority and compound settings
        for (const tax of applicableTaxes) {
            const taxRate = parseFloat(tax.rate) / 100
            const currentTax = taxableAmount * taxRate

            totalTax += currentTax

            // If compound tax, add to taxable amount for next calculations
            if (tax.compound) {
                taxableAmount += currentTax
            }
        }

        setTaxAmount(totalTax)
    }, [taxesData])

    const calculateCartTotal = useCallback(() => {
        return fromMinorUnit(cart.totals.total_items, cart.totals.currency_minor_unit)
    }, [cart.totals])

    // Effect for cart total calculation
    useEffect(() => {
        setTotalCart(calculateCartTotal())
    }, [calculateCartTotal])

    // Effect for debounced shipping calculation
    useEffect(() => {
        calculateShipping(debouncedCountry, debouncedState)
    }, [debouncedCountry, debouncedState, calculateShipping])

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCountry(e.target.value)
        setSelectedState('') // Reset state when country changes
    }

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedState(e.target.value)
    }

    const handleShippingMethodChange = (methodId: string, cost: number) => {
        setSelectedShippingMethod(methodId)
        setShippingCost(cost)
    }

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

    const calculateTotalWithDiscountShippingAndTax = useCallback(() => {
        const discount = calculateDiscountAmount()
        return totalCart - discount + shippingCost + taxAmount
    }, [totalCart, calculateDiscountAmount, shippingCost, taxAmount])

    // Effect for tax calculation when location or subtotal changes
    useEffect(() => {
        const discount = calculateDiscountAmount()
        const subtotalAfterDiscount = totalCart - discount
        calculateTaxes(selectedCountry, selectedState, subtotalAfterDiscount)
    }, [selectedCountry, selectedState, totalCart, calculateDiscountAmount, calculateTaxes])

    const getSelectedCountryStates = () => {
        const country = countriesData.find(c => c.code === selectedCountry)
        const states = country?.states || {} as StateDataType[]
        return Object.entries(states).map(([index, state]) => ({
            code: state.code,
            name: state.name
        }))
    }

    const onSubmit = async (formData: CheckoutFormValues) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const temporaryCartItems = [...cart.items];

        // Prepare the data payload for the createOrder server action
        const orderPayload: OrderData = {
            payment_method: formData.paymentMethod,
            payment_method_title: formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Stripe',
            billing: {
                first_name: formData.firstName || '',
                last_name: formData.lastName,
                address_1: formData.address,
                address_2: formData.apartment || '',
                city: formData.city,
                state: formData.state,
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
                state: formData.state,
                postcode: formData.zipcode,
                country: formData.country,
            },
            customer_note: formData.customerNote || '',
        };

        // No price/total sent here — WooCommerce computes authoritative pricing itself
        // from product_id/variation_id, closing the gap where the client used to dictate price.
        const lineItems: LineItem[] = temporaryCartItems.map(item => ({
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
                ...item.variation.map((attr, i) => ({
                    id: i + 1,
                    key: attr.attribute,
                    value: attr.value,
                })),
            ]
        }));

        const shippingLines = selectedShippingMethod ? [{
            method_id: selectedShippingMethod,
            method_title: availableShippingMethods.find(m => m.id.toString() === selectedShippingMethod)?.title || '',
            total: shippingCost.toFixed(2),
        }] : [];

        try {
            // This part is the same for both payment methods
            const result = await createOrder({
                orderData: orderPayload,
                lineItems,
                cart_tax: taxAmount,
                shipping_lines: shippingLines,
                coupon_lines: cart.coupons.map(c => ({ code: c.code })),
            });

            if (result.success && result.order) {
                // --- This is the new conditional logic based on payment method ---
                if (formData.paymentMethod === 'cod') {
                    // For Cash on Delivery, redirect to the thank you page
                    console.log("Order created with COD. Redirecting...");
                    // Redirect to thank you page with orderId
                    router.push(`${PATH.THANKYOU}?orderId=${result.order.id}`);
                } else if (formData.paymentMethod === 'stripe') {
                    // For Stripe, execute your payment processing code here
                    console.log("Order created. Proceeding to Stripe payment...");

                    const stripeResponse = await createPaymentIntent(result.order.id)
                    if (!stripeResponse || !stripeResponse.clientSecret) {
                        console.log("Failed to create Stripe payment intent", stripeResponse.error);
                    } else {
                        setClientSecret(stripeResponse.clientSecret);
                        setPaymentIntentOrderId(stripeResponse.orderId)
                    }

                }
            } else {
                console.error("Error creating order:", result.error);
                throw new Error(result.error || "An unknown error occurred while creating the order.");
            }
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
            console.log("Error creating order:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cart.items.length === 0) {
        redirect('/cart'); // Redirect to cart if no items in cart
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
                                            <input type="email" className={`border-line mt-5 px-4 py-3 w-full rounded-lg ${errors.email ? 'border-red' : ''}`} placeholder="Email" {...register("email")} />
                                            {errors.email && <p className="text-red text-sm mt-1">{errors.email.message}</p>}

                                            <div className="flex items-center mt-5">
                                                <div className="block-input">
                                                    <input type="checkbox" id="emailOffers" {...register("emailOffers")} />
                                                    <Icon.CheckSquareIcon weight='fill' className="icon-checkbox text-2xl" />
                                                </div>
                                                <label htmlFor="emailOffers" className="pl-2 cursor-pointer">Email me with news and offers</label>
                                            </div>

                                            <input type="tel" className={`border-line mt-5 px-4 py-3 w-full rounded-lg ${errors.phone ? 'border-red' : ''}`} placeholder="+880 169 025 XXXX" {...register("phone")} />
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
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.lastName ? 'border-red' : ''}`} placeholder="First Name" {...register("firstName")} />
                                                        {errors.firstName && <p className="text-red text-sm mt-1">{errors.firstName.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.lastName ? 'border-red' : ''}`} placeholder="Last Name" {...register("lastName")} />
                                                        {errors.lastName && <p className="text-red text-sm mt-1">{errors.lastName.message}</p>}
                                                    </div>

                                                    <div className="col-span-full">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.address ? 'border-red' : ''}`} placeholder="Address" {...register("address")} />
                                                        {errors.address && <p className="text-red text-sm mt-1">{errors.address.message}</p>}
                                                    </div>

                                                    <div className="">
                                                        <input className="border-line px-4 py-3 w-full rounded-lg" placeholder="Apartment, suite, etc. (optional)" {...register("apartment")} />
                                                    </div>

                                                    <div className="">
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.city ? 'border-red' : ''}`} placeholder="City" {...register("city")} />
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
                                                        <input className={`border-line px-4 py-3 w-full rounded-lg ${errors.zipcode ? 'border-red' : ''}`} placeholder="Zip Code" {...register("zipcode")} />
                                                        {errors.zipcode && <p className="text-red text-sm mt-1">{errors.zipcode.message}</p>}
                                                    </div>
                                                </div>

                                                <h4 className="heading4 md:mt-10 mt-6">Shipping method</h4>
                                                <div className="shipping-methods mt-5">
                                                    {selectedCountry ? (
                                                        availableShippingMethods.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {availableShippingMethods.map((method) => (
                                                                    <div key={method.id} className="flex items-center justify-between p-4 border border-line rounded-lg">
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="radio"
                                                                                name="shipping_method"
                                                                                id={`shipping_${method.id}`}
                                                                                value={method.id}
                                                                                checked={selectedShippingMethod === method.id.toString()}
                                                                                onChange={() => handleShippingMethodChange(
                                                                                    method.id.toString(),
                                                                                    Number(method.settings.cost?.value || 0)
                                                                                )}
                                                                            />
                                                                            <label htmlFor={`shipping_${method.id}`} className="cursor-pointer">
                                                                                {method.title}
                                                                                {/* {method.method_description && (
                                                                            <p className="text-sm text-secondary mt-1">{method.method_description}</p>
                                                                        )} */}
                                                                            </label>
                                                                        </div>
                                                                        <span className="text-title">
                                                                            {Number(method.settings.cost?.value || 0) === 0 ? (
                                                                                'Free'
                                                                            ) : (
                                                                                <>
                                                                                    {decodeHtmlEntities(currentCurrency?.symbol || '$')}
                                                                                    {Number(method.settings.cost?.value || 0).toFixed(2)}
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
                                                            <div className="item flex items-center gap-2 relative px-5 border border-line rounded-t-lg">
                                                                <input
                                                                    type="radio"
                                                                    value="cod"
                                                                    className="cursor-pointer"
                                                                    {...register("paymentMethod")}
                                                                />
                                                                <label htmlFor="cod_payment" className="w-full py-4 cursor-pointer">Cash on Delivery</label>
                                                                <Icon.TruckIcon className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                                                            </div>
                                                            <div className="item flex items-center gap-2 relative px-5 border border-line rounded-b-lg">
                                                                <input
                                                                    type="radio"
                                                                    value="stripe"
                                                                    className="cursor-pointer"
                                                                    {...register("paymentMethod")}
                                                                />
                                                                <label htmlFor="stripe_payment" className="w-full py-4 cursor-pointer">Credit Card</label>
                                                                <Icon.CreditCardIcon className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="block-button md:mt-10 mt-6">
                                                    <button type="submit"
                                                        className={cn("button-main w-full bg-black",
                                                            isSubmitting ? 'cursor-not-allowed opacity-50' : '',
                                                            watch("paymentMethod") === 'cod' ? 'bg-primary havor:bg-primary/90' : 'bg-primary hover:bg-primary/90'
                                                        )}
                                                        disabled={isSubmitting}
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
                                    {shippingCost === 0 && !taxAmount ? (
                                        <span className="text-secondary">Enter shipping address</span>
                                    ) : (
                                        <span className='heading6'>
                                            {decodeHtmlEntities(currentCurrency?.symbol || '$')}{shippingCost?.toFixed(2)}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {taxAmount > 0 && selectedTaxs.map((tax) => (
                                <div key={tax.id} className="tax-block flex items-center justify-between mt-4">
                                    <strong className="heading6">{tax.name.toUpperCase()}</strong>
                                    <strong className="heading6">{decodeHtmlEntities(currentCurrency?.symbol || '$')}{(Number(tax.rate) / 100 * totalCart).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div className="total-cart-block flex items-center justify-between mt-4">
                                <strong className="heading4">Total</strong>
                                <div className="flex items-end gap-2">
                                    <span className="body1 text-secondary">{currentCurrency?.code || 'USD'}</span>
                                    <strong className="heading4">
                                        {decodeHtmlEntities(currentCurrency?.symbol || '$')}{calculateTotalWithDiscountShippingAndTax().toFixed(2)}
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
