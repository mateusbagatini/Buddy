"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { GripVertical, Trash2, Type, FileText } from "lucide-react"
import { PersistentInput } from "@/components/persistent-input"
import { PersistentTextarea } from "@/components/persistent-textarea"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function TaskEditor({
  task,
  taskIndex,
  sectionId,
  removeTask,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskDeadline,
  updateTaskRequiresApproval,
  addInput,
  removeInput,
  updateInputLabel,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" : "static",
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="cursor-grab p-2 hover:bg-gray-100 rounded mr-2" {...attributes} {...listeners}>
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <h4 className="font-medium">Task {taskIndex + 1}</h4>
          </div>
          <Button
            type="button"
            onClick={() => removeTask(sectionId, task.id)}
            variant="ghost"
            size="sm"
            className="text-destructive h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`task-title-${task.id}`}>Task Title</Label>
            <PersistentInput
              id={`task-title-${task.id}`}
              value={task.title || ""}
              onChange={(value) => updateTaskTitle(sectionId, task.id, value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`task-description-${task.id}`}>Task Description</Label>
            <PersistentTextarea
              id={`task-description-${task.id}`}
              value={task.description || ""}
              onChange={(value) => updateTaskDescription(sectionId, task.id, value)}
              placeholder="Describe what the user needs to do"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`task-deadline-${task.id}`}>Task Deadline</Label>
            <PersistentInput
              id={`task-deadline-${task.id}`}
              type="date"
              value={task.deadline || ""}
              onChange={(value) => updateTaskDeadline(sectionId, task.id, value)}
              placeholder="Task Deadline"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={`task-requires-approval-${task.id}`}
              checked={task.requires_approval === true}
              onCheckedChange={(checked) => updateTaskRequiresApproval(sectionId, task.id, checked)}
            />
            <Label htmlFor={`task-requires-approval-${task.id}`}>Requires Admin Approval</Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Input Fields</Label>
              <div className="flex space-x-2">
                <Button type="button" onClick={() => addInput(sectionId, task.id, "text")} variant="outline" size="sm">
                  <Type className="mr-2 h-4 w-4" />
                  Add Text Input
                </Button>
                <Button type="button" onClick={() => addInput(sectionId, task.id, "file")} variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Add File Upload
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {task.inputs && task.inputs.length > 0 ? (
                task.inputs.map((input) => (
                  <div key={input.id} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <PersistentInput
                        value={input.label || ""}
                        onChange={(value) => updateInputLabel(sectionId, task.id, input.id, value)}
                        placeholder={input.type === "text" ? "Text field label" : "File upload label"}
                      />
                    </div>
                    <div className="flex items-center justify-center px-3 py-2 border rounded-md bg-muted">
                      {input.type === "text" ? (
                        <Type className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeInput(sectionId, task.id, input.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  No input fields added yet. Click "Add Text Input" or "Add File Upload" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
