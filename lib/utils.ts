import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map between display status and database status
export const STATUS_MAPPING = {
  // Display status to database status
  "Not Started": "Draft",
  "In Progress": "In Progress",
  Completed: "Completed",

  // Database status to display status
  Draft: "Not Started",
  "In Progress": "In Progress",
  Completed: "Completed",
}

// Function to determine the flow status based on task completion
export function determineFlowStatus(flow: any): "Not Started" | "In Progress" | "Completed" {
  if (!flow.sections || !Array.isArray(flow.sections)) {
    return "Not Started"
  }

  let totalTasks = 0
  let completedTasks = 0

  flow.sections.forEach((section: any) => {
    if (section && Array.isArray(section.tasks)) {
      totalTasks += section.tasks.length
      completedTasks += section.tasks.filter((task: any) => task && task.completed).length
    }
  })

  if (totalTasks === 0) {
    return "Not Started"
  }

  if (completedTasks === 0) {
    return "Not Started"
  } else if (completedTasks < totalTasks) {
    return "In Progress"
  } else {
    return "Completed"
  }
}

// Convert display status to database status
export function displayToDbStatus(displayStatus: string): string {
  return STATUS_MAPPING[displayStatus] || "Draft"
}

// Convert database status to display status
export function dbToDisplayStatus(dbStatus: string): string {
  return STATUS_MAPPING[dbStatus] || "Not Started"
}
