"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, FileText } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useLanguage } from "@/contexts/language-context"

export function AdminPreviewModal({ isOpen, onClose, actionFlow, users }) {
  const { t } = useLanguage()

  // Calculate progress
  const calculateProgress = () => {
    if (!actionFlow || !Array.isArray(actionFlow.sections)) return 0

    let totalTasks = 0
    let completedTasks = 0

    actionFlow.sections.forEach((section) => {
      if (Array.isArray(section.tasks)) {
        totalTasks += section.tasks.length
        completedTasks += section.tasks.filter((task) => task.completed).length
      }
    })

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  }

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return t("actionFlow.unassigned")
    const user = users.find((user) => user.id === userId)
    return user ? user.name : t("actionFlow.unknownUser")
  }

  // Check if a section is completed
  const isSectionCompleted = (section) => {
    return section.tasks && section.tasks.length > 0 && section.tasks.every((task) => task.completed)
  }

  // Open file in a new tab
  const openFile = (url) => {
    if (url) {
      window.open(url, "_blank")
    }
  }

  if (!actionFlow) return null

  const progress = calculateProgress()
  const isCompleted = progress === 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {t("actionFlow.preview")}: {actionFlow.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center text-muted-foreground">
                <Clock className="mr-1 h-4 w-4" />
                <span>
                  {t("common.deadline")}: {actionFlow.deadline || t("common.notSet")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {t("actionFlow.assignTo")}: {getUserName(actionFlow.user_id)}
                </span>
                <span>
                  {progress}% {t("common.completed").toLowerCase()}
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />
          </div>

          <div className="space-y-8">
            <Accordion type="multiple" defaultValue={actionFlow.sections?.map((section) => section.id.toString())}>
              {actionFlow?.sections?.map((section) => {
                const sectionCompleted = isSectionCompleted(section)

                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id.toString()}
                    className={`border rounded-lg mb-6 ${
                      sectionCompleted ? "border-green-300 bg-green-50" : "border-gray-200"
                    }`}
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
                        {section.tasks?.map((task) => (
                          <div
                            key={task.id}
                            className={`space-y-4 p-4 rounded-lg border ${
                              task.completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`task-${task.id}`}
                                  checked={task.completed}
                                  disabled
                                  className="opacity-70 text-green-600 data-[state=checked]:bg-green-50 data-[state=checked]:text-green-600 data-[state=checked]:border-green-600"
                                />
                                <Label
                                  htmlFor={`task-${task.id}`}
                                  className={`text-lg font-medium ${task.completed ? "text-green-700" : ""}`}
                                >
                                  {task.title}
                                </Label>
                              </div>
                            </div>

                            {task.description && task.description.trim() !== "" && (
                              <p className={`ml-6 text-muted-foreground ${task.completed ? "text-green-600" : ""}`}>
                                {task.description}
                              </p>
                            )}

                            <div className="space-y-4 ml-6">
                              {task.inputs?.map((input) => (
                                <div key={input.id} className="space-y-2">
                                  <Label htmlFor={`input-${input.id}`}>{input.label}</Label>

                                  {input.type === "text" ? (
                                    <Input
                                      id={`input-${input.id}`}
                                      value={input.value || ""}
                                      placeholder={`${t("common.enter")} ${input.label.toLowerCase()}`}
                                      disabled
                                      className="bg-gray-50"
                                    />
                                  ) : (
                                    <div className="space-y-2">
                                      {input.file_url ? (
                                        <div className="mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full inline-flex items-center">
                                          <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                          <span className="text-sm text-blue-700 mr-2">
                                            {input.value || t("common.file")}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 rounded-full ml-1 text-blue-700"
                                            onClick={() => openFile(input.file_url)}
                                          >
                                            {t("common.viewFile")}
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Button type="button" variant="outline" className="gap-2 opacity-70" disabled>
                                            {t("common.chooseFile")}
                                          </Button>
                                          <span className="text-sm text-muted-foreground">
                                            {t("common.noFileChosen")}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
