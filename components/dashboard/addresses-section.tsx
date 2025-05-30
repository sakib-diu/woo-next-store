// import { CountryData, Customer } from "@/types/woocommerce"
// import { Edit, Plus, Trash2 } from "lucide-react"
// import { Badge } from "../ui/badge"
// import { Button } from "../ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
// import { addresses } from "./profile-page"

// interface AddressesProps {
//     billing?: Customer["billing"]
//     shipping?: Customer["shipping"]
//     countries: CountryData[]
// }

// export function Addresses({ billing, shipping, countries }: AddressesProps) {

//     const addressesArray = [billing, shipping]
//     const countryOptions = countries || []

//     return (
//         <div className="space-y-6">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                 <div>
//                     <h2 className="text-2xl font-bold">Addresses</h2>
//                     <p className="text-muted-foreground">Manage your shipping and billing addresses</p>
//                 </div>
//                 <Button className="w-full sm:w-auto">
//                     <Plus className="h-4 w-4 mr-2" />
//                     Add Address
//                 </Button>
//             </div>

//             <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
//                 {addresses.map((address) => (
//                     <Card key={address.id} className="flex justify-between">
//                         <CardHeader>
//                             <div className="flex items-start justify-between">
//                                 <div className="flex-1">
//                                     <CardTitle className="text-lg">{address.type} Address</CardTitle>
//                                     {address.isDefault && (
//                                         <Badge variant="secondary" className="w-fit mt-2">
//                                             Default
//                                         </Badge>
//                                     )}
//                                 </div>
//                                 <div className="flex gap-2 ml-2">
//                                     <Button variant="ghost" size="sm">
//                                         <Edit className="h-4 w-4" />
//                                     </Button>
//                                     <Button variant="ghost" size="sm">
//                                         <Trash2 className="h-4 w-4" />
//                                     </Button>
//                                 </div>
//                             </div>
//                         </CardHeader>
//                         <CardContent>
//                             <div className="space-y-1">
//                                 <p className="font-medium">{address.name}</p>
//                                 <p className="text-sm text-muted-foreground">{address.address}</p>
//                                 <p className="text-sm text-muted-foreground">{address.city}</p>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 ))}
//             </div>
//         </div>
//     )
// }



// components/store/addresses.tsx
'use client';

import { updateCustomerAddress } from '@/actions/customer-action';
import { useAuth } from '@/hooks/use-auth';
import { AddressFormValues, addressSchema } from '@/lib/validation';
import { CountryData, Customer, StateData } from '@/types/woocommerce';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

interface AddressesProps {
    billing?: Customer['billing'];
    shipping?: Customer['shipping'];
    countries: CountryData[];
}

