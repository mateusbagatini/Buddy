"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type LibraryItem = {
  id: string
  title: string
  description: string | null
  url: string
}

export function LibrarySidebar() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [tableExists, setTableExists] = useState(true)
  const supabase = createClientComponentClient()
  const { t } = useLanguage()

  useEffect(() => {
    const loadLibraryItems = async () => {
      try {
        setIsLoading(true)
        setError("")

        const { data, error: itemsError } = await supabase
          .from("library_items")
          .select("*")
          .order("created_at", { ascending: false })

        if (itemsError) {
          console.error("Error loading library items:", itemsError)

          // Check if the error is because the table doesn't exist
          if (itemsError.message.includes("does not exist")) {
            setTableExists(false)
            setError("The library_items table does not exist. Please set it up first.")
          } else {
            setError(`Error loading library items: ${itemsError.message}`)
          }
          return
        }

        setItems(data || [])
        setTableExists(true)
      } catch (err) {
        console.error("Unexpected error:", err)
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadLibraryItems()
  }, [supabase])

  if (!tableExists) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full">
        <h2 className="text-lg font-semibold mb-4">Useful Resources</h2>
        <div className="p-4 text-sm text-red-500 mb-4">The library_items table does not exist in your database.</div>
        <Link href="/setup-library-table">
          <Button size="sm" variant="outline">
            Setup Library Table
          </Button>
        </Link>
      </div>
    )
  }

  if (error && tableExists) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full">
        <h2 className="text-lg font-semibold mb-4">Useful Resources</h2>
        <div className="p-4 text-sm text-red-500">Failed to load library items. Please try again later.</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">Useful Resources</h2>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="border-b pb-3 last:border-b-0 last:pb-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
              >
                <div className="font-medium text-blue-600 hover:underline flex items-center">
                  <span className="truncate">{item.title}</span>
                  <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                </div>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No library resources available.</p>
      )}

      {/* Emergency Resources Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Emergency Resources</h2>
        <ul className="space-y-4">
          <li>
            <div className="flex items-start">
              <ExternalLink className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-medium text-red-500">
                  <a
                    href="https://chatgpt.com/g/g-67492574f6e88191a786f9be1c8fbf45-bousai-buddy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Bousai Buddy
                  </a>
                </p>
                <p className="text-sm text-gray-500 mt-1">AI assistant for disaster preparedness in Japan</p>
              </div>
            </div>
          </li>
          <li>
            <div className="flex items-start">
              <ExternalLink className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-medium text-red-500">
                  <a href="https://evacuation-site-finder.vercel.app/" target="_blank" rel="noopener noreferrer">
                    Evacuation Site Finder
                  </a>
                </p>
                <p className="text-sm text-gray-500 mt-1">Find nearby evacuation sites in case of emergency</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
