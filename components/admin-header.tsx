"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/contexts/language-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function AdminHeader() {
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        // Get user profile to get the name
        const { data: profile } = await supabase.from("users").select("name").eq("id", authUser.id).single()

        setUser({
          ...authUser,
          name: profile?.name || authUser.email,
        })
      }
    }
    getUser()
  }, [supabase])

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <Link href="/admin/dashboard" className="flex items-center">
            <Image src="/logo.svg" alt="TaskFlow Logo" width={100} height={35} className="my-6 mx-4" />
          </Link>
          <nav className="ml-8 hidden md:flex items-center space-x-6">
            <Link href="/admin/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
              Dashboard
            </Link>
            <Link href="/admin/users" className="text-sm font-medium transition-colors hover:text-primary">
              Users
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline-block">{user.name}</span>
            </div>
          )}
          <Link href="/">
            <Button variant="outline" size="sm">
              {t("common.logout")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
