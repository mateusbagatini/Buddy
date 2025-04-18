"use server"

import { createClient } from "@supabase/supabase-js"

// Create a notification for a user
export async function createNotification(
  userId: string,
  flowId: string,
  sectionId: string,
  taskId: string,
  message: string,
  senderId: string,
  senderName: string,
  type = "message", // Default to message type
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
    )

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        flow_id: flowId,
        section_id: sectionId,
        task_id: taskId,
        message: message,
        sender_id: senderId,
        sender_name: senderName,
        type: type,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: error.message }
    }

    return { success: true, notification: data[0] }
  } catch (error) {
    console.error("Error creating notification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating notification",
    }
  }
}

// Mark notifications as read
export async function markNotificationsAsRead(
  userId: string,
  flowId: string,
  sectionId: string,
  taskId: string,
  type = "message", // Default to message type
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
    )

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("flow_id", flowId)
      .eq("section_id", sectionId)
      .eq("task_id", taskId)
      .eq("type", type)

    if (error) {
      console.error("Error marking notifications as read:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error marking notifications as read",
    }
  }
}

// Delete notifications
export async function deleteNotifications(
  userId: string,
  type = "message", // Default to message type
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
    )

    const { error } = await supabase.from("notifications").delete().eq("user_id", userId).eq("type", type)

    if (error) {
      console.error("Error deleting notifications:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting notifications:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting notifications",
    }
  }
}
