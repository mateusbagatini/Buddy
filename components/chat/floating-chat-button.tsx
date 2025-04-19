"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { ChatInterface } from "./chat-interface"
import { useLanguage } from "@/contexts/language-context"

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="animate-in slide-in-from-bottom-10 duration-300">
          <ChatInterface onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label={t("chat.openChat")}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
