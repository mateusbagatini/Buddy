"use client"

import { AlertCircle, Clock, MessageCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type NotificationBadgeProps = {
  type: "message" | "deadline"
  title: string
  taskTitle: string
  deadline?: string
  className?: string
  onDismiss?: () => void
}

export function NotificationBadge({ type, title, taskTitle, deadline, className, onDismiss }: NotificationBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between w-full p-3 mb-2 rounded-lg border",
        type === "message" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-red-50 border-red-200 text-red-800",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {type === "message" ? (
          <MessageCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        )}
        <div className="overflow-hidden">
          <p className="font-medium truncate">{title}</p>
          <p className="text-sm truncate">{taskTitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {type === "deadline" && deadline && (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{deadline}</span>
          </div>
        )}
        {type === "message" && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  )
}
