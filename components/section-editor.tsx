"use client"

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PersistentInput } from "@/components/persistent-input"
import { PersistentTextarea } from "@/components/persistent-textarea"
import { GripVertical, PlusCircle, Trash2 } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { TaskEditor } from "@/components/task-editor"

export function SectionEditor({
  section,
  sectionIndex,
  removeSection,
  updateSectionTitle,
  updateSectionDescription,
  addTask,
  removeTask,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskDeadline,
  updateTaskRequiresApproval,
  addInput,
  removeInput,
  updateInputLabel,
  handleTaskDragEnd,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" : "static",
    opacity: isDragging ? 0.8 : 1,
  }

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

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <AccordionItem value={`section-${section.id}`} className="border rounded-lg">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center flex-1">
            <div className="cursor-grab p-2 hover:bg-gray-100 rounded mr-2" {...attributes} {...listeners}>
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            <AccordionTrigger className="py-2 flex-1">
              <div className="flex items-center">
                <span className="font-medium">{section.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({section.tasks ? section.tasks.length : 0} tasks)
                </span>
              </div>
            </AccordionTrigger>
          </div>
          <Button
            type="button"
            onClick={() => removeSection(section.id)}
            variant="ghost"
            size="sm"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`section-title-${section.id}`}>Section Title</Label>
              <PersistentInput
                id={`section-title-${section.id}`}
                value={section.title}
                onChange={(value) => updateSectionTitle(section.id, value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`section-description-${section.id}`}>Section Description (Optional)</Label>
              <PersistentTextarea
                id={`section-description-${section.id}`}
                value={section.description || ""}
                onChange={(value) => updateSectionDescription(section.id, value)}
                placeholder="Describe this section (optional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tasks</Label>
                <Button type="button" onClick={() => addTask(section.id)} variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleTaskDragEnd(section.id, event)}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={section.tasks?.map((task) => task.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {section.tasks &&
                      section.tasks.map((task, taskIndex) => (
                        <TaskEditor
                          key={task.id}
                          task={task}
                          taskIndex={taskIndex}
                          sectionId={section.id}
                          removeTask={removeTask}
                          updateTaskTitle={updateTaskTitle}
                          updateTaskDescription={updateTaskDescription}
                          updateTaskDeadline={updateTaskDeadline}
                          updateTaskRequiresApproval={updateTaskRequiresApproval}
                          addInput={addInput}
                          removeInput={removeInput}
                          updateInputLabel={updateInputLabel}
                        />
                      ))}
                  </SortableContext>
                </DndContext>

                {(!section.tasks || section.tasks.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No tasks added yet. Click "Add Task" to create one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  )
}
