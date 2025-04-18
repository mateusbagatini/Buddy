"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"
import { loadDismissedMessages, isMessageDismissed } from "@/lib/message-utils"

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const { t } = useLanguage()
  const supabase = createClientComponentClient()

  // Load dismissed messages from localStorage on component mount
  useEffect(() => {
    loadDismissedMessages()
  }, [])

  // Load user role and notifications
  useEffect(() => {
    if (!userId) return

    const loadUserAndNotifications = async () => {
      // Get user role
      const { data: userData, error: userError } = await supabase.from("users").select("role").eq("id", userId).single()

      if (userError) {
        console.error("Error getting user role:", userError)
      } else if (userData) {
        setUserRole(userData.role)
      }

      // Load notifications - only message type
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "message") // Only get message notifications
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Error loading notifications:", error)
        return
      }

      // Filter out dismissed notifications
      const filteredNotifications = data?.filter((n) => !isMessageDismissed(n.id)) || []
      setNotifications(filteredNotifications)
      setUnreadCount(filteredNotifications?.filter((n) => !n.read).length || 0)
    }

    loadUserAndNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId} AND type=eq.message`, // Only subscribe to message notifications
        },
        (payload) => {
          // Check if the notification is already dismissed
          if (!isMessageDismissed(payload.new.id)) {
            setNotifications((prev) => [payload.new, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId} AND type=eq.message`, // Only subscribe to message notifications
        },
        (payload) => {
          // Check if the notification is already dismissed
          if (!isMessageDismissed(payload.new.id)) {
            setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))

            // Recalculate unread count
            setUnreadCount(
              notifications.filter((n) => n.id !== payload.new.id && !n.read).length + (payload.new.read ? 0 : 1),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (notifications.length === 0 || unreadCount === 0) return

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)
        .eq("type", "message") // Only update message notifications

      if (error) {
        console.error("Error marking notifications as read:", error)
        return
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    try {
      // Mark this notification as read
      if (!notification.read) {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notification.id)

        if (error) {
          console.error("Error marking notification as read:", error)
        } else {
          setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
          setUnreadCount((prev) => prev - 1)
        }
      }

      // Navigate to the task
      // Determine the correct path based on user role
      const path =
        userRole === "admin"
          ? `/admin/action-flows/${notification.flow_id}?section=${notification.section_id}&task=${notification.task_id}`
          : `/user/action-flows/${notification.flow_id}?section=${notification.section_id}&task=${notification.task_id}`

      setIsOpen(false)
      router.push(path)
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t("notification.justNow")
    if (diffMins < 60) return `${diffMins} ${t("notification.minutesAgo")}`
    if (diffHours < 24) return `${diffHours} ${t("notification.hoursAgo")}`
    if (diffDays < 7) return `${diffDays} ${t("notification.daysAgo")}`

    return date.toLocaleDateString()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-medium">{t("notification.notifications")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              {t("notification.markAllAsRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${!notification.read ? "bg-blue-50" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">{notification.sender_name}</p>
                    <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">{t("notification.noNotifications")}</div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
