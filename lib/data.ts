import { LayoutDashboard, Package, Download, MapPin, Settings } from "lucide-react"

export const navbarData = [
    { name: "Home", href: "/", isLink: true},
    // { name: "Products", href: "/products", isLink: true},
    { name: "Collections", href: "/products", isLink: false  },
    // { name: "Orders", href: "/Orders", isLink: true },
    { name: "About Us", href: "/about", isLink: true },
]

export const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Orders", icon: Package, id: "orders" },
  { title: "Downloads", icon: Download, id: "downloads" },
  { title: "Addresses", icon: MapPin, id: "addresses" },
  { title: "Account Details", icon: Settings, id: "account" },
]