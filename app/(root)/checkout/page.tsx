// app/checkout/page.tsx
import { getCustomerInfo } from "@/actions/customer-action";
import { getCountries, getShippingZones, getTaxes } from "@/actions/data-actions";
import { CheckoutForm } from "@/components/store/checkout-form";
import OrderSummary from "@/components/store/order-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer } from "@/types/woocommerce";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";


export const metadata: Metadata = {
    title: "Checkout - Store with WP",
    description: "Complete your order with our secure checkout process. Pay with Cash on Delivery and review your order summary.",
};

export default async function CheckoutPage() {
    const storedUser = (await cookies()).get("user")?.value
    const userId = storedUser ? (JSON.parse(storedUser).user_id || 0) : 0;

    const [countries, taxes, shippingZones, customerData] = await Promise.all([
        getCountries(),
        getTaxes(),
        getShippingZones(),
        getCustomerInfo(userId) // New: Fetch shipping zones
    ]);
    const customer = customerData.data;

    return (
        <div className="container mx-auto py-10">
            <div className="grid gap-8 md:grid-cols-2">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Checkout</CardTitle>
                            <CardDescription>Complete your order with Cash on Delivery</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<div>Loading checkout form...</div>}>
                                <CheckoutForm countries={countries} taxes={taxes} shippingZones={shippingZones} customer={customer!} />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <OrderSummary />
                </div>
            </div>
        </div>
    );
}