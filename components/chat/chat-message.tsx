import { cn } from "@/lib/utils"

type ChatMessageProps = {
  message: string
  isUser: boolean
  timestamp?: Date
}

export function ChatMessage({ message, isUser, timestamp = new Date() }: ChatMessageProps) {
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 mb-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <p className="text-sm">{message}</p>
        <div className={cn("text-xs mt-1", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  )
}
