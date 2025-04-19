"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Clock,
  FileText,
  Type,
  Trash2,
  Eye,
  Pencil,
  MessageCircle,
  CheckCircle,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AdminPreviewModal } from "@/components/admin-preview-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/contexts/language-context"
import { TaskChat } from "@/components/task-chat"
import { hasUnreadMessages, countMessages } from "@/lib/message-utils"
import { determineFlowStatus } from "@/lib/utils"
// Import the necessary functions
import { updateTaskApproval, getTaskApprovalStatus } from "@/lib/task-utils"

export default function ActionFlowDetail({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useLanguage()
  const flowId = params.id
  const [actionFlow, setActionFlow] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  // Get section and task IDs from URL query parameters
  const highlightSectionId = searchParams?.get("section")
  const highlightTaskId = searchParams?.get("task")

  // Update the expandedTask state handling to fix any issues with task chat
  const [expandedTask, setExpandedTask] = useState(null)

  const supabase = createClientComponentClient()

  // Set expandedTask based on URL parameters when component mounts
  useEffect(() => {
    if (highlightSectionId && highlightTaskId) {
      setExpandedTask({ sectionId: highlightSectionId, taskId: highlightTaskId })
    }
  }, [highlightSectionId, highlightTaskId])

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Get current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          console.error("Auth error:", authError)
          setError(`Authentication error: ${authError.message}`)
          return
        }

        if (!authUser) {
          setError("No authenticated user found")
          return
        }

        // Get user profile
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()

        if (userError) {
          console.error("Error fetching user profile:", userError)
          setError(`Error getting user profile: ${userError.message}`)
          return
        }

        setCurrentUser(userData)

        // Load action flow
        const { data: flow, error: flowError } = await supabase
          .from("action_flows")
          .select("*")
          .eq("id", flowId)
          .single()

        if (flowError) {
          console.error("Error loading action flow:", flowError)
          setError(`Failed to load action flow: ${flowError.message}`)
          toast({
            title: t("common.error"),
            description: t("actionFlow.notFound"),
            variant: "destructive",
          })
          return
        }

        // Ensure sections is an array
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

        // Ensure each section has a tasks array
        if (Array.isArray(flow.sections)) {
          flow.sections = flow.sections.map((section) => {
            if (!section.tasks) {
              section.tasks = []
            }
            return section
          })
        }

        console.log("Loaded action flow:", flow)
        setActionFlow(flow)

        // Load users for reference
        const { data: usersData, error: usersError } = await supabase.from("users").select("id,name,email,role")

        if (usersError) {
          console.error("Error loading users:", usersError)
        } else {
          setUsers(usersData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
        setError(`Unexpected error: ${error.message}`)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [flowId, router, toast, supabase, t])

  // Handle deleting the action flow
  const handleDeleteFlow = async () => {
    try {
      const { error: deleteError } = await supabase.from("action_flows").delete().eq("id", actionFlow.id)

      if (deleteError) {
        throw deleteError
      }

      toast({
        title: t("actionFlow.deleted"),
        description: `"${actionFlow.title}" ${t("actionFlow.deleted").toLowerCase()}.`,
      })

      router.push("/admin/dashboard")
    } catch (error) {
      console.error("Error deleting action flow:", error)
      toast({
        title: t("common.error"),
        description: `${t("common.error")}: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  // Navigate to edit page
  const handleEditFlow = () => {
    router.push(`/admin/action-flows/${flowId}/edit`)
  }

  // Calculate completion statistics
  const calculateStats = () => {
    if (!actionFlow || !actionFlow.sections || !Array.isArray(actionFlow.sections)) {
      return { totalTasks: 0, completedTasks: 0, progress: 0 }
    }

    let totalTasks = 0
    let completedTasks = 0

    actionFlow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        totalTasks += section.tasks.length
        completedTasks += section.tasks.filter((task) => task && task.completed).length
      }
    })

    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

    return { totalTasks, completedTasks, progress }
  }

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return t("actionFlow.unassigned")
    const user = users.find((user) => user.id === userId)
    return user ? user.name : t("actionFlow.unknownUser")
  }

  // Get user by ID
  const getUserById = (userId) => {
    if (!userId) return null
    return users.find((user) => user.id === userId) || null
  }

  // Open file in a new tab
  const openFile = (url) => {
    if (url) {
      window.open(url, "_blank")
    }
  }

  // Handle message sent
  const handleMessageSent = (message) => {
    // If this is a mark_read event, just refresh the action flow
    if (message && message.type === "mark_read") {
      // Refresh the action flow to update the UI
      const loadActionFlow = async () => {
        try {
          const { data: flow, error: flowError } = await supabase
            .from("action_flows")
            .select("*")
            .eq("id", flowId)
            .single()

          if (flowError) {
            console.error("Error refreshing action flow:", flowError)
            return
          }

          // Ensure sections is an array
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

          setActionFlow(flow)
        } catch (error) {
          console.error("Error refreshing action flow:", error)
        }
      }

      loadActionFlow()
      return
    }

    // Update the action flow with the new message
    if (!actionFlow || !Array.isArray(actionFlow.sections)) return

    // Find the task and add the message
    const updatedSections = actionFlow.sections.map((section) => {
      if (!section || !Array.isArray(section.tasks)) return section

      return {
        ...section,
        tasks: section.tasks.map((task) => {
          if (!task) return task
          if (task.id === expandedTask?.taskId) {
            return {
              ...task,
              messages: Array.isArray(task.messages) ? [...task.messages, message] : [message],
            }
          }
          return task
        }),
      }
    })

    // Update local state
    setActionFlow({
      ...actionFlow,
      sections: updatedSections,
    })
  }

  // In the handleTaskCompletion function (if it exists):
  const handleTaskCompletion = async (sectionId, taskId, isCompleted) => {
    try {
      // First update the local state to provide immediate feedback
      const updatedSections = actionFlow.sections.map((section) => {
        if (!section || section.id !== sectionId || !Array.isArray(section.tasks)) return section

        return {
          ...section,
          tasks: section.tasks.map((task) => {
            if (!task || task.id !== taskId) return task
            return { ...task, completed: isCompleted }
          }),
        }
      })

      // Update the local state immediately
      setActionFlow({
        ...actionFlow,
        sections: updatedSections,
      })

      // Determine the new status based on task completion
      const newStatus = determineFlowStatus({ ...actionFlow, sections: updatedSections })

      // Then update in Supabase
      const { error } = await supabase
        .from("action_flows")
        .update({
          sections: updatedSections,
          status: newStatus, // Update the status field
        })
        .eq("id", flowId)

      if (error) {
        console.error("Error updating task completion:", error)
        // Revert the local state if there was an error
        setActionFlow(actionFlow)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
        return
      }

      // Show toast notification
      toast({
        title: isCompleted ? t("common.taskCompleted") : t("common.taskIncomplete"),
        description: isCompleted ? t("common.taskCompletedMessage") : t("common.taskIncompleteMessage"),
      })
    } catch (error) {
      console.error("Error updating task completion:", error)
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      })
    }
  }

  // Inside the component, add this function to determine task status appearance
  const getTaskStatusClasses = (task) => {
    if (!task.completed) {
      return "border-gray-200 bg-gray-50"
    }

    switch (task.approval_status) {
      case "approved":
        return "bg-green-100 border-green-300"
      case "refused":
        return "bg-red-50 border-red-300"
      case "pending":
      default:
        return "bg-gray-100 border-gray-300"
    }
  }

  // Add a function to handle task approval
  const handleTaskApproval = async (sectionId, taskId, status) => {
    try {
      const result = await updateTaskApproval(
        flowId,
        sectionId,
        taskId,
        status,
        currentUser.id,
        currentUser.name || currentUser.email,
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // Update the local state
      const updatedSections = actionFlow.sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            tasks: section.tasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  approval_status: status,
                }
              }
              return task
            }),
          }
        }
        return section
      })

      setActionFlow({
        ...actionFlow,
        sections: updatedSections,
      })

      // Show success toast
      toast({
        title: status === "approved" ? "Task Approved" : status === "refused" ? "Task Refused" : "Status Reset",
        description: `Task status has been updated successfully.`,
      })
    } catch (error) {
      console.error("Error updating task approval:", error)
      toast({
        title: "Error",
        description: `Failed to update task status: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Function to determine if all tasks in a section are approved
  const isSectionApproved = (section) => {
    if (!section || !Array.isArray(section.tasks) || section.tasks.length === 0) return false

    // Check if all tasks are completed
    const allCompleted = section.tasks.every((task) => task.completed)
    if (!allCompleted) return false

    // Check if any task requires approval
    const requiresApproval = section.tasks.some((task) => task.requires_approval)

    // If no tasks require approval, section is approved if all tasks are completed
    if (!requiresApproval) return allCompleted

    // If some tasks require approval, check if all those tasks are approved
    return section.tasks.every(
      (task) => !task.requires_approval || (task.completed && task.approval_status === "approved"),
    )
  }

  // Function to determine the section card class
  const getSectionCardClass = (section) => {
    return isSectionApproved(section) ? "bg-green-50 border-green-300" : "border-gray-200"
  }

  const { totalTasks, completedTasks, progress } = calculateStats()
  const assignedUser = getUserById(actionFlow?.user_id)
  const flowStatus = determineFlowStatus(actionFlow || {})

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!actionFlow) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">{t("actionFlow.notFound")}</h2>
            <p className="text-muted-foreground mb-4">{t("actionFlow.notFoundMessage")}</p>
            <Link href="/admin/dashboard">
              <Button>{t("common.returnToDashboard")}</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 mb-4">
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToDashboard")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{actionFlow.title}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} className="gap-1">
                <Eye className="h-4 w-4" />
                {t("actionFlow.preview")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleEditFlow} className="gap-1">
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="gap-1">
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("actionFlow.details")}</CardTitle>
            </CardHeader>
            <CardContent></CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("actionFlow.progressOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{t("actionFlow.totalSections")}</div>
                    <div className="text-2xl font-bold">
                      {Array.isArray(actionFlow.sections) ? actionFlow.sections.length : 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t("actionFlow.tasksCompleted")}</div>
                    <div className="text-2xl font-bold">
                      {completedTasks}/{totalTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t("common.progress")}</div>
                    <div className="text-2xl font-bold">{progress}%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm font-medium">{t("actionFlow.status")}:</span>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      flowStatus === "Completed"
                        ? "bg-green-100 text-green-800"
                        : flowStatus === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {flowStatus}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">{t("actionFlow.sectionsAndTasks")}</h2>
        {Array.isArray(actionFlow.sections) && actionFlow.sections.length > 0 ? (
          <Accordion
            type="multiple"
            className="space-y-8"
            defaultValue={actionFlow.sections.map((s) => `section-${s.id}`)}
          >
            {actionFlow.sections.map((section, sectionIndex) => {
              if (!section) return null

              const sectionTasks = Array.isArray(section.tasks) ? section.tasks : []
              const completedTasksInSection = sectionTasks.filter((task) => task && task.completed).length
              const totalTasksInSection = sectionTasks.length
              const sectionProgress =
                totalTasksInSection === 0 ? 0 : Math.round((completedTasksInSection / totalTasksInSection) * 100)
              const sectionCompleted = isSectionApproved(section)

              return (
                <AccordionItem
                  key={section.id || sectionIndex}
                  value={`section-${section.id || sectionIndex}`}
                  className={`border rounded-lg ${getSectionCardClass(section)}`}
                >
                  <AccordionTrigger className="px-4 py-2">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center">
                        {sectionCompleted ? (
                          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center mr-2">
                            {sectionIndex + 1}
                          </div>
                        )}
                        <span className={`font-medium ${sectionCompleted ? "text-green-700" : ""}`}>
                          {section.title || `Section ${sectionIndex + 1}`}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({completedTasksInSection}/{totalTasksInSection} {t("common.tasks").toLowerCase()})
                        </span>
                      </div>
                      <Badge variant="outline" className={sectionCompleted ? "bg-green-50 text-green-700" : ""}>
                        {sectionProgress}% {t("common.completed").toLowerCase()}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {sectionTasks.length > 0 ? (
                      <div className="space-y-6 mt-2">
                        {sectionTasks.map((task, taskIndex) => {
                          if (!task) return null

                          const hasUnread = hasUnreadMessages(task, currentUser?.id)
                          const isExpanded = expandedTask?.sectionId === section.id && expandedTask?.taskId === task.id
                          const approvalStatus = getTaskApprovalStatus(task)

                          return (
                            <Card
                              key={task.id || taskIndex}
                              className={`${hasUnread ? "bg-blue-50 border-blue-300" : getTaskStatusClasses(task)}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium mb-2 flex items-center">
                                    {/* Update the task completion check to use the green color */}
                                    <Checkbox
                                      checked={task.completed || false}
                                      disabled
                                      className="mr-2 opacity-70 text-green-600 data-[state=checked]:bg-green-50 data-[state=checked]:text-green-600 data-[state=checked]:border-green-600"
                                    />
                                    {task.title || `Task ${taskIndex + 1}`}
                                    {hasUnread && (
                                      <Badge
                                        variant="secondary"
                                        className="ml-2 bg-blue-100 text-blue-800 flex items-center"
                                      >
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        <span>{t("task.newMessages")}</span>
                                      </Badge>
                                    )}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {/* Add approval buttons for completed tasks */}
                                    {task.completed && task.requires_approval && (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 px-2 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800"
                                          onClick={() => handleTaskApproval(section.id, task.id, "approved")}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 px-2 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                                          onClick={() => handleTaskApproval(section.id, task.id, "refused")}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Refuse
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => handleTaskApproval(section.id, task.id, "none")}
                                          title="Reset status"
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}

                                    <Badge
                                      variant={task.completed ? "outline" : "secondary"}
                                      className={
                                        task.approval_status === "approved"
                                          ? "bg-green-50 text-green-700"
                                          : task.approval_status === "refused"
                                            ? "bg-red-50 text-red-700"
                                            : task.completed
                                              ? "bg-gray-50 text-gray-700"
                                              : ""
                                      }
                                    >
                                      {task.completed
                                        ? task.approval_status === "approved"
                                          ? "Approved"
                                          : task.approval_status === "refused"
                                            ? "Refused"
                                            : "Pending"
                                        : "Not Started"}
                                    </Badge>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setExpandedTask(isExpanded ? null : { sectionId: section.id, taskId: task.id })
                                      }
                                      className="relative flex items-center gap-1"
                                    >
                                      <MessageCircle className="h-5 w-5" />
                                      {countMessages(task) > 0 && (
                                        <span
                                          className={`text-xs font-medium ${hasUnread ? "text-blue-600" : "text-gray-600"}`}
                                        >
                                          {countMessages(task)}
                                        </span>
                                      )}
                                      {hasUnread && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></span>
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-sm text-muted-foreground mb-4 ml-6">{task.description}</p>
                                )}

                                {task.deadline && (
                                  <div className="flex items-center ml-6 mt-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                                    <span className="text-muted-foreground">
                                      {t("common.taskDeadline")}: {new Date(task.deadline).toLocaleDateString()}
                                      {new Date(task.deadline) < new Date() && !task.completed && (
                                        <span className="ml-2 text-red-500 font-medium">{t("common.overdue")}</span>
                                      )}
                                    </span>
                                  </div>
                                )}

                                {Array.isArray(task.inputs) && task.inputs.length > 0 && (
                                  <div className="space-y-2 ml-6">
                                    <h4 className="text-sm font-medium">{t("actionFlow.inputs")}:</h4>
                                    <div className="space-y-2">
                                      {task.inputs.map((input, inputIndex) => {
                                        if (!input) return null

                                        return (
                                          <div
                                            key={input.id || inputIndex}
                                            className="flex items-center space-x-2 text-sm"
                                          >
                                            {input.type === "text" ? (
                                              <>
                                                <Type className="h-4 w-4 text-muted-foreground" />
                                                <span>{input.label || `Input ${inputIndex + 1}`}: </span>
                                                <span className="font-medium">{input.value || "-"}</span>
                                              </>
                                            ) : (
                                              <>
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span>{input.label || `Input ${inputIndex + 1}`}: </span>
                                                {input.file_url ? (
                                                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full inline-flex items-center">
                                                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                                    <span className="text-sm text-blue-700 mr-2 truncate max-w-[200px]">
                                                      {input.value || t("common.file")}
                                                    </span>
                                                    <Button
                                                      variant="link"
                                                      size="sm"
                                                      className="h-auto p-0 text-blue-600"
                                                      onClick={() => openFile(input.file_url)}
                                                    >
                                                      {t("common.clickToDownload")}
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <span className="text-muted-foreground">
                                                    {t("common.noFileUploaded")}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Chat area */}
                                {isExpanded && assignedUser && (
                                  <div className="mt-6 ml-6">
                                    <TaskChat
                                      flowId={flowId}
                                      sectionId={section.id}
                                      taskId={task.id}
                                      messages={Array.isArray(task.messages) ? task.messages : []}
                                      currentUser={currentUser}
                                      recipient={assignedUser}
                                      onMessageSent={handleMessageSent}
                                      task={task} // Add this prop
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">{t("actionFlow.noTasks")}</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("actionFlow.noSections")}</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actionFlow.delete")}</DialogTitle>
            <DialogDescription>{t("actionFlow.deleteConfirm").replace("{title}", actionFlow.title)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteFlow}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <AdminPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        actionFlow={actionFlow}
        users={users}
      />
    </div>
  )
}
