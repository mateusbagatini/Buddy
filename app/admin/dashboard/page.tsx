"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, CheckCircle, Clock, Users, Trash2, AlertTriangle } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { refreshSession } from "@/lib/auth-utils"
import { determineFlowStatus } from "@/lib/utils"

export default function AdminDashboard() {
  // State for action flows
  const [actionFlows, setActionFlows] = useState([])
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [flowToDelete, setFlowToDelete] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [error, setError] = useState("")
  const [tableExists, setTableExists] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const { toast } = useToast()

  const supabase = createClientComponentClient()

  // Check user authentication and role
  useEffect(() => {
    const checkUser = async () => {
      try {
        // First try to refresh the session
        const refreshResult = await refreshSession()

        if (!refreshResult.success) {
          setError(`Authentication error: ${refreshResult.error || "Unknown error"}`)
          toast({
            title: "Authentication Error",
            description: "Your session has expired or you're not logged in. Please log in again.",
            variant: "destructive",
          })
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = "/auth-check"
          }, 2000)
          return
        }

        // Now check the user's role
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("id", refreshResult.user.id)
          .single()

        if (profileError) {
          setError(`Profile error: ${profileError.message}`)
          toast({
            title: "Profile Error",
            description: "Could not retrieve your user profile.",
            variant: "destructive",
          })
          return
        }

        setUserInfo({
          authenticated: true,
          user: refreshResult.user,
          profile,
          isAdmin: profile.role === "admin",
        })

        // Only show error if not admin, but continue loading data regardless
        if (profile.role !== "admin") {
          console.log("User role:", profile.role) // Add this for debugging
          setError("You don't have admin privileges")
          toast({
            title: "Access Warning",
            description: "You don't have admin privileges, but you can still view the dashboard.",
            variant: "warning",
          })
        }

        // Load data regardless of admin status - we'll handle permissions at the database level
        loadData(refreshResult.user.id)
      } catch (error) {
        console.error("Error checking user:", error)
        setError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    checkUser()
  }, [supabase, toast])

  // Load action flows and users from Supabase
  const loadData = async (userId) => {
    setIsLoading(true)
    setError((prev) => prev) // Keep any existing errors
    try {
      // Fetch action flows
      const { data: flowsData, error: flowsError } = await supabase
        .from("action_flows")
        .select("*")
        .order("created_at", { ascending: false })

      if (flowsError) {
        console.error("Error loading action flows:", flowsError)

        // Check if the table doesn't exist
        if (flowsError.message && flowsError.message.includes("does not exist")) {
          setTableExists(false)
          setError(
            (prev) => prev + "The action_flows table doesn't exist. Please visit /fix-action-flows-table to create it.",
          )
        } else {
          setError((prev) => prev + `Failed to load action flows: ${flowsError.message}`)
        }

        toast({
          title: "Error",
          description: "Failed to load action flows. Please try again.",
          variant: "destructive",
        })
      } else {
        console.log("Loaded action flows:", flowsData)
        setActionFlows(flowsData || [])
        setTableExists(true)
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase.from("users").select("*")

      if (usersError) {
        console.error("Error loading users:", usersError)
        setError((prev) => prev + `Failed to load users: ${usersError.message}`)
      } else {
        setUsers(usersData || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError((prev) => prev + `Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats
  const completedFlows = actionFlows.filter((flow) => determineFlowStatus(flow) === "Completed").length
  const activeUsers = users.filter((user) => user.status === "active").length

  // Count total tasks across all action flows
  const countTasks = (flow) => {
    if (!flow || !flow.sections) return 0

    try {
      // Handle both string JSON and already parsed objects
      const sectionsArray = typeof flow.sections === "string" ? JSON.parse(flow.sections) : flow.sections

      if (!Array.isArray(sectionsArray)) return 0

      return sectionsArray.reduce((total, section) => {
        if (!section || !section.tasks) return total
        return total + (Array.isArray(section.tasks) ? section.tasks.length : 0)
      }, 0)
    } catch (error) {
      console.error("Error counting tasks:", error)
      return 0
    }
  }

  // Count completed tasks
  const countCompletedTasks = (flow) => {
    if (!flow || !flow.sections) return 0

    try {
      // Handle both string JSON and already parsed objects
      const sectionsArray = typeof flow.sections === "string" ? JSON.parse(flow.sections) : flow.sections

      if (!Array.isArray(sectionsArray)) return 0

      return sectionsArray.reduce((total, section) => {
        if (!section || !section.tasks || !Array.isArray(section.tasks)) return total
        return total + section.tasks.filter((task) => task && task.completed).length
      }, 0)
    } catch (error) {
      console.error("Error counting completed tasks:", error)
      return 0
    }
  }

  // Handle deleting an action flow
  const handleDeleteFlow = (flow) => {
    setFlowToDelete(flow)
    setIsDeleteDialogOpen(true)
  }

  // Confirm deletion of an action flow
  const confirmDeleteFlow = async () => {
    if (!flowToDelete) return

    try {
      const { error } = await supabase.from("action_flows").delete().eq("id", flowToDelete.id)

      if (error) {
        throw error
      }

      // Remove the deleted flow from the state
      setActionFlows(actionFlows.filter((flow) => flow.id !== flowToDelete.id))

      toast({
        title: "Action Flow Deleted",
        description: `"${flowToDelete.title}" has been deleted successfully.`,
      })
    } catch (error) {
      console.error("Error deleting action flow:", error)
      toast({
        title: "Error",
        description: `Failed to delete action flow: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setFlowToDelete(null)
    }
  }

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return "Unassigned"
    const user = users.find((user) => user.id === userId)
    return user ? user.name : "Unknown User"
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            {!tableExists && (
              <Link href="/fix-action-flows-table">
                <Button variant="destructive">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Fix Database Tables
                </Button>
              </Link>
            )}
            <Link href="/admin/action-flows/create">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Action Flow
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        )}

        {!tableExists && (
          <Alert variant="warning" className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              The action_flows table doesn't exist in your database. Please visit the{" "}
              <Link href="/fix-action-flows-table" className="font-medium underline">
                Fix Database Tables
              </Link>{" "}
              page to create it.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Action Flows</CardTitle>
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{actionFlows.length}</div>
              <p className="text-xs text-muted-foreground">
                +{actionFlows.length > 3 ? actionFlows.length - 3 : 0} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Flows</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedFlows}</div>
              <p className="text-xs text-muted-foreground">+{completedFlows} from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">+1 new user this week</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">Recent Action Flows</h2>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tableExists ? (
          <div className="space-y-4">
            {actionFlows.map((flow) => {
              // Determine the actual status based on task completion
              const flowStatus = determineFlowStatus(flow)
              const isCompleted = flowStatus === "Completed"

              return (
                <Card key={flow.id} className={isCompleted ? "border-green-300 bg-green-50" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{flow.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>Deadline: {flow.deadline || "Not set"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <Link href={`/admin/action-flows/${flow.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteFlow(flow)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assigned to:</span>{" "}
                        <span className="font-medium">{getUserName(flow.user_id)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sections:</span>{" "}
                        <span className="font-medium">
                          {flow.sections && Array.isArray(flow.sections) ? flow.sections.length : 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tasks:</span>{" "}
                        <span className="font-medium">{countTasks(flow)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>{" "}
                        <span className="font-medium">
                          {countCompletedTasks(flow)}/{countTasks(flow)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {actionFlows.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No action flows found. Create your first one!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">The action_flows table doesn't exist in your database.</p>
            <Link href="/fix-action-flows-table">
              <Button>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Fix Database Tables
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action Flow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{flowToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFlow}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
