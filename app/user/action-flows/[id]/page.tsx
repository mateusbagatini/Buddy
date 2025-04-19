"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, CheckCircle, Clock, Upload, FileText, Trash2, MessageCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useLanguage } from "@/contexts/language-context"
import { TaskChat } from "@/components/task-chat"
import { countMessages, hasUnreadMessages } from "@/lib/message-utils"
import { Badge } from "@/components/ui/badge"
import { UserHeader } from "@/components/user-header"
import { LanguageSwitcher } from "@/components/language-switcher"
import Image from "next/image"

// Import the storage utility functions
import { ensureBucketExists } from "@/lib/storage-utils"

// Add this import at the top of the file
import { determineFlowStatus } from "@/lib/utils"

export default function ActionFlowDetail({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useLanguage()
  const flowId = params.id
  const [actionFlow, setActionFlow] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formValues, setFormValues] = useState({})
  const [fileUrls, setFileUrls] = useState({})
  const [user, setUser] = useState(null)
  const [uploadLoading, setUploadLoading] = useState({})
  const [adminUser, setAdminUser] = useState(null)

  // Get section and task IDs from URL query parameters
  const highlightSectionId = searchParams?.get("section")
  const highlightTaskId = searchParams?.get("task")

  // Initialize expandedTask state
  const [expandedTask, setExpandedTask] = useState(null)

  const supabase = createClientComponentClient()

  // Set expandedTask based on URL parameters when component mounts
  useEffect(() => {
    if (highlightSectionId && highlightTaskId) {
      setExpandedTask({ sectionId: highlightSectionId, taskId: highlightTaskId })
    }
  }, [highlightSectionId, highlightTaskId])

  // Load action flow from Supabase
  useEffect(() => {
    const loadActionFlow = async () => {
      try {
        setIsLoading(true)

        // Get the current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          console.error("Auth error:", authError)
          toast({
            title: t("common.error"),
            description: t("common.login"),
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        if (!authUser) {
          toast({
            title: t("common.error"),
            description: t("common.login"),
            variant: "destructive",
          })
          router.push("/login")
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
          toast({
            title: t("common.error"),
            description: t("common.error"),
            variant: "destructive",
          })
          return
        }

        setUser(userData)

        // Get the action flow
        const { data: flow, error: flowError } = await supabase
          .from("action_flows")
          .select("*")
          .eq("id", flowId)
          .eq("user_id", authUser.id)
          .single()

        if (flowError) {
          console.error("Error fetching action flow:", flowError)
          toast({
            title: t("common.error"),
            description: t("actionFlow.notFoundMessage"),
            variant: "destructive",
          })
          router.push("/user/dashboard")
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

        // Add this near the top of the component, after loading the action flow:
        const flowStatus = determineFlowStatus(flow)

        // Find an admin user to send messages to
        const { data: admins, error: adminsError } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("role", "admin")
          .limit(1)

        if (!adminsError && admins && admins.length > 0) {
          setAdminUser(admins[0])
        } else {
          console.error("No admin users found:", adminsError)
        }

        // Initialize form values and file URLs from existing inputs
        const initialFormValues = {}
        const initialFileUrls = {}

        if (Array.isArray(flow.sections)) {
          flow.sections.forEach((section) => {
            if (section && Array.isArray(section.tasks)) {
              section.tasks.forEach((task) => {
                if (task && Array.isArray(task.inputs)) {
                  task.inputs.forEach((input) => {
                    if (input) {
                      if (input.value) {
                        initialFormValues[`${task.id}-${input.id}`] = input.value
                      }
                      if (input.file_url) {
                        initialFileUrls[`${task.id}-${input.id}`] = input.file_url
                      }
                    }
                  })
                }
              })
            }
          })
        }

        setFormValues(initialFormValues)
        setFileUrls(initialFileUrls)
      } catch (error) {
        console.error("Error loading action flow:", error)
        toast({
          title: t("common.error"),
          description: t("actionFlow.notFoundMessage"),
          variant: "destructive",
        })
        router.push("/user/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    loadActionFlow()
  }, [flowId, router, toast, supabase, t])

  // Calculate progress
  const calculateProgress = () => {
    if (!actionFlow || !Array.isArray(actionFlow.sections)) return 0

    let completedTasks = 0
    let totalTasks = 0

    actionFlow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        totalTasks += section.tasks.length
        completedTasks += section.tasks.filter((task) => task && task.completed).length
      }
    })

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: `Failed to sign out: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Handle input change
  const handleInputChange = async (taskId, inputId, value) => {
    // Update local state
    setFormValues({
      ...formValues,
      [`${taskId}-${inputId}`]: value,
    })

    // Update the value in the action flow
    if (!actionFlow || !Array.isArray(actionFlow.sections)) return

    const updatedSections = actionFlow.sections.map((section) => {
      if (!section || !Array.isArray(section.tasks)) return section

      return {
        ...section,
        tasks: section.tasks.map((task) => {
          if (!task || !Array.isArray(task.inputs)) return task
          if (task.id === taskId) {
            return {
              ...task,
              inputs: task.inputs.map((input) => {
                if (!input) return input
                return input.id === inputId ? { ...input, value } : input
              }),
            }
          }
          return task
        }),
      }
    })

    // Update in Supabase
    try {
      const { error } = await supabase.from("action_flows").update({ sections: updatedSections }).eq("id", flowId)

      if (error) {
        console.error("Error updating input value:", error)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
      }

      // Update local state
      setActionFlow({
        ...actionFlow,
        sections: updatedSections,
      })
    } catch (error) {
      console.error("Error updating input:", error)
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      })
    }
  }

  // Handle file upload
  const handleFileChange = async (taskId, inputId, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const fileName = file.name
      const bucketName = "task-files"

      // Set loading state for this specific upload
      setUploadLoading({
        ...uploadLoading,
        [`${taskId}-${inputId}`]: true,
      })

      // Update local state
      setFormValues({
        ...formValues,
        [`${taskId}-${inputId}`]: fileName,
      })

      try {
        // Show loading toast
        toast({
          title: t("actionFlow.uploadingFile"),
          description: t("actionFlow.uploadingFileMessage"),
        })

        // Simplify the file path to avoid RLS issues
        // Instead of a complex path with user IDs, just use a simple path with a timestamp
        const timestamp = new Date().getTime()
        const simplePath = `uploads/${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`

        // Ensure the bucket exists
        await ensureBucketExists(bucketName)

        // Upload the file
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(simplePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

        if (uploadError) {
          console.error("Error uploading file:", uploadError)
          toast({
            title: t("common.error"),
            description: `${t("common.error")}: ${uploadError.message}`,
            variant: "destructive",
          })
          return
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(simplePath)

        // Update file URLs state
        setFileUrls({
          ...fileUrls,
          [`${taskId}-${inputId}`]: publicUrl,
        })

        // Update the value in the action flow
        if (!actionFlow || !Array.isArray(actionFlow.sections)) return

        const updatedSections = actionFlow.sections.map((section) => {
          if (!section || !Array.isArray(section.tasks)) return section

          return {
            ...section,
            tasks: section.tasks.map((task) => {
              if (!task || !Array.isArray(task.inputs)) return task
              if (task.id === taskId) {
                return {
                  ...task,
                  inputs: task.inputs.map((input) => {
                    if (!input) return input
                    return input.id === inputId ? { ...input, value: fileName, file_url: publicUrl } : input
                  }),
                }
              }
              return task
            }),
          }
        })

        // Update in Supabase
        const { error } = await supabase.from("action_flows").update({ sections: updatedSections }).eq("id", flowId)

        if (error) {
          console.error("Error updating file info:", error)
          toast({
            title: t("common.error"),
            description: t("common.error"),
            variant: "destructive",
          })
          return
        }

        // Update local state
        setActionFlow({
          ...actionFlow,
          sections: updatedSections,
        })

        toast({
          title: t("common.success"),
          description: t("common.fileUploaded"),
        })
      } catch (error) {
        console.error("Error handling file:", error)
        toast({
          title: t("common.error"),
          description: `${t("common.error")}: ${error.message}`,
        })
      } finally {
        // Clear loading state for this upload
        setUploadLoading({
          ...uploadLoading,
          [`${taskId}-${inputId}`]: false,
        })
      }
    }
  }

  const handleDeleteFile = async (taskId, inputId) => {
    try {
      // Get the file path from the action flow
      const fileName = formValues[`${taskId}-${inputId}`]
      if (!fileName) return

      const filePath = `uploads/${user.id}/${flowId}/${taskId}-${inputId}-${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage.from("task-files").remove([filePath])

      if (deleteError) {
        console.error("Error deleting file:", deleteError)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
        return
      }

      // Update the action flow
      if (!actionFlow || !Array.isArray(actionFlow.sections)) return

      const updatedSections = actionFlow.sections.map((section) => {
        if (!section || !Array.isArray(section.tasks)) return section

        return {
          ...section,
          tasks: section.tasks.map((task) => {
            if (!task || !Array.isArray(task.inputs)) return task
            if (task.id === taskId) {
              return {
                ...task,
                inputs: task.inputs.map((input) => {
                  if (!input) return input
                  return input.id === inputId ? { ...input, value: null, file_url: null } : input
                }),
              }
            }
            return task
          }),
        }
      })

      // Update in Supabase
      const { error } = await supabase.from("action_flows").update({ sections: updatedSections }).eq("id", flowId)

      if (error) {
        console.error("Error updating file info after delete:", error)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
        return
      }

      // Update local state
      setActionFlow({
        ...actionFlow,
        sections: updatedSections,
      })

      // Clear form values and file URLs for this input
      const newFormValues = { ...formValues }
      delete newFormValues[`${taskId}-${inputId}`]
      setFormValues(newFormValues)

      const newFileUrls = { ...fileUrls }
      delete newFileUrls[`${taskId}-${inputId}`]
      setFileUrls(newFileUrls)

      toast({
        title: t("common.success"),
        description: t("common.fileDeleted"),
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      })
    }
  }

  // Handle task completion
  const handleTaskCompletion = async (sectionId, taskId, isCompleted) => {
    try {
      // First update the local state to provide immediate feedback
      const updatedSections = actionFlow.sections.map((section) => {
        if (!section || section.id !== sectionId || !Array.isArray(section.tasks)) return section

        return {
          ...section,
          tasks: section.tasks.map((task) => {
            if (!task || task.id !== taskId) return task

            // Set approval status to "pending" when a task is marked as completed
            // or "none" when it's unchecked
            const approvalStatus = isCompleted && task.requires_approval ? "pending" : "none"

            return {
              ...task,
              completed: isCompleted,
              approval_status: approvalStatus,
            }
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
          status: newStatus, // Convert to database status
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

      // Check if all tasks are completed
      const allCompleted = updatedSections.every((section) => {
        if (!section || !Array.isArray(section.tasks)) return true
        return section.tasks.every((task) => task && task.completed)
      })

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

  const updateFlowStatus = async (status) => {
    try {
      const { error } = await supabase.from("action_flows").update({ status }).eq("id", flowId)

      if (error) {
        console.error("Error updating flow status:", error)
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        })
      } else {
        toast({
          title: t("common.success"),
          description: status === "Completed" ? t("actionFlow.completed") : `${t("actionFlow.status")}: ${status}`,
        })

        // Update local state
        setActionFlow({
          ...actionFlow,
          status,
        })
      }
    } catch (error) {
      console.error("Error updating flow status:", error)
    }
  }

  // Check if a section is completed
  const isSectionCompleted = (section) => {
    if (!section || !Array.isArray(section.tasks) || section.tasks.length === 0) return false

    // Check if all tasks are completed
    const allCompleted = section.tasks.every((task) => task && task.completed)
    if (!allCompleted) return false

    // Check if any task requires approval
    const requiresApproval = section.tasks.some((task) => task.requires_approval)

    // If any task requires approval, check if all those tasks are approved
    if (requiresApproval) {
      return section.tasks.every(
        (task) => !task.requires_approval || (task.completed && task.approval_status === "approved"),
      )
    }

    // If no tasks require approval, section is completed if all tasks are completed
    return allCompleted
  }

  // Function to open file in a new tab
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

  // Inside the component, add this function to check for unread messages
  const hasUnreadMessagesForTask = (task) => {
    if (!task?.messages || !Array.isArray(task.messages) || !user?.id) {
      return false
    }
    return task.messages.some((msg) => msg && msg.sender_id !== user.id && !msg.read)
  }

  // Inside the component, add this function to check for approaching deadlines
  const isDeadlineApproaching = (task) => {
    if (!task?.deadline || task.completed) return false

    const today = new Date()
    const deadline = new Date(task.deadline)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    return deadline > today && deadline <= threeDaysFromNow
  }

  // Inside the component, add this function to determine task status appearance
  const getTaskStatusClasses = (task) => {
    if (!task.completed) {
      return "border-gray-200 bg-gray-50"
    }

    // If task requires approval, only show green when approved
    if (task.requires_approval) {
      switch (task.approval_status) {
        case "approved":
          return "bg-green-100 border-green-300"
        case "refused":
          return "bg-red-50 border-red-300"
        case "pending":
        default:
          return "bg-gray-100 border-gray-300"
      }
    } else {
      // If task doesn't require approval, show green when completed
      return "bg-green-100 border-green-300"
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <div className="mr-4 flex">
              <Link href="/user/dashboard" className="flex items-center">
                <Image src="/logo.svg" alt="TaskFlow Logo" width={100} height={35} className="my-6 mx-4" />
              </Link>
            </div>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
          <div className="text-center py-12">{t("common.loading")}</div>
        </main>
      </div>
    )
  }

  if (!actionFlow) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <div className="mr-4 flex">
              <Link href="/user/dashboard" className="flex items-center">
                <Image src="/logo.svg" alt="TaskFlow Logo" width={100} height={35} className="my-6 mx-4" />
              </Link>
            </div>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">{t("actionFlow.notFound")}</h2>
            <p className="text-muted-foreground mb-4">{t("actionFlow.notFoundMessage")}</p>
            <Link href="/user/dashboard">
              <Button>{t("common.returnToDashboard")}</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Then in the component, replace any status display with:
  const flowStatus = determineFlowStatus(actionFlow)

  const progress = calculateProgress()
  const isCompleted = progress === 100

  return (
    <div className="flex min-h-screen flex-col">
      <UserHeader user={user} onSignOut={handleSignOut} />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/user/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 mb-4">
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToDashboard")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{actionFlow?.title}</h1>
          {/* And when displaying the status badge: */}
          <div
            className={`px-2 py-1 rounded-full text-xs ${
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

        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>
                {t("common.deadline")}: {actionFlow.deadline || t("common.notSet")}
              </span>
            </div>
            <div>
              {progress}% {t("common.progress")}
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />
        </div>

        <div className="space-y-8">
          <Accordion type="multiple" defaultValue={actionFlow.sections.map((section) => section.id.toString())}>
            {actionFlow.sections.map((section) => {
              const sectionCompleted = isSectionCompleted(section)

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id.toString()}
                  className={`border rounded-lg mb-6 ${sectionCompleted ? "border-green-300 bg-green-50" : "border-gray-200"}`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center">
                      {sectionCompleted ? (
                        <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center mr-2">
                          {actionFlow.sections.indexOf(section) + 1}
                        </div>
                      )}
                      <span className={`text-lg font-medium ${sectionCompleted ? "text-green-700" : ""}`}>
                        {section.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-6">
                      {section.tasks &&
                        section.tasks.map((task) => {
                          const hasUnread = hasUnreadMessages(task, user?.id)
                          const isExpanded = expandedTask?.sectionId === section.id && expandedTask?.taskId === task.id
                          const messageCount = countMessages(task)
                          const hasUnreadMessagesForTask = hasUnreadMessages(task)

                          // Get task status classes based on approval status
                          const taskStatusClasses = getTaskStatusClasses(task)

                          return (
                            <div
                              key={task.id}
                              className={`space-y-4 p-4 rounded-lg border ${
                                hasUnreadMessagesForTask ? "border-blue-300 bg-blue-50" : taskStatusClasses
                              }`}
                            >
                              {/* Task content */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`task-${task.id}`}
                                    checked={task.completed}
                                    onCheckedChange={(checked) => handleTaskCompletion(section.id, task.id, checked)}
                                    className="text-green-600 data-[state=checked]:bg-green-50 data-[state=checked]:text-green-600 data-[state=checked]:border-green-600"
                                  />
                                  <Label
                                    htmlFor={`task-${task.id}`}
                                    className={`text-lg font-medium ${task.completed && task.approval_status === "approved" ? "text-green-700" : ""}`}
                                  >
                                    {task.title}
                                  </Label>

                                  {/* Add status indicators */}
                                  {task.completed && task.requires_approval && task.approval_status === "pending" && (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                      Waiting for confirmation
                                    </Badge>
                                  )}

                                  {task.completed && task.approval_status === "refused" && (
                                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                                      Needs attention
                                    </Badge>
                                  )}

                                  {hasUnreadMessages(task) && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center">
                                      <MessageCircle className="h-3 w-3 mr-1" />
                                      <span>{t("task.newMessages")}</span>
                                    </Badge>
                                  )}

                                  {isDeadlineApproaching(task) && !task.completed && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                      {t("common.deadlineApproaching")}
                                    </Badge>
                                  )}
                                </div>
                                {/* Rest of the task content */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedTask(isExpanded ? null : { sectionId: section.id, taskId: task.id })
                                  }
                                  className="relative flex items-center gap-1"
                                >
                                  <MessageCircle className="h-5 w-5" />
                                  {messageCount > 0 && (
                                    <span
                                      className={`text-xs font-medium ${hasUnreadMessagesForTask ? "text-blue-600" : "text-gray-600"}`}
                                    >
                                      {messageCount}
                                    </span>
                                  )}
                                  {hasUnreadMessagesForTask && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></span>
                                  )}
                                </Button>
                              </div>

                              {task.description && task.description.trim() !== "" && (
                                <p
                                  className={`ml-6 text-muted-foreground ${task.completed && task.approval_status === "approved" ? "text-green-600" : ""}`}
                                >
                                  {task.description}
                                </p>
                              )}

                              {task.deadline && (
                                <div className="flex items-center ml-6 mt-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                                  <span
                                    className={`${task.completed ? "text-green-600" : new Date(task.deadline) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                                  >
                                    {t("common.taskDeadline")}: {new Date(task.deadline).toLocaleDateString()}
                                    {new Date(task.deadline) < new Date() && !task.completed && (
                                      <span className="ml-2 text-red-500 font-medium">{t("common.overdue")}</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-4 ml-6">
                                {task.inputs &&
                                  task.inputs.length > 0 &&
                                  task.inputs.map((input) => (
                                    <div key={input.id} className="space-y-2">
                                      <Label htmlFor={`input-${input.id}`}>{input.label}</Label>

                                      {input.type === "text" ? (
                                        <Input
                                          id={`input-${input.id}`}
                                          value={formValues[`${task.id}-${input.id}`] || ""}
                                          onChange={(e) => handleInputChange(task.id, input.id, e.target.value)}
                                          placeholder={`${t("common.enter")} ${input.label.toLowerCase()}`}
                                          className={
                                            task.completed && task.approval_status === "approved"
                                              ? "bg-green-50 border-green-200"
                                              : ""
                                          }
                                        />
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="gap-2"
                                              onClick={() => document.getElementById(`file-${input.id}`).click()}
                                              disabled={uploadLoading[`${task.id}-${input.id}`]}
                                            >
                                              {uploadLoading[`${task.id}-${input.id}`] ? (
                                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                              ) : (
                                                <Upload className="h-4 w-4" />
                                              )}
                                              {t("common.chooseFile")}
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                              {!formValues[`${task.id}-${input.id}`] && t("common.noFileChosen")}
                                            </span>
                                          </div>
                                          <input
                                            id={`file-${input.id}`}
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(task.id, input.id, e)}
                                          />

                                          {/* Show uploaded file with pill design */}
                                          {formValues[`${task.id}-${input.id}`] && (
                                            <div className="mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full inline-flex items-center">
                                              <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                              <span className="text-sm text-blue-700 mr-2 truncate max-w-[200px]">
                                                {formValues[`${task.id}-${input.id}`]}
                                              </span>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-5 w-5 rounded-full ml-1"
                                                onClick={() => handleDeleteFile(task.id, input.id)}
                                              >
                                                <Trash2 className="h-3 w-3 text-blue-700" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>

                              {/* Chat area */}
                              {isExpanded && (
                                <div className="mt-6 ml-6">
                                  <TaskChat
                                    flowId={flowId}
                                    sectionId={section.id}
                                    taskId={task.id}
                                    messages={task.messages || []}
                                    currentUser={user}
                                    recipient={adminUser}
                                    onMessageSent={handleMessageSent}
                                    task={task} // Add this prop
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          <div className="flex justify-end mt-8">
            <Link href="/user/dashboard">
              <Button>{t("common.returnToDashboard")}</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
