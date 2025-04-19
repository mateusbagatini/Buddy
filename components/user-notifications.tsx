"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Clock, AlertCircle } from "lucide-react"
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
  approval_status?: string
}

type Section = {
  id: string
  title: string
  tasks: Task[]
}

type ActionFlow = {
  id: string
  title: string
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

export function UserNotifications({ actionFlows = [], userId }: { actionFlows: ActionFlow[]; userId: string }) {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<{
    messages: Notification[]
    deadlines: Notification[]
    taskRefusals: Notification[] // Add this new category
  }>({
    messages: [],
    deadlines: [],
    taskRefusals: [],
  })

  // Load dismissed messages from localStorage on component mount
  useEffect(() => {
    loadDismissedMessages()
  }, [])

  useEffect(() => {
    // Process action flows to find notifications
    const messageNotifications: Notification[] = []
    const deadlineNotifications: Notification[] = []
    const taskRefusalNotifications: Notification[] = [] // Add this new array

    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    if (!Array.isArray(actionFlows)) return

    actionFlows.forEach((flow) => {
      if (!flow || !flow.sections || !Array.isArray(flow.sections)) return

      flow.sections.forEach((section) => {
        if (!section || !section.tasks || !Array.isArray(section.tasks)) return

        section.tasks.forEach((task) => {
          // Check for tasks that need attention (were refused)
          if (task && task.completed && task.approval_status === "refused") {
            taskRefusalNotifications.push({
              id: uuidv4(),
              flowId: flow.id,
              sectionId: section.id,
              taskId: task.id,
              taskTitle: `${task.title || "Untitled Task"}`,
              flowTitle: flow.title || "Untitled Flow",
            })
          }

          // Check for unread messages - only include actual user messages
          if (task && task.messages && Array.isArray(task.messages)) {
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
                  taskTitle: `${task.title || "Untitled Task"}`,
                  flowTitle: flow.title || "Untitled Flow",
                  messageId: msg.id, // Store the message ID for dismissal
                })
              }
            })
          }

          // Check for approaching deadlines
          if (task && task.deadline && !task.completed) {
            const deadline = new Date(task.deadline)
            if (deadline > today && deadline <= threeDaysFromNow) {
              deadlineNotifications.push({
                id: uuidv4(),
                flowId: flow.id,
                sectionId: section.id,
                taskId: task.id,
                taskTitle: `${task.title || "Untitled Task"}`,
                flowTitle: flow.title || "Untitled Flow",
                deadline: new Date(task.deadline).toLocaleDateString(),
              })
            }
          }
        })
      })
    })

    setNotifications({
      messages: messageNotifications,
      deadlines: deadlineNotifications,
      taskRefusals: taskRefusalNotifications, // Add this
    })
  }, [actionFlows, userId])

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

  if (
    notifications.messages.length === 0 &&
    notifications.deadlines.length === 0 &&
    notifications.taskRefusals.length === 0
  ) {
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

      {/* Add task refusal notifications */}
      <NotificationAccordion
        title="Tasks That Need Attention"
        icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        notifications={notifications.taskRefusals}
        type="task_refused"
        onDismiss={() => {}} // These can't be dismissed
        onDismissAll={() => {}} // These can't be dismissed
      />
    </div>
  )
}
