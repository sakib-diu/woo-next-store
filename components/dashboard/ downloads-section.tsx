import { DownloadData } from "@/types/woocommerce";
import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dummydownloads } from "./profile-page";


interface DownloadsProps {
    downloads?: DownloadData[]
}

export function Downloads({ downloads }: DownloadsProps) {

    if (downloads === undefined || downloads.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Downloads</h2>
                    <p className="text-muted-foreground">Access your downloadable files</p>
                </div>

                <div className="text-center p-6 flex flex-col items-center justify-center min-h-max">
                    <p className="text-muted-foreground">You have no downloadable files at this time.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Downloads</h2>
                <p className="text-muted-foreground">Access your downloadable files</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Mobile-friendly download cards */}
                    <div className="block md:hidden space-y-4">
                        {Dummydownloads.map((download, index) => (
                            <Card key={index} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{download.name}</p>
                                        <p className="text-sm text-muted-foreground">{download.date}</p>
                                        <p className="text-sm text-muted-foreground">{download.size}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Downloads Remaining</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {downloads?.map((download, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{download.file.name}</TableCell>
                                        <TableCell>{download.access_expires}</TableCell>
                                        <TableCell>{download.downloads_remaining}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
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