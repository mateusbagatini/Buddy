"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { AdminNotifications } from "@/components/admin-notifications"
import { useLanguage } from "@/contexts/language-context"

export function AdminHeader() {
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const { t, setLanguage, language } = useLanguage()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: `Failed to sign out: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`)
  }

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/admin/dashboard" className="flex items-center">
              <span className="text-xl font-bold">Admin Dashboard</span>
            </Link>
            <nav className="ml-10 flex items-center space-x-4">
              <Link
                href="/admin/dashboard"
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isActive("/admin/dashboard")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                href="/admin/users"
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isActive("/admin/users")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t("nav.users")}
              </Link>
              <Link
                href="/admin/library"
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isActive("/admin/library")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Library
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <AdminNotifications />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              {t("auth.signOut")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
