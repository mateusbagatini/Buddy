"use server"

import { setupActionFlowsTable, createExecuteSqlFunction } from "@/lib/setup-action-flows"

export async function setupTablesAction() {
  try {
    // First, try to create the execute_sql function if it doesn't exist
    const functionResult = await createExecuteSqlFunction()

    if (!functionResult.success) {
      return {
        success: false,
        error: `Failed to create execute_sql function: ${functionResult.error}`,
      }
    }

    // Then set up the action_flows table
    const tableResult = await setupActionFlowsTable()

    if (!tableResult.success) {
      return {
        success: false,
        error: `Failed to set up action_flows table: ${tableResult.error}`,
      }
    }

    return {
      success: true,
      message: "Database tables set up successfully",
    }
  } catch (error) {
    console.error("Error setting up tables:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
