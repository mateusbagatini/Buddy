"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useLanguage } from "@/contexts/language-context"

type LibraryItem = {
  id: string
  title: string
  description: string | null
  url: string
  display_location: "left" | "right"
  created_at: string
}

export function InformationSidebar() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const supabase = createClientComponentClient()
  const { t } = useLanguage()

  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Fetch library items for the left sidebar
        const { data, error: itemsError } = await supabase
          .from("library_items")
          .select("*")
          .eq("display_location", "left")
          .order("created_at", { ascending: false })

        if (itemsError) {
          console.error("Error loading information items:", itemsError)
          setError(`Error loading information: ${itemsError.message}`)
          return
        }

        setItems(data || [])
      } catch (err) {
        console.error("Unexpected error:", err)
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2" />
            {t("common.information")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start text-sm hover:underline group"
                  >
                    <ExternalLink className="h-4 w-4 mr-2 mt-0.5 text-blue-600 group-hover:text-blue-800" />
                    <div>
                      <div className="font-medium text-blue-600 group-hover:text-blue-800">{item.title}</div>
                      {item.description && <p className="text-muted-foreground text-xs mt-1">{item.description}</p>}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("library.noInformationItems")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
