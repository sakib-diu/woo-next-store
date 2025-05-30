import { formatDate } from "@/lib/utils";
import { Order } from "@/types/woocommerce";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { allOrders } from "./profile-page";

interface OrdersProps {
    orders?: Order[],
}

export function Orders({ orders }: OrdersProps) {

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Orders</h2>
                <p className="text-muted-foreground">View and manage your order history</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Mobile-friendly order cards */}
                    <div className="block md:hidden space-y-4">
                        {orders?.map((order) => (
                            <Card key={order.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">{order.id}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(order.date_created)}</p>
                                        <p className="text-sm text-muted-foreground">{order.line_items.reduce((total, item) => total = total + item.quantity, 0)} items</p>
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
                                    <span className="font-medium">{order.total}</span>
                                    {/* <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4" />
                                    </Button> */}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders?.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">#{order.number}</TableCell>
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
                                        <TableCell>{order.line_items.reduce((total, item) => total = total + item.quantity, 0)} items</TableCell>
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
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}