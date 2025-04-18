"use client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { FileText, Type } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function TaskForm({ task, sectionId, onUpdate, onAddInput }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`task-title-${task.id}`}>{t("actionFlow.taskTitle")}</Label>
        <Input
          id={`task-title-${task.id}`}
          value={task.title}
          onChange={(e) => onUpdate(sectionId, task.id, "title", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`task-description-${task.id}`}>{t("actionFlow.taskDescription")}</Label>
        <Textarea
          id={`task-description-${task.id}`}
          value={task.description}
          onChange={(e) => onUpdate(sectionId, task.id, "description", e.target.value)}
          placeholder={t("actionFlow.taskDescriptionPlaceholder")}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`task-deadline-${task.id}`}>{t("actionFlow.taskDeadline")}</Label>
        <Input
          id={`task-deadline-${task.id}`}
          type="date"
          value={task.deadline || ""}
          onChange={(e) => onUpdate(sectionId, task.id, "deadline", e.target.value)}
          placeholder={t("actionFlow.taskDeadlinePlaceholder")}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`task-requires-approval-${task.id}`}
          checked={task.requires_approval !== false}
          onCheckedChange={(checked) => onUpdate(sectionId, task.id, "requires_approval", checked)}
        />
        <Label htmlFor={`task-requires-approval-${task.id}`}>{t("task.requiresApproval")}</Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("actionFlow.inputs")}</Label>
          <div className="flex space-x-2">
            <Button type="button" onClick={() => onAddInput(sectionId, task.id, "text")} variant="outline" size="sm">
              <Type className="mr-2 h-4 w-4" />
              {t("actionFlow.addTextInput")}
            </Button>
            <Button type="button" onClick={() => onAddInput(sectionId, task.id, "file")} variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              {t("actionFlow.addFileUpload")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
