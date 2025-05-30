"use client"

import { LineItem, createOrder } from "@/actions/order-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCart } from "@/hooks/use-cart"
import { FormValues, OrderData, checkoutFormSchema } from "@/lib/validation"
import { CountryData, Customer, ShippingMethodData, ShippingZoneData, StateData, TaxtData } from "@/types/woocommerce"
import { zodResolver } from "@hookform/resolvers/zod"
import { debounce } from "lodash"
import { Banknote } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense, use, useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

interface CheckoutFormProps {
    countries: CountryData[]
    taxes: TaxtData[]
    shippingZones: ShippingZoneData[];
    customer?: Customer;
}

export function CheckoutForm({ countries, taxes, shippingZones, customer }: CheckoutFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [formSuccess, setFormSuccess] = useState<string | null>(null)
    const [states, setStates] = useState<StateData[] | null>(null)
    const { items, clearCart, appliedCoupon, setSelectedTaxes, selectedTaxes, cartTotal, setShipping, shipping } = useCart()
    const [shippingMethod, setShippingMethod] = useState<ShippingMethodData | null>(null)
    const router = useRouter();
    const [isLoadingShipping, setIsLoadingShipping] = useState(false);
    const countryOptions = countries.map((country) => ({
        code: country.code,
        name: country.name,
    }))



    const form = useForm<FormValues>({
        resolver: zodResolver(checkoutFormSchema),
        defaultValues: {
            delivery: {
                first_name: customer?.billing.first_name || "",
                last_name: customer?.billing.last_name || "",
                address_1: customer?.billing.address_1 || "",
                city: customer?.billing.city || "",
                state: "",
                country: "",
                postcode: customer?.billing.postcode || "",
                email: customer?.billing.email || "",
                phone: customer?.billing.phone || "",
            },
            terms: false,
            couponCode: "",
        },
    })

    // Reset shipping and taxes on unmount
    useEffect(() => {
        return () => {
            setShipping(null);
            setSelectedTaxes([]);
        };
    }, [setShipping, setSelectedTaxes]);

    // useEffect(() => {
    //     // Set initial states based on selected country
    //     const initialCountry = form.getValues('delivery.country');
    //     if (initialCountry) {
    //         const selectedCountry = countries.find((country) => country.code === initialCountry);
    //         setStates(selectedCountry?.states || []);
    //         const selectedTax = taxes.find((tax) => tax.country === initialCountry);
    //         setSelectedTaxes(selectedTax ? [selectedTax] : []);
    //     }
    // })


    // Debounced calculateShipping
    const calculateShipping = useCallback(
        debounce(async (countryCode: string, stateCode: string) => {
            if (!countryCode || !stateCode) return;
            setIsLoadingShipping(true);

            try {
                // Find matching zone
                const matchingZone = shippingZones.find((zone) =>
                    zone.locations.some((loc) => {
                        if (loc.type === 'country' && loc.code === countryCode) return true;
                        if (loc.type === 'state' && loc.code === `${countryCode}:${stateCode}`) return true;
                        return false;
                    })
                ) || shippingZones.find((zone) => zone.id === 0); // Fallback to zone 0

                if (matchingZone && matchingZone.methods.length > 0) {
                    const shippingMethod = matchingZone.methods[0];
                    const shippingCost = parseFloat(shippingMethod.settings?.cost?.value || shippingMethod.settings?.min_amount?.value || '0');
                    setShippingMethod(shippingMethod);
                    setShipping(shippingCost);
                } else {
                    setShipping(0);
                }
            } catch (error) {
                console.error('Error calculating shipping:', error);
                setShipping(0);
            } finally {
                setIsLoadingShipping(false);
            }
        }, 300),
        [shippingZones, setShipping]
    );

    const handleCountryChange = (countryCode: string) => {
        const selectedCountry = countries.find((country) => country.code === countryCode);
        setStates(selectedCountry?.states || []);
        const selectedTax = taxes.find((tax) => tax.country === countryCode);
        setSelectedTaxes(selectedTax ? [selectedTax] : []);
        // form.setValue('delivery.state', ''); // Reset state when country changes
        // calculateShipping(countryCode, '');
    };

    async function onSubmit(data: FormValues) {
        setIsSubmitting(true)
        setFormError(null)
        setFormSuccess(null)

        try {
            // Create the order object
            const orderData: OrderData = {
                billing: data.delivery,
                shipping: data.delivery, // Same address for billing and shipping
                payment_method: "cod",
            }

            const lineItems: LineItem[] = items.map((item) => {
                return {
                    product_id: item.id,
                    // name: item.name,
                    // price: item.price,
                    // subtotal: item.price * item.quantity,
                    quantity: item.quantity,
                    variation_id: item.variation_id,
                }
            })

            const cart_tax = selectedTaxes.reduce((total, tax) => total + parseFloat(tax.rate) * cartTotal / 100, 0)
            const shipping_lines = []
            if (shippingMethod) {
                shipping_lines.push({
                    total: shipping?.toString() || "0",
                    method_id: shippingMethod.method_id,
                    method_title: shippingMethod.method_title,
                })
            }

            // Submit the order
            const result = await createOrder({
                orderData,
                lineItems,
                shipping_lines: shipping_lines,
                cart_tax: cart_tax || 0,
                coupon_lines: appliedCoupon ? [{ code: appliedCoupon }] : [],
            })

            if (result.success) {
                setFormSuccess(
                    "Order placed successfully! Your order will be delivered to your address with cash on delivery option.",
                )
                clearCart()
                toast.success(`Order placed successfully!`)
                router.push(`/checkout/success/${result.order?.id}`);
            } else {
                toast.error(`Failed to place order: ${result.error}`)
            }
        } catch (e) {
            setFormError(`Failed to place order: ${e}`)
        }
        finally {
            setIsSubmitting(false)
        }
    }


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 overflow-hidden">
                <div>
                    <h3 className="text-lg font-medium mb-4">Delivery Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="delivery.first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="delivery.last_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="delivery.address_1"
                        render={({ field }) => (
                            <FormItem className="mt-4">
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="123 Main St" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                            control={form.control}
                            name="delivery.country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            handleCountryChange(value);
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="overflow-hidden">
                                                <SelectValue placeholder="Select a country" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <Suspense fallback={<div>Loading countries...</div>}>
                                                {countryOptions.map((country) => (
                                                    <SelectItem key={country.code} value={country.code}>
                                                        {country.name}
                                                    </SelectItem>
                                                ))}
                                            </Suspense>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="delivery.state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>District/State</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            calculateShipping(form.getValues('delivery.country'), value);
                                        }}
                                        defaultValue={field.value}
                                    // disabled={!states || states.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="overflow-hidden">
                                                <SelectValue placeholder={isLoadingShipping ? 'Loading...' : 'Select a district/state'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {states?.map((state) => (
                                                <SelectItem key={state.code} value={state.code}>
                                                    {state.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                            control={form.control}
                            name="delivery.city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter the City or Area" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="delivery.postcode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Postal Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="1016" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                            control={form.control}
                            name="delivery.email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="delivery.phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(123) 456-7890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex items-center p-4 bg-muted/50 rounded-lg">
                    <Banknote className="h-5 w-5 mr-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        This order will be delivered with Cash on Delivery payment option.
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>I agree to the terms and conditions</FormLabel>
                                <FormDescription>
                                    By checking this box, you agree to our{' '}
                                    <a href="#" className="text-primary underline">
                                        Terms of Service
                                    </a>{' '}
                                    and{' '}
                                    <a href="#" className="text-primary underline">
                                        Privacy Policy
                                    </a>
                                    .
                                </FormDescription>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />

                {formError && <div className="bg-destructive/15 text-destructive p-3 rounded-md">{formError}</div>}

                {formSuccess && <div className="bg-green-100 text-green-800 p-3 rounded-md">{formSuccess}</div>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'Place Order (Cash on Delivery)'}
                </Button>
            </form>
        </Form>
    );
}

// return (
//     <Form {...form}>
//         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 overflow-hidden">
//             <div>
//                 <h3 className="text-lg font-medium mb-4">Delivery Information</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <FormField
//                         control={form.control}
//                         name="delivery.first_name"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>First Name</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder="John" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                     <FormField
//                         control={form.control}
//                         name="delivery.last_name"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>Last Name</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder="Doe" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                 </div>

//                 <FormField
//                     control={form.control}
//                     name="delivery.address_1"
//                     render={({ field }) => (
//                         <FormItem className="mt-4">
//                             <FormLabel>Address</FormLabel>
//                             <FormControl>
//                                 <Input placeholder="123 Main St" {...field} />
//                             </FormControl>
//                             <FormMessage />
//                         </FormItem>
//                     )}
//                 />
//                 <div className="grid grid-cols-1 md:grid-cols-2">

//                     <FormField
//                         control={form.control}
//                         name="delivery.country"
//                         render={({ field }) => (
//                             <FormItem className="mt-4 overflow-hidden">
//                                 <FormLabel>Country</FormLabel>
//                                 <Select
//                                     onValueChange={(value) => {
//                                         field.onChange(value);
//                                         handleCountryChange(value);
//                                     }}
//                                     defaultValue={field.value}
//                                 >
//                                     <FormControl>
//                                         <SelectTrigger className="overflow-hidden">
//                                             <SelectValue placeholder="Select a country" />
//                                         </SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         <Suspense fallback={<div>Loading countries...</div>}>
//                                             {countries ? countries.map((country) => (
//                                                 <SelectItem key={country.code} value={country.code}>
//                                                     {country.name}
//                                                 </SelectItem>
//                                             )) : "Loading countries..."}
//                                         </Suspense>
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />

//                     <FormField
//                         control={form.control}
//                         name="delivery.state"
//                         render={({ field }) => (
//                             <FormItem className="items-center mt-4">
//                                 <FormLabel>District/State</FormLabel>
//                                 <Select
//                                     onValueChange={(value) => {
//                                         field.onChange(value)
//                                         calculateShipping(value)
//                                     }}
//                                     defaultValue={field.value}
//                                 >
//                                     <FormControl>
//                                         <SelectTrigger className="overflow-hidden">
//                                             <SelectValue placeholder="Select a district/State" />
//                                         </SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         {states && states.map((state) => (
//                                             <SelectItem key={state.code} value={state.code}>
//                                                 {state.name}
//                                             </SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 justify-between">
//                     <FormField
//                         control={form.control}
//                         name="delivery.city"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>City</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder="Enter the City or Area" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />

//                     <FormField
//                         control={form.control}
//                         name="delivery.postcode"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>Postal Code</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder="1016" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                 </div>




//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                     <FormField
//                         control={form.control}
//                         name="delivery.email"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>Email</FormLabel>
//                                 <FormControl>
//                                     <Input type="email" placeholder="john.doe@example.com" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                     <FormField
//                         control={form.control}
//                         name="delivery.phone"
//                         render={({ field }) => (
//                             <FormItem>
//                                 <FormLabel>Phone</FormLabel>
//                                 <FormControl>
//                                     <Input placeholder="(123) 456-7890" {...field} />
//                                 </FormControl>
//                                 <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                 </div>
//             </div>

//             <div className="flex items-center p-4 bg-muted/50 rounded-lg">
//                 <Banknote className="h-5 w-5 mr-2 text-muted-foreground" />
//                 <p className="text-sm text-muted-foreground">
//                     This order will be delivered with Cash on Delivery payment option.
//                 </p>
//             </div>

//             <FormField
//                 control={form.control}
//                 name="terms"
//                 render={({ field }) => (
//                     <FormItem className="flex flex-row items-start space-x-3 space-y-0">
//                         <FormControl>
//                             <Checkbox checked={field.value} onCheckedChange={field.onChange} />
//                         </FormControl>
//                         <div className="space-y-1 leading-none">
//                             <FormLabel>I agree to the terms and conditions</FormLabel>
//                             <FormDescription>
//                                 By checking this box, you agree to our{" "}
//                                 <a href="#" className="text-primary underline">
//                                     Terms of Service
//                                 </a>{" "}
//                                 and{" "}
//                                 <a href="#" className="text-primary underline">
//                                     Privacy Policy
//                                 </a>
//                                 .
//                             </FormDescription>
//                             <FormMessage />
//                         </div>
//                     </FormItem>
//                 )}
//             />

//             {formError && <div className="bg-destructive/15 text-destructive p-3 rounded-md">{formError}</div>}

//             {formSuccess && <div className="bg-green-100 text-green-800 p-3 rounded-md">{formSuccess}</div>}

//             <Button type="submit" className="w-full" disabled={isSubmitting}>
//                 {isSubmitting ? "Processing..." : "Place Order (Cash on Delivery)"}
//             </Button>
//         </form>
//     </Form>
// )