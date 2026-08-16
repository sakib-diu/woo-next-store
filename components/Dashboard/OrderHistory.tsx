'use client'

import React, { useState } from 'react'
import { OrderType } from '@/types/order-type'
import { formatDistanceToNow } from 'date-fns'
import { useAppData } from '../../context/AppDataContext'
import Link from 'next/link'

interface OrderHistoryProps {
    orders: OrderType[]
    customerId: number
}

const OrderHistory = ({ orders, customerId }: OrderHistoryProps) => {
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
    const { currentCurrency } = useAppData()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-800 bg-green-200'
            case 'processing':
                return 'text-blue-600 bg-blue-100'
            case 'on-hold':
                return 'text-yellow-600 bg-yellow-100'
            case 'cancelled':
                return 'text-red-600 bg-red-100'
            case 'refunded':
                return 'text-gray-600 bg-gray-100'
            case 'failed':
                return 'text-red-600 bg-red-100'
            default:
                return 'text-gray-600 bg-gray-100'
        }
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return 'Invalid Date'
        }
    }

    const formatPrice = (price: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentCurrency?.code,
        }).format(parseFloat(price))
    }

    if (orders.length === 0) {
        return (
            <div className="order-history-block">
                <div className="heading5">Order History</div>
                <div className="mt-7">
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <div className="text-6xl text-gray-300 mb-4">📦</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                        <p className="text-gray-500 mb-6">You haven&apos;t placed any orders yet.</p>
                        <Link
                            href="/shop"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors"
                        >
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="order-history-block">
            <div className="heading5">Order History</div>
            <div className="mt-7">
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="border border-gray-200 rounded-lg bg-white shadow-sm"
                        >
                            <div className="p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Order #{order.number}</p>
                                            <p className="font-medium text-gray-900">{formatDate(order.date_created)}</p>
                                        </div>
                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Total</p>
                                            <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                                        </div>
                                        <button
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>
                                </div>

                                {expandedOrder === order.id && (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Order Items */}
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                                                <div className="space-y-3">
                                                    {order.line_items?.map((item, index) => (
                                                        <div key={index} className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-900 ml-4">
                                                                {formatPrice(item.total ?? '0')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Shipping Address */}
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-3">Shipping Address</h4>
                                                <div className="text-sm text-gray-600">
                                                    <p>{order.shipping?.first_name} {order.shipping?.last_name}</p>
                                                    <p>{order.shipping?.address_1}</p>
                                                    {order.shipping?.address_2 && <p>{order.shipping.address_2}</p>}
                                                    <p>{order.shipping?.city}, {order.shipping?.state} {order.shipping?.postcode}</p>
                                                    <p>{order.shipping?.country}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Summary */}
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="flex justify-end">
                                                <div className="w-full max-w-xs space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Subtotal:</span>
                                                        <span className="text-gray-900">{formatPrice(order.total)}</span>
                                                    </div>
                                                    {order.shipping_total && parseFloat(order.shipping_total) > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">Shipping:</span>
                                                            <span className="text-gray-900">{formatPrice(order.shipping_total)}</span>
                                                        </div>
                                                    )}
                                                    {order.total_tax && parseFloat(order.total_tax) > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">Tax:</span>
                                                            <span className="text-gray-900">{formatPrice(order.total_tax)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-base font-medium border-t pt-2">
                                                        <span className="text-gray-900">Total:</span>
                                                        <span className="text-gray-900">{formatPrice(order.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default OrderHistory
