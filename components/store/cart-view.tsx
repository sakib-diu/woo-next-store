"use client"

import { useCart } from '@/hooks/use-cart'
import { RadioGroup, RadioGroupItem } from '@radix-ui/react-radio-group'
import { Separator } from '@radix-ui/react-select'
import { ShoppingBag, Trash2 } from 'lucide-react'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import QuantityButton from './Quantity-Button'

const CartView = () => {
    const { items, removeItem, updateQuantity, cartTotal, totalItems, shipping } = useCart()
    // console.log(items)
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash")

    // Fixed shipping cost
    const total = cartTotal + shipping!

    useEffect(() => {
        console.log("Cart items updated:", items)
    }, [items])

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-light mb-8">Your Cart</h1>

            {items.length === 0 ? (
                <div className="text-center py-12">
                    <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                    <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added anything to your cart yet.</p>
                    <Button asChild>
                        <Link href="/products">Continue Shopping</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="space-y-4">
                            {items.map((item) => (
                                <Card key={item.id}>
                                    <CardContent className="p-4">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex max-sm:flex-col gap-3 ">
                                                <Link href={`/products/${item.id}`} >
                                                    <Image
                                                        src={item.images?.[0]?.src || "/placeholder.svg?height=100&width=100"}
                                                        alt={item.name}
                                                        width={100}
                                                        height={100}
                                                        className="rounded-md object-cover"
                                                    />
                                                </Link>
                                            </div>
                                            <div className="grid space-y-2 w-full">
                                                <div className='grid grid-cols-4 gap-2'>
                                                    <div className='items-start row-span-2'>
                                                        <Link href={`/products/${item.id}`} >
                                                            <h3 className="font-medium text-lg text-top">{item.name}</h3>
                                                        </Link>
                                                    </div>

                                                    {/* {item.variation_id && */}
                                                    <div className="justify-between text-sm px-3">
                                                        {item.selectedAttributes?.Color && <p className="mt-1 text-sm text-muted-foreground">Color: {item.selectedAttributes.Color}</p>}
                                                        {item.selectedAttributes?.Size && <p className="mt-1 text-sm text-muted-foreground">Size: {item.selectedAttributes.Size}</p>}
                                                    </div>
                                                    {/* } */}


                                                    <div className="flex gap-2 col-span-1">
                                                        <div>
                                                            <QuantityButton id={item.id} quantity={item.quantity} />
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 ml-auto rounded-r-sm"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Remove item</span>
                                                        </Button>
                                                    </div>
                                                    <div className="text-right font-medium ml-10">${Number(item.price * item.quantity).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="flex justify-between mt-6">
                            <Button variant="outline" asChild>
                                <Link href="/products">Continue Shopping</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span>Subtotal ({totalItems} items)</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping & Discount</span>
                                    {/* <span> {shipping !== 0 ? '$' + Number(shipping!).toFixed(2) : "calculate at checkout"} </span> */}
                                    <span>Calculate at checkout</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>

                                <div className="mt-6">
                                    <h3 className="font-medium mb-2">Payment Method: {paymentMethod}</h3>
                                    <RadioGroup
                                        defaultValue="cash"
                                        value={paymentMethod}
                                        onValueChange={(value) => setPaymentMethod(value == "cash" ? "cash" : (value == "online" ? "online" : "cash"))}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center space-x-2 border rounded-md p-3">
                                            <RadioGroupItem value="cash" id="cash" />
                                            <Label htmlFor="cash" className="flex-1 cursor-pointer">
                                                Cash on Delivery
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href="/checkout" className="w-full">
                                    <Button className="w-full" size="lg">
                                        Proceed to Checkout
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CartView