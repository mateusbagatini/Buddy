import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createNotification } from "@/app/actions/notification-actions"

export type ApprovalStatus = "pending" | "approved" | "refused" | "none"

// Update task completion status
export async function updateTaskCompletion(
  flowId: string,
  sectionId: string,
  taskId: string,
  completed: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()

  try {
    // Get the current flow
    const { data: flow, error: flowError } = await supabase
      .from("action_flows")
      .select("sections, user_id")
      .eq("id", flowId)
      .single()

    if (flowError) {
      throw new Error(`Error fetching action flow: ${flowError.message}`)
    }

    // Parse sections if needed
    let sections = flow.sections
    if (typeof sections === "string") {
      sections = JSON.parse(sections)
    }

    // Find the section and task
    let sectionIndex = -1
    let taskIndex = -1

    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === sectionId) {
        sectionIndex = i
        const tasks = sections[i].tasks || []
        for (let j = 0; j < tasks.length; j++) {
          if (tasks[j].id === taskId) {
            taskIndex = j
            break
          }
        }
        break
      }
    }

    if (sectionIndex === -1 || taskIndex === -1) {
      throw new Error("Section or task not found")
    }

    // Update the task completion status
    const updatedSections = [...sections]
    const task = updatedSections[sectionIndex].tasks[taskIndex]

    // Set approval status to "pending" when a task is marked as completed
    // or "none" when it's unchecked
    const approvalStatus = completed && task.requires_approval ? "pending" : "none"

    updatedSections[sectionIndex].tasks[taskIndex] = {
      ...updatedSections[sectionIndex].tasks[taskIndex],
      completed,
      approval_status: approvalStatus,
    }

    // Update the action flow
    const { error: updateError } = await supabase
      .from("action_flows")
      .update({ sections: updatedSections })
      .eq("id", flowId)

    if (updateError) {
      throw new Error(`Error updating action flow: ${updateError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating task completion:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Update task approval status
export async function updateTaskApproval(
  flowId: string,
  sectionId: string,
  taskId: string,
  approvalStatus: ApprovalStatus,
  adminId: string,
  adminName: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()

  try {
    // Get the current flow
    const { data: flow, error: flowError } = await supabase
      .from("action_flows")
      .select("sections, user_id")
      .eq("id", flowId)
      .single()

    if (flowError) {
      throw new Error(`Error fetching action flow: ${flowError.message}`)
    }

    // Parse sections if needed
    let sections = flow.sections
    if (typeof sections === "string") {
      sections = JSON.parse(sections)
    }

    // Find the section and task
    let sectionIndex = -1
    let taskIndex = -1
    let taskTitle = ""

    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === sectionId) {
        sectionIndex = i
        const tasks = sections[i].tasks || []
        for (let j = 0; j < tasks.length; j++) {
          if (tasks[j].id === taskId) {
            taskIndex = j
            taskTitle = tasks[j].title || "Untitled Task"
            break
          }
        }
        break
      }
    }

    if (sectionIndex === -1 || taskIndex === -1) {
      throw new Error("Section or task not found")
    }

    // Update the task approval status
    const updatedSections = [...sections]
    updatedSections[sectionIndex].tasks[taskIndex] = {
      ...updatedSections[sectionIndex].tasks[taskIndex],
      approval_status: approvalStatus,
    }

    // Update the action flow
    const { error: updateError } = await supabase
      .from("action_flows")
      .update({ sections: updatedSections })
      .eq("id", flowId)

    if (updateError) {
      throw new Error(`Error updating action flow: ${updateError.message}`)
    }

    // If the task was refused, create a notification for the user
    if (approvalStatus === "refused" && flow.user_id) {
      // Create a notification for the user
      await createNotification(
        flow.user_id,
        flowId,
        sectionId,
        taskId,
        `Task "${taskTitle}" was refused and needs attention`,
        adminId,
        adminName,
        "task_refused",
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating task approval:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Check if a task needs attention (was refused)
export function taskNeedsAttention(task: any): boolean {
  return task && task.completed && task.approval_status === "refused"
}

// Get the approval status of a task
export function getTaskApprovalStatus(task: any): ApprovalStatus {
  if (!task) return "none"
  return task.approval_status || "none"
}
