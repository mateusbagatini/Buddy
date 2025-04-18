"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { NotificationBadge } from "@/components/notification-badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"

type Notification = {
  id: string
  flowId: string
  sectionId: string
  taskId: string
  taskTitle: string
  flowTitle: string
  deadline?: string
  assignedTo?: string
}

type NotificationAccordionProps = {
  title: string
  icon: React.ReactNode
  notifications: Notification[]
  type: "message" | "deadline"
  onDismiss: (id: string) => void
  onDismissAll: () => void
}

export function NotificationAccordion({
  title,
  icon,
  notifications,
  type,
  onDismiss,
  onDismissAll,
}: NotificationAccordionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { t } = useLanguage()
  const router = useRouter()

  if (notifications.length === 0) {
    return null
  }

  const handleNotificationClick = (notification: Notification) => {
    // Determine the correct path based on user role
    const path = `/user/action-flows/${notification.flowId}?section=${notification.sectionId}&task=${notification.taskId}`
    router.push(path)
  }

  return (
    <div className="mb-4 border rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between p-3 cursor-pointer ${
          type === "message" ? "bg-blue-100" : "bg-red-100"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium">
            {title} <span className="ml-1 text-sm">({notifications.length})</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {type === "message" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onDismissAll()
              }}
            >
              <X className="h-3 w-3 mr-1" />
              {t("notification.dismissAll")}
            </Button>
          )}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3">
          {notifications.map((notification) => (
            <div key={notification.id} onClick={() => handleNotificationClick(notification)} className="cursor-pointer">
              <NotificationBadge
                type={type}
                title={`${notification.flowTitle}`}
                taskTitle={
                  notification.assignedTo
                    ? `${notification.taskTitle} (${t("common.assignedTo")}: ${notification.assignedTo})`
                    : notification.taskTitle
                }
                deadline={notification.deadline}
                onDismiss={type === "message" ? () => onDismiss(notification.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
