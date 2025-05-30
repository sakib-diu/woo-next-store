import { formatDate } from "@/lib/utils"
import { Customer, Order } from "@/types/woocommerce"
import { Eye } from "lucide-react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { recentOrders } from "./profile-page"

interface DashboardProps {
    orders?: Order[],
    customer: Customer,
    setActiveSection: (activeSection: string) => void
}


export default function Dashboard({ orders, customer, setActiveSection }: DashboardProps) {

    // Calculate totalSpent and totalOrders from orders
    const totalSpent = orders?.reduce((acc, order) => acc + parseFloat(order.total), 0) || 0
    const totalOrders = orders?.length || 0
    const customerName = customer.first_name || customer.last_name ? `${customer.first_name} ${customer.last_name}` : customer.username || "Customer"

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-muted-foreground">Welcome back, {customerName}!</p>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl text-green-500 font-bold">${totalSpent}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDate(customer.date_created)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Your last 3 orders</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Mobile-friendly order cards */}
                    <div className="block md:hidden space-y-4">
                        {orders?.slice(0, 3).map((order) => (
                            <Card key={order.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">#{order.id}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(order.date_created)}</p>
                                    </div>
                                    <Badge
                                        variant={
                                            order.status.toLowerCase() === "completed"
                                                ? "default"
                                                : order.status.toLowerCase() === "cancelled"
                                                    ? "destructive"
                                                    : "secondary"
                                        }
                                    >
                                        {order.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total: ${order.total}</span>
                                    {/* <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4" />
                                    </Button> */}
                                </div>
                            </Card>
                        ))}
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setActiveSection("orders")}>View All</Button>
                        </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders?.slice(0, 3).map((order) => (
                                    <TableRow key={order.number}>
                                        <TableCell className="font-medium">#{order.id}</TableCell>
                                        <TableCell>{formatDate(order.date_created)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    order.status.toLowerCase() === "completed"
                                                        ? "default"
                                                        : order.status.toLowerCase() === "cancelled"
                                                            ? "destructive"
                                                            : "secondary"
                                                }
                                            >
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>${order.total}</TableCell>
                                        {/* <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell> */}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setActiveSection("orders")}>View All</Button>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    )
}