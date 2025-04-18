"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MessageCircle, Clock } from "lucide-react"
import { NotificationAccordion } from "@/components/notification-accordion"
import { loadDismissedMessages, dismissMessage } from "@/lib/message-utils"
import { useLanguage } from "@/contexts/language-context"
import { v4 as uuidv4 } from "uuid"

type Task = {
  id: string
  title: string
  deadline?: string
  completed?: boolean
  messages?: any[]
}

type Section = {
  id: string
  title: string
  tasks: Task[]
}

type ActionFlow = {
  id: string
  title: string
  user_id?: string
  sections: Section[]
}

type Notification = {
  id: string
  flowId: string
  sectionId: string
  taskId: string
  taskTitle: string
  flowTitle: string
  deadline?: string
  assignedTo?: string
  messageId?: string // Add this to track the specific message
}

export function AdminNotifications({ actionFlows = [], userId = "" }) {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<{
    messages: Notification[]
    deadlines: Notification[]
  }>({
    messages: [],
    deadlines: [],
  })

  const [users, setUsers] = useState<Record<string, string>>({})
  const supabase = createClientComponentClient()

  // Load dismissed messages from localStorage on component mount
  useEffect(() => {
    loadDismissedMessages()
  }, [])

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await supabase.from("users").select("id,name")
        if (data) {
          const userMap = data.reduce((acc, user) => {
            acc[user.id] = user.name
            return acc
          }, {})
          setUsers(userMap)
        }
      } catch (error) {
        console.error("Error loading users:", error)
      }
    }

    loadUsers()
  }, [supabase])

  useEffect(() => {
    // Process action flows to find notifications
    const messageNotifications: Notification[] = []
    const deadlineNotifications: Notification[] = []

    if (!Array.isArray(actionFlows) || !userId) {
      setNotifications({
        messages: [],
        deadlines: [],
      })
      return
    }

    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    actionFlows.forEach((flow) => {
      if (flow.sections && Array.isArray(flow.sections)) {
        flow.sections.forEach((section) => {
          if (section && section.tasks && Array.isArray(section.tasks)) {
            section.tasks.forEach((task) => {
              // Check for unread messages - only include actual user messages
              if (task.messages && Array.isArray(task.messages)) {
                task.messages.forEach((msg) => {
                  if (
                    msg &&
                    msg.sender_id !== userId &&
                    !msg.read &&
                    !msg.dismissed &&
                    msg.text &&
                    typeof msg.text === "string"
                  ) {
                    messageNotifications.push({
                      id: uuidv4(),
                      flowId: flow.id,
                      sectionId: section.id,
                      taskId: task.id,
                      taskTitle: `${task.title}`,
                      flowTitle: flow.title,
                      assignedTo: flow.user_id ? users[flow.user_id] || "Unknown User" : "Unassigned",
                      messageId: msg.id, // Store the message ID for dismissal
                    })
                  }
                })
              }

              // Check for approaching deadlines
              if (task.deadline && !task.completed) {
                const deadline = new Date(task.deadline)
                if (deadline > today && deadline <= threeDaysFromNow) {
                  deadlineNotifications.push({
                    id: uuidv4(),
                    flowId: flow.id,
                    sectionId: section.id,
                    taskId: task.id,
                    taskTitle: `${task.title}`,
                    flowTitle: flow.title,
                    deadline: new Date(task.deadline).toLocaleDateString(),
                    assignedTo: flow.user_id ? users[flow.user_id] || "Unknown User" : "Unassigned",
                  })
                }
              }
            })
          }
        })
      }
    })

    setNotifications({
      messages: messageNotifications,
      deadlines: deadlineNotifications,
    })
  }, [actionFlows, userId, users])

  const dismissMessageNotification = (id: string) => {
    // Find the notification to get its messageId
    const notification = notifications.messages.find((msg) => msg.id === id)
    if (notification && notification.messageId) {
      // Mark the message as dismissed in our global store
      dismissMessage(notification.messageId)
    }

    // Remove from local state
    setNotifications((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== id),
    }))
  }

  const dismissAllMessages = () => {
    // Mark all messages as dismissed in our global store
    notifications.messages.forEach((notification) => {
      if (notification.messageId) {
        dismissMessage(notification.messageId)
      }
    })

    // Clear local state
    setNotifications((prev) => ({
      ...prev,
      messages: [],
    }))
  }

  // We're not implementing these functions since deadline notifications should persist
  const dismissDeadline = (id: string) => {
    // This function is now a no-op
    console.log("Deadline notifications cannot be dismissed")
  }

  const dismissAllDeadlines = () => {
    // This function is now a no-op
    console.log("Deadline notifications cannot be dismissed")
  }

  if (notifications.messages.length === 0 && notifications.deadlines.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <NotificationAccordion
        title={t("notification.newMessages")}
        icon={<MessageCircle className="h-5 w-5 text-blue-600" />}
        notifications={notifications.messages}
        type="message"
        onDismiss={dismissMessageNotification}
        onDismissAll={dismissAllMessages}
      />

      <NotificationAccordion
        title={t("notification.approachingDeadlines")}
        icon={<Clock className="h-5 w-5 text-red-600" />}
        notifications={notifications.deadlines}
        type="deadline"
        onDismiss={dismissDeadline}
        onDismissAll={dismissAllDeadlines}
      />
    </div>
  )
}
