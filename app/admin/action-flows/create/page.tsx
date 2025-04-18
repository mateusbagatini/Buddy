"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Save, ArrowLeft, Smile } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion } from "@/components/ui/accordion"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { v4 as uuidv4 } from "uuid"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SectionEditor } from "@/components/section-editor"
import { PersistentInput } from "@/components/persistent-input"
import { PersistentTextarea } from "@/components/persistent-textarea"

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

export default function CreateActionFlow() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [sections, setSections] = useState([
    {
      id: uuidv4(),
      title: "Initial Section",
      description: "",
      tasks: [
        {
          id: uuidv4(),
          title: "First Task",
          description: "",
          inputs: [],
          completed: false,
          requires_approval: true,
        },
      ],
    },
  ])

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState(null)
  const supabase = createClientComponentClient()
  const [isSaving, setIsSaving] = useState(false)

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Load users from Supabase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("role", "user").eq("status", "active")

        if (error) {
          console.error("Error loading users:", error)
          return
        }

        console.log("Loaded users:", data)
        setUsers(data || [])
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [supabase])

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

  // Handle section drag end
  const handleSectionDragEnd = (event) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        // Create a new array with the item moved to the new position
        const newItems = [...items]
        const [removed] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, removed)

        return newItems
      })
    }
  }

  // Handle task drag end
  const handleTaskDragEnd = (sectionId, event) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSections((sections) => {
        return sections.map((section) => {
          if (section.id !== sectionId) return section

          const tasks = [...section.tasks]
          const oldIndex = tasks.findIndex((task) => task.id === active.id)
          const newIndex = tasks.findIndex((task) => task.id === over.id)

          const [removed] = tasks.splice(oldIndex, 1)
          tasks.splice(newIndex, 0, removed)

          return {
            ...section,
            tasks,
          }
        })
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setDebugInfo(null)

    if (!title) {
      toast({
        title: "Missing information",
        description: "Please provide a title for the action flow",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // Prepare the data for Supabase - ensure proper structure
      const flowData = {
        title: emoji ? `${emoji} ${title}` : title,
        description: description || "",
        deadline: deadline || null,
        user_id: selectedUser === "unassigned" ? null : selectedUser || null,
        // Ensure sections is a valid JSON array
        sections: Array.isArray(sections) ? sections : [],
        status: "Draft",
      }

      console.log("Creating action flow with data:", flowData)
      setDebugInfo({ flowData })

      // First, check if we can access the action_flows table
      const { data: checkData, error: checkError } = await supabase
        .from("action_flows")
        .select("count")
        .limit(1)
        .single()

      if (checkError) {
        console.error("Error checking action_flows table:", checkError)
        setDebugInfo((prev) => ({ ...prev, checkError }))

        // If the table doesn't exist, we need to create it
        if (checkError.message.includes("does not exist")) {
          throw new Error("The action_flows table does not exist. Please run the setup SQL.")
        }

        // Otherwise, there might be a permission issue
        throw new Error(`Cannot access action_flows table: ${checkError.message}`)
      }

      // Create the new action flow in Supabase
      const { data: newFlow, error: insertError } = await supabase
        .from("action_flows")
        .insert([flowData]) // Ensure we're passing an array here
        .select()

      if (insertError) {
        console.error("Error creating action flow:", insertError)
        setDebugInfo((prev) => ({ ...prev, insertError }))
        throw new Error(`Failed to create action flow: ${insertError.message}`)
      }

      console.log("Action flow created successfully:", newFlow)
      setDebugInfo((prev) => ({ ...prev, newFlow }))

      // If a user is assigned, send notification
      if (selectedUser && selectedUser !== "unassigned") {
        // Get the user details
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", selectedUser)
          .single()

        if (userError) {
          console.error("Error fetching assigned user:", userError)
        } else if (userData) {
          // In a real app, you would send an email notification here
          console.log("Would send email notification to:", userData.email)
        }
      }

      toast({
        title: "Action Flow Created",
        description: "Your action flow has been created successfully",
      })

      // Redirect back to the action flows list
      setTimeout(() => {
        router.push("/admin/dashboard")
      }, 1000)
    } catch (error) {
      console.error("Error saving action flow:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: `There was a problem saving your action flow: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold ml-4">Create Action Flow</h1>
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
                      <PersistentInput
                        id="title"
                        value={title}
                        onChange={setTitle}
                        placeholder="e.g., Commuting Fee Application"
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <PersistentTextarea
                    id="description"
                    value={description}
                    onChange={setDescription}
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

            <Accordion type="multiple" className="space-y-4" defaultValue={sections.map((s) => `section-${s.id}`)}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section, sectionIndex) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      sectionIndex={sectionIndex}
                      removeSection={removeSection}
                      updateSectionTitle={updateSectionTitle}
                      updateSectionDescription={updateSectionDescription}
                      addTask={addTask}
                      removeTask={removeTask}
                      updateTaskTitle={updateTaskTitle}
                      updateTaskDescription={updateTaskDescription}
                      updateTaskDeadline={updateTaskDeadline}
                      updateTaskRequiresApproval={updateTaskRequiresApproval}
                      addInput={addInput}
                      removeInput={removeInput}
                      updateInputLabel={updateInputLabel}
                      handleTaskDragEnd={handleTaskDragEnd}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </Accordion>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href="/admin/dashboard">
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
                  Create Action Flow
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
