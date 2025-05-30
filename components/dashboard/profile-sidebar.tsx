import { useAuth } from "@/hooks/use-auth"
import { menuItems } from "@/lib/data"
import { Loader2, User } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"

export function ProfileSidebar({
    activeSection,
    setActiveSection,
}: {
    activeSection: string
    setActiveSection: (section: string) => void
}) {
    const [isLoading, setIsLoading] = useState(false)
    const { logout, user } = useAuth()

    const _handleLogout = async () => {
        setIsLoading(true)
        try {
            await logout()
        } catch (error) {
            console.error("Logout failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-medium">{user?.user_display_name}</p>
                        <p className="text-sm text-muted-foreground">My Account</p>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Account</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton onClick={() => setActiveSection(item.id)} isActive={activeSection === item.id}>
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter >
                <Button onClick={_handleLogout}>
                    {isLoading ? (
                        <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                            Logging Out
                        </span>) : <span>Log Out</span>
                    }
                </Button>
            </SidebarFooter>
        </Sidebar>
    )
}
