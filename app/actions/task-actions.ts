"use server"

import { updateTaskApproval as updateTaskApprovalUtil } from "@/lib/task-utils"

export async function approveTask(
  flowId: string,
  sectionId: string,
  taskId: string,
  status: "approved" | "refused" | "none",
  adminId: string,
  adminName: string,
) {
  try {
    const result = await updateTaskApprovalUtil(flowId, sectionId, taskId, status, adminId, adminName)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in approveTask server action:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error approving task",
    }
  }
}
