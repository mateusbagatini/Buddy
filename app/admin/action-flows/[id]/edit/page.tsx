"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Trash2, FileText, Type, Save, ArrowLeft, Smile, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { determineFlowStatus } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase-utils"

// Common emojis for productivity and tasks
const COMMON_EMOJIS = [
  "📋",
  "✅",
  "📝",
  "📌",
  "🔍",
  "📊",
  "📈",
  "🗓️",
  "⏰",
  "🔔",
  "📁",
  "📂",
  "🗂️",
  "📑",
  "📎",
  "✂️",
  "📏",
  "📐",
  "🖇️",
  "📒",
  "📓",
  "📔",
  "📕",
  "📗",
  "📘",
  "📙",
  "📚",
  "📖",
  "🔖",
  "🧾",
  "💼",
  "🗃️",
  "🗄️",
  "📰",
  "🗞️",
  "📄",
  "📃",
  "📜",
  "📯",
  "📮",
  "✉️",
  "📧",
  "📨",
  "📩",
  "📤",
  "📥",
  "📦",
  "📫",
  "📪",
  "📬",
  "📭",
  "🗳️",
  "✏️",
  "✒️",
  "🖋️",
  "🖊️",
  "🖌️",
  "🖍️",
  "📝",
  "💻",
  "🖥️",
  "🖨️",
  "⌨️",
  "🖱️",
  "🖲️",
  "💿",
  "💾",
  "💽",
  "🧮",
  "🎯",
  "🔑",
  "🗝️",
  "🔓",
  "🔏",
  "🔐",
  "🔒",
  "🧰",
  "🧲",
  "⚙️",
  "🔧",
]

