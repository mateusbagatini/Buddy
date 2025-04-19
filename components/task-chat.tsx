"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { sendTaskMessage, markMessagesAsRead } from "@/lib/message-utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock } from "lucide-react"

export function TaskChat({
  flowId,
  sectionId,
  taskId,
  messages = [],
  currentUser,
  recipient,
  onMessageSent,
  task, // Add this prop
}) {
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollAreaRef = useRef(null)
  const { t } = useLanguage()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [messages])

  // Mark messages as read when component mounts
  useEffect(() => {
    const markAsRead = async () => {
      if (flowId && sectionId && taskId && currentUser?.id) {
        try {
          await markMessagesAsRead(flowId, sectionId, taskId, currentUser.id)
          // If there's a callback for updating the UI after marking messages as read
          if (onMessageSent) {
            // This is a bit of a hack - we're using the onMessageSent callback to trigger a UI update
            // A better approach would be to have a separate callback for marking messages as read
            onMessageSent({ type: "mark_read" })
          }
        } catch (error) {
          console.error("Error marking messages as read:", error)
        }
      }
    }

    markAsRead()
  }, [flowId, sectionId, taskId, currentUser?.id, onMessageSent])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return

    setIsSending(true)
    try {
      const result = await sendTaskMessage(
        flowId,
        sectionId,
        taskId,
        newMessage.trim(),
        {
          id: currentUser.id,
          name: currentUser.name || currentUser.email,
          role: currentUser.role,
        },
        recipient
          ? {
              id: recipient.id,
              name: recipient.name || recipient.email,
              role: recipient.role,
            }
          : null,
      )

      if (result.success) {
        setNewMessage("")
        if (onMessageSent && typeof onMessageSent === "function") {
          onMessageSent(result.message)
        }
      } else {
        console.error("Error sending message:", result.error)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  // Format date
  const formatMessageDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">{t("task.messages")}</div>
        {task?.deadline && (
          <div className="text-xs flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span className={new Date(task.deadline) < new Date() && !task.completed ? "text-red-500" : ""}>
              {t("common.taskDeadline")}: {new Date(task.deadline).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 border rounded-md flex flex-col overflow-hidden bg-white">
        <ScrollArea className="flex-1 p-3 h-[250px]" ref={scrollAreaRef}>
          {!Array.isArray(messages) || messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">{t("task.noMessages")}</div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                if (!message) return null

                const isCurrentUser = message.sender_id === currentUser?.id
                const isAdmin =
                  message.sender_name?.includes("Admin") || (currentUser?.role === "admin" && isCurrentUser)

                return (
                  <div
                    key={message.id || index}
                    className={`flex items-start gap-2 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar className={`h-8 w-8 ${isAdmin ? "bg-blue-100" : "bg-green-100"}`}>
                      <AvatarFallback className={isAdmin ? "text-blue-600" : "text-green-600"}>
                        {getInitials(message.sender_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%]`}>
                      <div
                        className={`px-3 py-2 rounded-lg shadow-sm ${
                          isCurrentUser
                            ? "bg-blue-500 text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        }`}
                      >
                        <div className="text-xs font-medium mb-1">{message.sender_name || "Unknown"}</div>
                        <div className="text-sm whitespace-pre-wrap break-words">{message.text || ""}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {message.timestamp ? formatMessageDate(message.timestamp) : ""}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("task.typeMessage")}
              className="min-h-[60px] resize-none bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