export function Addresses({ billing, shipping, countries }: AddressesProps) {
    const [isSubmittingBilling, setIsSubmittingBilling] = useState(false);
    const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
    const [billingStates, setBillingStates] = useState<StateData[]>([]);
    const [shippingStates, setShippingStates] = useState<StateData[]>([]);
    const { user } = useAuth()

    useEffect(() => {
        // Initialize billing states if billing address is present
        if (billing?.country) {
            const country = countries.find((c) => c.code === billing.country);
            setBillingStates(country?.states || []);
        }

        // Initialize shipping states if shipping address is present
        if (shipping?.country) {
            const country = countries.find((c) => c.code === shipping.country);
            setShippingStates(country?.states || []);
        }
    })

    // Billing Form
    const billingForm = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            first_name: billing?.first_name || '',
            last_name: billing?.last_name || '',
            address_1: billing?.address_1 || '',
            address_2: billing?.address_2 || '',
            city: billing?.city || '',
            state: billing?.state || '',
            postcode: billing?.postcode || '',
            country: billing?.country || '',
            email: billing?.email || '',
            phone: billing?.phone || '',
        },
    });

    // Shipping Form
    const shippingForm = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            first_name: shipping?.first_name || '',
            last_name: shipping?.last_name || '',
            address_1: shipping?.address_1 || '',
            address_2: shipping?.address_2 || '',
            city: shipping?.city || '',
            state: shipping?.state || '',
            postcode: shipping?.postcode || '',
            country: shipping?.country || '',
        },
    });

    const handleCountryChange = (countryCode: string, type: 'billing' | 'shipping') => {
        const country = countries.find((c) => c.code === countryCode);
        const states = country?.states || [];
        if (type === 'billing') {
            setBillingStates(states);
            billingForm.setValue('state', '');
        } else {
            setShippingStates(states);
            shippingForm.setValue('state', '');
        }
    };

    const onSubmit = async (data: AddressFormValues, type: 'billing' | 'shipping') => {
        const setIsSubmitting = type === 'billing' ? setIsSubmittingBilling : setIsSubmittingShipping;
        const form = type === 'billing' ? billingForm : shippingForm;

        setIsSubmitting(true);
        try {
            // Validate state if country has states
            const country = countries.find((c) => c.code === data.country);
            if (country?.states.length && !data.state) {
                form.setError('state', { message: 'State is required' });
                setIsSubmitting(false);
                return;
            }

            const result = await updateCustomerAddress(user?.user_id!, type, data); // Replace 1 with actual customer ID
            if (result.success) {
                toast.success(result.message);
                form.reset(data); // Keep form in sync
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = async (type: 'billing' | 'shipping') => {
        const setIsSubmitting = type === 'billing' ? setIsSubmittingBilling : setIsSubmittingShipping;
        const form = type === 'billing' ? billingForm : shippingForm;

        setIsSubmitting(true);
        try {
            const emptyAddress: AddressFormValues = {
                first_name: '',
                last_name: '',
                address_1: '',
                address_2: '',
                city: '',
                state: '',
                postcode: '',
                country: '',
                email: '',
                phone: '',
            };
            const result = await updateCustomerAddress(user?.user_id!, type, emptyAddress); // Replace 1 with customer ID
            if (result.success) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} address cleared`);
                form.reset(emptyAddress);
                if (type === 'billing') setBillingStates([]);
                else setShippingStates([]);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Addresses</h2>
                <p className="text-muted-foreground">Manage your shipping and billing addresses</p>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Billing Address Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Billing Address</CardTitle>
                        <CardDescription>Update your billing address</CardDescription>
                        <Badge variant="secondary" className="w-fit">
                            Default
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...billingForm}>
                            <form
                                onSubmit={billingForm.handleSubmit((data) => onSubmit(data, 'billing'))}
                                className="space-y-4"
                            >
                                <FormField
                                    control={billingForm.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input id="billing-first_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input id="billing-last_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="address_1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address Line 1</FormLabel>
                                            <FormControl>
                                                <Input id="billing-address_1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="address_2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address Line 2</FormLabel>
                                            <FormControl>
                                                <Input id="billing-address_2" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input id="billing-city" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    handleCountryChange(value, 'billing');
                                                }}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map((country) => (
                                                        <SelectItem key={country.code} value={country.code}>
                                                            {country.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={!billingStates.length}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a state" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {billingStates.map((state) => (
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
                                <FormField
                                    control={billingForm.control}
                                    name="postcode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Postcode</FormLabel>
                                            <FormControl>
                                                <Input id="billing-postcode" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input id="billing-email" type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={billingForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input id="billing-phone" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        className="w-full sm:w-auto"
                                        disabled={isSubmittingBilling}
                                    >
                                        {isSubmittingBilling ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleClear('billing')}
                                        disabled={isSubmittingBilling}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear Address
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Shipping Address Card */}
                <Card className='max-h-fit'>
                    <CardHeader>
                        <CardTitle>Shipping Address</CardTitle>
                        <CardDescription>Update your shipping address</CardDescription>
                        <Badge variant="secondary" className="w-fit">
                            Default
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...shippingForm}>
                            <form
                                onSubmit={shippingForm.handleSubmit((data) => onSubmit(data, 'shipping'))}
                                className="space-y-4"
                            >
                                <FormField
                                    control={shippingForm.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-first_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-last_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="address_1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address Line 1</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-address_1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="address_2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address Line 2</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-address_2" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-city" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    handleCountryChange(value, 'shipping');
                                                }}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map((country) => (
                                                        <SelectItem key={country.code} value={country.code}>
                                                            {country.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={shippingForm.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={!shippingStates.length}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a state" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {shippingStates.map((state) => (
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
                                <FormField
                                    control={shippingForm.control}
                                    name="postcode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Postcode</FormLabel>
                                            <FormControl>
                                                <Input id="shipping-postcode" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        className="w-full sm:w-auto"
                                        disabled={isSubmittingShipping}
                                    >
                                        {isSubmittingShipping ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleClear('shipping')}
                                        disabled={isSubmittingShipping}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear Address
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}