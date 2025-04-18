"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Clock, CheckCircle, AlertCircle, ListChecks, Layers, MessageCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/language-context"
import { determineFlowStatus } from "@/lib/utils"
import { UserNotifications } from "@/components/user-notifications"
import { Badge } from "@/components/ui/badge"
import { UserHeader } from "@/components/user-header"
import { LibrarySidebar } from "@/components/library-sidebar"

export default function UserDashboard() {
  // State for assigned action flows
  const [assignedFlows, setAssignedFlows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const { t } = useLanguage()
  const supabase = createClientComponentClient()

  // Load current user and their assigned action flows
  useEffect(() => {
    const loadUserAndFlows = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Get the current authenticated user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          console.error("Auth error:", authError)
          setError(`Authentication error: ${authError.message}`)
          toast({
            title: "Authentication Error",
            description: "Please log in again.",
            variant: "destructive",
          })
          return
        }

        if (!authUser) {
          console.log("No authenticated user found")
          setError("No authenticated user found. Please log in.")
          return
        }

        // Get the user profile
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

        setUser(userData)

        // Get action flows assigned to this user
        const { data: flowsData, error: flowsError } = await supabase
          .from("action_flows")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })

        if (flowsError) {
          console.error("Error loading action flows:", flowsError)
          setError(`Error loading action flows: ${flowsError.message}`)
          return
        }

        console.log("Loaded assigned flows:", flowsData)

        // Ensure each flow has a sections property that is an array
        const processedFlows = (flowsData || []).map((flow) => {
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
          return flow
        })

        setAssignedFlows(processedFlows)
      } catch (error) {
        console.error("Error loading user data:", error)
        setError(`Unexpected error: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserAndFlows()
  }, [supabase, toast])

  // Calculate progress for a flow
  const calculateProgress = (flow) => {
    if (!flow || !flow.sections || !Array.isArray(flow.sections) || flow.sections.length === 0) return 0

    let completedTasks = 0
    let totalTasks = 0

    flow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        totalTasks += section.tasks.length
        completedTasks += section.tasks.filter((task) => task && task.completed).length
      }
    })

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  }

  // Count total sections and tasks
  const countSectionsAndTasks = (flow) => {
    if (!flow || !flow.sections || !Array.isArray(flow.sections)) {
      return { sections: 0, tasks: 0 }
    }

    const sections = flow.sections.length
    let tasks = 0

    flow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        tasks += section.tasks.length
      }
    })

    return { sections, tasks }
  }

  // Check if a flow is fully approved
  const isFlowApproved = (flow) => {
    if (!flow || !flow.sections || !Array.isArray(flow.sections)) return false

    // Check if any task requires approval
    let requiresApproval = false
    let allApproved = true

    flow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        section.tasks.forEach((task) => {
          if (task && task.requires_approval) {
            requiresApproval = true
            if (task.completed && task.approval_status !== "approved") {
              allApproved = false
            }
          }
        })
      }
    })

    // If no tasks require approval, or all tasks that require approval are approved
    return !requiresApproval || allApproved
  }

  // Add a function to check for approaching deadlines in tasks
  const hasApproachingDeadlines = (flow) => {
    if (!flow || !flow.sections || !Array.isArray(flow.sections)) return false

    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    return flow.sections.some((section) => {
      if (!section || !Array.isArray(section.tasks)) return false
      return section.tasks.some((task) => {
        if (!task || !task.deadline || task.completed) return false
        const deadline = new Date(task.deadline)
        return deadline > today && deadline <= threeDaysFromNow
      })
    })
  }

  // Count unread messages in a flow
  const countUnreadMessagesInFlow = (flow) => {
    if (!flow || !flow.sections || !Array.isArray(flow.sections)) return 0

    let count = 0
    flow.sections.forEach((section) => {
      if (section && Array.isArray(section.tasks)) {
        section.tasks.forEach((task) => {
          if (task && Array.isArray(task.messages)) {
            count += task.messages.filter((msg) => msg && msg.sender_id !== user?.id && !msg.read).length
          }
        })
      }
    })

    return count
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

  return (
    <div className="flex min-h-screen flex-col">
      <UserHeader user={user} onSignOut={handleSignOut} />
      <main className="flex-1 container py-6 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("dashboard.myFlows")}</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Add notifications at the top */}
        {user && !isLoading && <UserNotifications actionFlows={assignedFlows} userId={user.id} />}

        {/* New layout with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Library sidebar */}
          <div className="lg:col-span-1">
            <LibrarySidebar />
          </div>

          {/* Action flows */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.isArray(assignedFlows) && assignedFlows.length > 0 ? (
                  assignedFlows.map((flow) => {
                    if (!flow) return null

                    const flowStatus = determineFlowStatus(flow)
                    const isCompleted = flowStatus === "Completed"
                    const isApproved = isFlowApproved(flow)
                    const progress = calculateProgress(flow)
                    const { sections, tasks } = countSectionsAndTasks(flow)
                    const unreadMessages = countUnreadMessagesInFlow(flow)
                    const hasDeadlines = hasApproachingDeadlines(flow)

                    // Display the correct status
                    const displayStatus =
                      flow.status === "Draft"
                        ? t("common.notStarted")
                        : flow.status === "In Progress"
                          ? t("common.inProgress")
                          : t("common.completed")

                    return (
                      <Card key={flow.id} className={isCompleted && isApproved ? "border-green-300 bg-green-50" : ""}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex justify-between items-start">
                            <span>{flow.title}</span>
                            <div className="flex gap-1">
                              {unreadMessages > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  <span>{unreadMessages}</span>
                                </Badge>
                              )}
                              {hasDeadlines && (
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Deadline
                                </Badge>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-muted-foreground">
                                <Clock className="mr-1 h-4 w-4" />
                                <span>
                                  {t("common.deadline")}: {flow.deadline || t("common.notSet")}
                                </span>
                              </div>
                              <div className="font-medium">
                                {isCompleted && isApproved ? (
                                  <span className="text-green-600 flex items-center">
                                    <CheckCircle className="mr-1 h-4 w-4" /> {t("common.completed")}
                                  </span>
                                ) : (
                                  <span>
                                    {progress}% {t("common.completed").toLowerCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Progress value={progress} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />

                            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                              <div className="flex items-center">
                                <Layers className="mr-1 h-4 w-4" />
                                <span>
                                  {sections} {t("common.sections").toLowerCase()}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <ListChecks className="mr-1 h-4 w-4" />
                                <span>
                                  {tasks} {t("common.tasks").toLowerCase()}
                                </span>
                              </div>
                            </div>

                            {/* Display status badge */}
                            <div className="flex justify-end">
                              <div
                                className={`px-2 py-1 rounded-full text-xs ${
                                  flowStatus === "Completed" && isApproved
                                    ? "bg-green-100 text-green-800"
                                    : flowStatus === "In Progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {displayStatus}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <div className="w-full flex justify-end">
                            <Link href={`/user/action-flows/${flow.id}`}>
                              <Button variant={isCompleted && isApproved ? "outline" : "default"}>
                                {isCompleted && isApproved ? t("actionFlow.viewDetails") : t("common.continue")}
                              </Button>
                            </Link>
                          </div>
                        </CardFooter>
                      </Card>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">{t("actionFlow.noTasksAssigned")}</h2>
                    <p className="text-muted-foreground">{t("actionFlow.noTasksAssignedMessage")}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Empty right column for visual separation */}
          <div className="lg:col-span-1">{/* This column intentionally left empty as per requirements */}</div>
        </div>
      </main>
    </div>
  )
}
