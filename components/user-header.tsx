"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/contexts/language-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notification-bell"

export function UserHeader({ user, onSignOut }) {
  const { t } = useLanguage()

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
          <Link href="/user/dashboard" className="flex items-center">
            <Image src="/logo.svg" alt="TaskFlow Logo" width={100} height={35} className="my-6 mx-4" />
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline-block">{user?.name || "User"}</span>
            </div>
          )}
          <NotificationBell userId={user?.id} />
          <Button variant="outline" size="sm" onClick={onSignOut}>
            {t("common.logout")}
          </Button>
        </div>
      </div>
    </header>
  )
}
