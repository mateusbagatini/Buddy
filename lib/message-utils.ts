import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { v4 as uuidv4 } from "uuid"

export type Message = {
  id: string
  text: string
  sender_id: string
  sender_name: string
  timestamp: string
  read: boolean
  dismissed?: boolean // Add this field to track dismissed messages
}

// Store for dismissed message IDs to ensure they don't reappear
const dismissedMessageIds = new Set<string>()

export async function sendTaskMessage(
  flowId: string,
  sectionId: string,
  taskId: string,
  message: string,
  sender: { id: string; name: string; role?: string },
  recipient: { id?: string; name?: string; role?: string } | null,
) {
  const supabase = createClientComponentClient()

  try {
    // Get the current action flow
    const { data: flow, error: flowError } = await supabase
      .from("action_flows")
      .select("sections, user_id")
      .eq("id", flowId)
      .single()

    if (flowError) {
      throw new Error(`Error fetching action flow: ${flowError.message}`)
    }

    if (!flow.sections) {
      flow.sections = []
    } else if (typeof flow.sections === "string") {
      try {
        flow.sections = JSON.parse(flow.sections)
      } catch (e) {
        console.error("Error parsing sections JSON:", e)
        flow.sections = []
      }
    }

    // Create a new message
    const newMessage: Message = {
      id: uuidv4(),
      text: message,
      sender_id: sender.id,
      sender_name: sender.name,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false, // Initialize as not dismissed
    }

    // Find the section and task
    const sections = flow.sections
    let sectionIndex = -1
    let taskIndex = -1

    if (Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].id === sectionId) {
          sectionIndex = i
          const tasks = sections[i].tasks || []
          for (let j = 0; j < tasks.length; j++) {
            if (tasks[j] && tasks[j].id === taskId) {
              taskIndex = j
              break
            }
          }
          break
        }
      }
    }

    if (sectionIndex === -1 || taskIndex === -1) {
      throw new Error("Section or task not found")
    }

    // Add the message to the task
    const updatedSections = [...sections]
    const task = updatedSections[sectionIndex].tasks[taskIndex]

    // Initialize messages array if it doesn't exist
    if (!task.messages) {
      task.messages = []
    }

    // Add the new message
    task.messages.push(newMessage)

    // Update the action flow
    const { error: updateError } = await supabase
      .from("action_flows")
      .update({ sections: updatedSections })
      .eq("id", flowId)

    if (updateError) {
      throw new Error(`Error updating action flow: ${updateError.message}`)
    }

    // Determine the correct recipient ID based on sender role
    let recipientId = recipient?.id

    // If sender is a regular user, send notification to an admin
    if (sender.role !== "admin") {
      // Find an admin user to notify
      const { data: admins, error: adminsError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")
        .limit(1)

      if (!adminsError && admins && admins.length > 0) {
        recipientId = admins[0].id
      }
    }
    // If sender is admin, send notification to the assigned user
    else if (flow.user_id) {
      recipientId = flow.user_id
    }

    // Create a notification for the recipient
    if (recipientId) {
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: recipientId,
        flow_id: flowId,
        section_id: sectionId,
        task_id: taskId,
        message: message,
        sender_id: sender.id,
        sender_name: sender.name,
        type: "message", // Add a type field to distinguish message notifications
      })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        // Continue even if notification creation fails
      }
    }

    return { success: true, message: newMessage }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function markMessagesAsRead(flowId: string, sectionId: string, taskId: string, userId: string) {
  const supabase = createClientComponentClient()

  try {
    // Get the current action flow
    const { data: flow, error: flowError } = await supabase
      .from("action_flows")
      .select("sections")
      .eq("id", flowId)
      .single()

    if (flowError) {
      throw new Error(`Error fetching action flow: ${flowError.message}`)
    }

    if (!flow.sections) {
      flow.sections = []
    } else if (typeof flow.sections === "string") {
      try {
        flow.sections = JSON.parse(flow.sections)
      } catch (e) {
        console.error("Error parsing sections JSON:", e)
        flow.sections = []
      }
    }

    // Find the section and task
    const sections = flow.sections
    let sectionIndex = -1
    let taskIndex = -1
    let messagesUpdated = false

    if (Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].id === sectionId) {
          sectionIndex = i
          const tasks = sections[i].tasks || []
          for (let j = 0; j < tasks.length; j++) {
            if (tasks[j] && tasks[j].id === taskId) {
              taskIndex = j
              break
            }
          }
          break
        }
      }
    }

    if (sectionIndex === -1 || taskIndex === -1) {
      throw new Error("Section or task not found")
    }

    // Mark messages as read
    const updatedSections = [...sections]
    const task = updatedSections[sectionIndex].tasks[taskIndex]

    if (task.messages && Array.isArray(task.messages)) {
      task.messages = task.messages.map((msg) => {
        if (msg && msg.sender_id !== userId && !msg.read) {
          messagesUpdated = true
          return { ...msg, read: true }
        }
        return msg
      })
    }

    if (!messagesUpdated) {
      // No messages were updated, so no need to update the database
      return { success: true, updated: false }
    }

    // Update the action flow
    const { error: updateError } = await supabase
      .from("action_flows")
      .update({ sections: updatedSections })
      .eq("id", flowId)

    if (updateError) {
      throw new Error(`Error updating action flow: ${updateError.message}`)
    }

    // Mark notifications as read
    const { error: notificationError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("flow_id", flowId)
      .eq("section_id", sectionId)
      .eq("task_id", taskId)
      .eq("user_id", userId)
      .eq("type", "message") // Only update message notifications

    if (notificationError) {
      console.error("Error updating notifications:", notificationError)
      // Continue even if notification update fails
    }

    return { success: true, updated: true }
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Mark a message as dismissed so it won't show up in notifications again
export function dismissMessage(messageId: string) {
  dismissedMessageIds.add(messageId)

  // Also store in localStorage for persistence across page refreshes
  try {
    const storedIds = JSON.parse(localStorage.getItem("dismissedMessageIds") || "[]")
    if (!storedIds.includes(messageId)) {
      storedIds.push(messageId)
      localStorage.setItem("dismissedMessageIds", JSON.stringify(storedIds))
    }
  } catch (error) {
    console.error("Error storing dismissed message ID:", error)
  }
}

// Load dismissed message IDs from localStorage
export function loadDismissedMessages() {
  try {
    const storedIds = JSON.parse(localStorage.getItem("dismissedMessageIds") || "[]")
    storedIds.forEach((id) => dismissedMessageIds.add(id))
  } catch (error) {
    console.error("Error loading dismissed message IDs:", error)
  }
}

// Check if a message has been dismissed
export function isMessageDismissed(messageId: string) {
  return dismissedMessageIds.has(messageId)
}

export function hasUnreadMessages(task: any, userId: string | undefined): boolean {
  if (!task?.messages || !Array.isArray(task.messages) || !userId) {
    return false
  }

  // Only count actual user messages, not system notifications
  return task.messages.some(
    (msg) =>
      msg &&
      msg.sender_id !== userId &&
      !msg.read &&
      !isMessageDismissed(msg.id) &&
      // Make sure it's an actual message with text content
      msg.text &&
      typeof msg.text === "string",
  )
}

export function getLastMessageTime(task: any): string | null {
  if (!task?.messages || !Array.isArray(task.messages) || task.messages.length === 0) {
    return null
  }

  // Sort messages by timestamp (newest first)
  const sortedMessages = [...task.messages]
    .filter((msg) => msg && msg.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return sortedMessages.length > 0 ? sortedMessages[0].timestamp : null
}

export function countMessages(task: any): number {
  if (!task?.messages || !Array.isArray(task.messages)) {
    return 0
  }
  // Only count actual user messages, not system notifications
  return task.messages.filter((msg) => msg && msg.text && typeof msg.text === "string").length
}

export function countUnreadMessages(task: any, userId: string | undefined): number {
  if (!task?.messages || !Array.isArray(task.messages) || !userId) {
    return 0
  }
  // Only count actual user messages, not system notifications
  return task.messages.filter(
    (msg) =>
      msg &&
      msg.sender_id !== userId &&
      !msg.read &&
      !isMessageDismissed(msg.id) &&
      // Make sure it's an actual message with text content
      msg.text &&
      typeof msg.text === "string",
  ).length
}
