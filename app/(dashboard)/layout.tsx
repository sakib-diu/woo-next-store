import { CartSheet } from "@/components/store/cart-sheet"
import Footer from "@/components/store/Fotter"
import { Navbar } from "@/components/store/Navbar"
// import Loading from "./loading"

export default function MainLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            <main className="flex flex-col min-h-screen w-full">
                <div className="flex-1 pt-16">
                    {children}
                </div>
            </main>

            <CartSheet />
        </>
    )
}