export default function EditActionFlow({ params }) {
  const router = useRouter()
  const { toast } = useToast()
  const flowId = params.id
  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [sections, setSections] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Load action flow and users from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError("")

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
            title: "Error",
            description: "Action Flow not found",
            variant: "destructive",
          })
          return
        }

        // Extract emoji from title if present
        let extractedEmoji = ""
        let extractedTitle = flow.title || ""

        // Simple approach to check if the first character might be an emoji
        const firstChar = extractedTitle.charAt(0)
        const isEmoji = firstChar && firstChar.charCodeAt(0) > 127
        const match = isEmoji ? [firstChar] : null

        if (match) {
          extractedEmoji = match[0]
          extractedTitle = extractedTitle.replace(/^./, "").trim()
        }

        // Set form values
        setTitle(extractedTitle)
        setEmoji(extractedEmoji)
        setDescription(flow.description || "")
        setDeadline(flow.deadline || "")
        setSelectedUser(flow.user_id || "")

        // Handle sections (ensure it's an array)
        let parsedSections = flow.sections
        if (!parsedSections) {
          parsedSections = []
        } else if (typeof parsedSections === "string") {
          try {
            parsedSections = JSON.parse(parsedSections)
          } catch (e) {
            console.error("Error parsing sections JSON:", e)
            parsedSections = []
          }
        }

        // Ensure each section has the required properties
        parsedSections = parsedSections.map((section) => ({
          id: section.id || uuidv4(),
          title: section.title || "Untitled Section",
          description: section.description || "",
          tasks: Array.isArray(section.tasks)
            ? section.tasks.map((task) => ({
                id: task.id || uuidv4(),
                title: task.title || "Untitled Task",
                description: task.description || "",
                deadline: task.deadline || "",
                completed: !!task.completed,
                requires_approval: task.requires_approval !== false, // Default to true
                approval_status: task.approval_status || "none",
                inputs: Array.isArray(task.inputs)
                  ? task.inputs.map((input) => ({
                      id: input.id || uuidv4(),
                      type: input.type || "text",
                      label: input.label || (input.type === "file" ? "File Upload" : "Text Input"),
                      value: input.value || "",
                      file_url: input.file_url || "",
                    }))
                  : [],
              }))
            : [],
        }))

        setSections(parsedSections)

        // Load users
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
          title: "Error",
          description: "There was a problem loading the action flow",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [flowId, supabase, toast])

  // Section management functions
  const addSection = () => {
    setSections((prevSections) => [
      ...prevSections,
      {
        id: uuidv4(),
        title: `Section ${prevSections.length + 1}`,
        description: "",
        tasks: [],
      },
    ])
  }

  const removeSection = (sectionId) => {
    setSections((prevSections) => prevSections.filter((section) => section.id !== sectionId))
  }

  const updateSectionTitle = (sectionId, newTitle) => {
    setSections((prevSections) =>
      prevSections.map((section) => (section.id === sectionId ? { ...section, title: newTitle } : section)),
    )
  }

  const updateSectionDescription = (sectionId, newDescription) => {
    setSections((prevSections) =>
      prevSections.map((section) => (section.id === sectionId ? { ...section, description: newDescription } : section)),
    )
  }

  // Task management functions
  const addTask = (sectionId) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: [
                ...section.tasks,
                {
                  id: uuidv4(),
                  title: "New Task",
                  description: "",
                  inputs: [],
                  completed: false,
                  requires_approval: true,
                  approval_status: "none",
                },
              ],
            }
          : section,
      ),
    )
  }

  const removeTask = (sectionId, taskId) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId ? { ...section, tasks: section.tasks.filter((task) => task.id !== taskId) } : section,
      ),
    )
  }

  const updateTaskTitle = (sectionId, taskId, newTitle) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) => (task.id === taskId ? { ...task, title: newTitle } : task)),
            }
          : section,
      ),
    )
  }

  const updateTaskDescription = (sectionId, taskId, newDescription) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) =>
                task.id === taskId ? { ...task, description: newDescription } : task,
              ),
            }
          : section,
      ),
    )
  }

  const updateTaskDeadline = (sectionId, taskId, newDeadline) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) => (task.id === taskId ? { ...task, deadline: newDeadline } : task)),
            }
          : section,
      ),
    )
  }

  const updateTaskRequiresApproval = (sectionId, taskId, requiresApproval) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) =>
                task.id === taskId ? { ...task, requires_approval: requiresApproval } : task,
              ),
            }
          : section,
      ),
    )
  }

  const addInput = (sectionId, taskId, inputType) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      inputs: [
                        ...task.inputs,
                        {
                          id: uuidv4(),
                          type: inputType,
                          label: inputType === "text" ? "Text Input" : "File Upload",
                        },
                      ],
                    }
                  : task,
              ),
            }
          : section,
      ),
    )
  }

  const removeInput = (sectionId, taskId, inputId) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) =>
                task.id === taskId ? { ...task, inputs: task.inputs.filter((input) => input.id !== inputId) } : task,
              ),
            }
          : section,
      ),
    )
  }

  const updateInputLabel = (sectionId, taskId, inputId, newLabel) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              tasks: section.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      inputs: task.inputs.map((input) =>
                        input.id === inputId ? { ...input, label: newLabel } : input,
                      ),
                    }
                  : task,
              ),
            }
          : section,
      ),
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    if (!title) {
      toast({
        title: "Missing information",
        description: "Please provide a title for the action flow",
        variant: "destructive",
      })
      setIsSaving(false)
      return
    }

    try {
      // Prepare the data for Supabase
      const flowData = {
        title: emoji ? `${emoji} ${title}` : title,
        description: description || "",
        deadline: deadline || null,
        user_id: selectedUser === "unassigned" ? null : selectedUser || null,
        sections: sections, // This is already a proper JavaScript array
      }

      // Calculate the status based on task completion
      const status = determineFlowStatus({
        sections: flowData.sections,
      })

      // Convert display status to database status
      const dbStatus = status === "Not Started" ? "Draft" : status === "In Progress" ? "In Progress" : "Completed"

      // Add status to flowData
      flowData.status = dbStatus

      console.log("Updating action flow with data:", flowData)

      // Update the action flow in Supabase
      const { error: updateError } = await supabase.from("action_flows").update(flowData).eq("id", flowId)

      if (updateError) {
        throw new Error(`Failed to update action flow: ${updateError.message}`)
      }

      toast({
        title: "Action Flow Updated",
        description: "Your action flow has been updated successfully",
      })

      // Redirect back to the action flow detail page
      router.push(`/admin/action-flows/${flowId}`)
    } catch (error) {
      console.error("Error updating action flow:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: `There was a problem updating your action flow: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

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

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Link href={`/admin/action-flows/${flowId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Action Flow
            </Button>
          </Link>
          <h1 className="text-2xl font-bold ml-4">Edit Action Flow</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="title">Action Flow Title</Label>
                    <div className="flex">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="mr-2">
                            <Smile className="h-4 w-4 mr-2" />
                            {emoji || "Add Emoji"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="grid grid-cols-8 gap-2">
                            {COMMON_EMOJIS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 rounded"
                                onClick={() => setEmoji(e)}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Commuting Fee Application"
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose of this action flow"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assign To</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger id="assignee">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users
                          .filter((user) => user.role === "user")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Sections & Tasks</h2>
              <Button type="button" onClick={addSection} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <Card key={section.id} className="border">
                  <div className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-muted/50">
                    <div className="flex items-center flex-1">
                      <h4 className="text-sm font-medium">{section.title}</h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(section.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`section-title-${section.id}`}>Section Title</Label>
                        <Input
                          id={`section-title-${section.id}`}
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`section-description-${section.id}`}>Section Description</Label>
                        <Textarea
                          id={`section-description-${section.id}`}
                          value={section.description || ""}
                          onChange={(e) => updateSectionDescription(section.id, e.target.value)}
                          placeholder="Describe this section (optional)"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Tasks</h3>
                        <Button type="button" onClick={() => addTask(section.id)} variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Task
                        </Button>
                      </div>

                      {section.tasks && section.tasks.length > 0 ? (
                        <div className="space-y-3">
                          {section.tasks.map((task, taskIndex) => (
                            <Card key={task.id} className="border">
                              <div className="py-2 px-4 flex flex-row items-center justify-between space-y-0">
                                <h4 className="text-sm font-medium">{task.title}</h4>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTask(section.id, task.id)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <CardContent className="px-4 py-2 text-sm">
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`task-title-${task.id}`}>Task Title</Label>
                                    <Input
                                      id={`task-title-${task.id}`}
                                      value={task.title || ""}
                                      onChange={(e) => updateTaskTitle(section.id, task.id, e.target.value)}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`task-description-${task.id}`}>Task Description</Label>
                                    <Textarea
                                      id={`task-description-${task.id}`}
                                      value={task.description || ""}
                                      onChange={(e) => updateTaskDescription(section.id, task.id, e.target.value)}
                                      placeholder="Describe what the user needs to do"
                                      rows={2}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`task-deadline-${task.id}`}>Task Deadline</Label>
                                    <Input
                                      id={`task-deadline-${task.id}`}
                                      type="date"
                                      value={task.deadline || ""}
                                      onChange={(e) => updateTaskDeadline(section.id, task.id, e.target.value)}
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`task-requires-approval-${task.id}`}
                                      checked={task.requires_approval !== false}
                                      onCheckedChange={(checked) =>
                                        updateTaskRequiresApproval(section.id, task.id, checked)
                                      }
                                    />
                                    <Label htmlFor={`task-requires-approval-${task.id}`}>Requires Admin Approval</Label>
                                  </div>

                                  {task.inputs && task.inputs.length > 0 && (
                                    <div className="mt-3">
                                      <h4 className="text-xs font-medium mb-2">Input Fields:</h4>
                                      <div className="space-y-2">
                                        {task.inputs.map((input) => (
                                          <div key={input.id} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                              {input.type === "text" ? (
                                                <Type className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                              ) : (
                                                <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                              )}
                                              <Input
                                                value={input.label || ""}
                                                onChange={(e) =>
                                                  updateInputLabel(section.id, task.id, input.id, e.target.value)
                                                }
                                                placeholder={
                                                  input.type === "text" ? "Text field label" : "File upload label"
                                                }
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                            <Button
                                              type="button"
                                              onClick={() => removeInput(section.id, task.id, input.id)}
                                              variant="ghost"
                                              size="sm"
                                              className="text-destructive h-6 w-6 p-0"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-3 flex space-x-2">
                                    <Button
                                      type="button"
                                      onClick={() => addInput(section.id, task.id, "text")}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-7"
                                    >
                                      <Type className="mr-1 h-3 w-3" />
                                      Add Text Input
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => addInput(section.id, task.id, "file")}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-7"
                                    >
                                      <FileText className="mr-1 h-3 w-3" />
                                      Add File Upload
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No tasks added yet. Click "Add Task" to create one.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {sections.length === 0 && (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-muted-foreground">No sections added yet. Click "Add Section" to create one.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href={`/admin/action-flows/${flowId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
