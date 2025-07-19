import { getCustomerInfo } from '@/actions/customer-action';
import { User } from '@/actions/auth-actions';
import { cookies } from 'next/headers';
import React from 'react'
import { getCountries, getTaxes, getShippingZones } from '@/actions/data-actions'
import CheckoutClient from '@/components/Checkout/CheckoutClient'
import Footer from '../../components/Footer/Footer'

interface CouponData {
    id: string
    code: string
    discount: number
    minValue: number
    description: string
    isValid: boolean
}


interface CheckoutPageProps {
    searchParams: { appliedCoupon?: string }
}

const Checkout = async ({ searchParams }: CheckoutPageProps) => {
    const { appliedCoupon } = await searchParams;

    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    const tokenCookie = cookieStore.get('jwt_token')
    let customer = null;

    if (userCookie && tokenCookie) {
        try {
            const user: User = JSON.parse(userCookie.value);
            if (user && user.user_id) {
                const customerData = await getCustomerInfo(user.user_id);
                if (customerData.success) {
                    customer = customerData.data;
                }
            }
        } catch (error) {
            console.error('Failed to parse user cookie or fetch customer data', error);
        }
    }

    // Fetch all required data server-side
    const [countriesData, taxesData, shippingZones] = await Promise.all([
        getCountries(),
        getTaxes(),
        getShippingZones(),

    ])

    // Extract shipping methods from zones (for backward compatibility)
    const shippingData = shippingZones.flatMap(zone => zone.methods || [])

    return (
        <>
            <CheckoutClient
                countriesData={countriesData}
                taxesData={taxesData}
                shippingData={shippingData}
                shippingZones={shippingZones}
                appliedCouponProp={appliedCoupon || ''}
                shippingAddress={customer?.shipping}
            />
            <Footer />
        </>
    )
}


export const metadata = {
    title: 'Checkout - Complete Your Order',
    description: 'Complete your purchase securely with our checkout process. Review your order, enter shipping and payment details.',
    keywords: 'checkout, order, payment, shipping, purchase, cart',
    robots: 'noindex, nofollow'
}

export default Checkout