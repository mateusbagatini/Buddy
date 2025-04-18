"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { PlusCircle, ExternalLink, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminHeader } from "@/components/admin-header"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"
import { UploadFileDialog } from "@/components/upload-file-dialog"

// Define the LibraryItem type
type LibraryItem = {
  id: string
  title: string
  description: string | null
  url: string
  file_path: string | null
  type: "link" | "file"
  created_at: string
}

export default function AdminLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [tableExists, setTableExists] = useState(true)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentItem, setCurrentItem] = useState<Partial<LibraryItem>>({
    title: "",
    description: "",
    url: "",
    file_path: null,
    type: "link",
  })
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const { t } = useLanguage()
  const [file, setFile] = useState<File | null>(null)

  // Load library items
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Check if user is admin
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("You must be logged in to view this page")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()

        if (userError || userData?.role !== "admin") {
          setError("You must be an admin to view this page")
          return
        }

        // Fetch library items
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

    loadItems()
  }, [supabase])

  // Handle form submission for links
  const handleLinkSubmit = async (title: string, description: string, url: string) => {
    try {
      if (!title || !url) {
        toast({
          title: "Error",
          description: "Title and URL are required",
          variant: "destructive",
        })
        return
      }

      // Validate URL format
      try {
        new URL(url)
      } catch (err) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL including http:// or https://",
          variant: "destructive",
        })
        return
      }

      if (isEditMode && currentItem.id) {
        // Update existing item
        const { error } = await supabase
          .from("library_items")
          .update({
            title: title,
            description: description,
            url: url,
            type: "link",
            file_path: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentItem.id)

        if (error) {
          throw error
        }

        // Update local state
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  title: title,
                  description: description || null,
                  url: url,
                  type: "link",
                  file_path: null,
                }
              : item,
          ),
        )

        toast({
          title: "Success",
          description: "Library item updated successfully",
        })
      } else {
        // Create new item
        const { data, error } = await supabase
          .from("library_items")
          .insert({
            title: title,
            description: description,
            url: url,
            type: "link",
          })
          .select()

        if (error) {
          throw error
        }

        // Update local state
        setItems((prevItems) => [data[0], ...prevItems])

        toast({
          title: "Success",
          description: "Library item created successfully",
        })
      }

      // Reset form and close dialog
      setCurrentItem({ title: "", description: "", url: "", file_path: null, type: "link" })
      setIsLinkDialogOpen(false)
      setIsEditMode(false)
    } catch (err) {
      console.error("Error saving library item:", err)
      toast({
        title: "Error",
        description: `Failed to save library item: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    }
  }

  // Handle form submission for files
  const handleFileUpload = async (title: string, description: string, file: File | null) => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    try {
      // Upload file to storage
      const filePath = `library/${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("task-files")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: fileData } = supabase.storage.from("task-files").getPublicUrl(filePath)

      // Create new item in database
      const { data, error } = await supabase
        .from("library_items")
        .insert({
          title: title,
          description: description,
          type: "file",
          url: fileData.publicUrl, // Store the public URL
          file_path: filePath, // Store the file path
        })
        .select()

      if (error) {
        throw error
      }

      // Update local state
      setItems((prevItems) => [data[0], ...prevItems])

      toast({
        title: "Success",
        description: "File uploaded and library item created successfully",
      })
    } catch (err) {
      console.error("Error uploading file:", err)
      toast({
        title: "Error",
        description: `Failed to upload file: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    } finally {
      setIsFileDialogOpen(false)
    }
  }

  // Handle item deletion
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this library item?")) {
      return
    }

    try {
      const { error } = await supabase.from("library_items").delete().eq("id", id)

      if (error) {
        throw error
      }

      // Update local state
      setItems((prevItems) => prevItems.filter((item) => item.id !== id))

      toast({
        title: "Success",
        description: "Library item deleted successfully",
      })
    } catch (err) {
      console.error("Error deleting library item:", err)
      toast({
        title: "Error",
        description: `Failed to delete library item: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    }
  }

  // Handle edit button click
  const handleEdit = (item: LibraryItem) => {
    setCurrentItem(item)
    setIsEditMode(true)
    setIsLinkDialogOpen(item.type === "link")
    setIsFileDialogOpen(item.type === "file")
  }

  // Handle dialog close
  const handleDialogClose = () => {
    setIsLinkDialogOpen(false)
    setIsFileDialogOpen(false)
    setCurrentItem({ title: "", description: "", url: "", file_path: null, type: "link" })
    setIsEditMode(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    } else {
      setFile(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Library Management</h1>
          <div className="flex gap-2">
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!tableExists}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Information Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit Library Item" : "Create New Library Item"}</DialogTitle>
                  <DialogDescription>
                    {isEditMode
                      ? "Update the details of this library item."
                      : "Add a new item to your library. This will be visible to all users."}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleLinkSubmit(currentItem.title, currentItem.description, currentItem.url)
                  }}
                >
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={currentItem.title || ""}
                        onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                        placeholder="Enter item title"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={currentItem.description || ""}
                        onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                        placeholder="Enter item description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        value={currentItem.url || ""}
                        onChange={(e) => setCurrentItem({ ...currentItem, url: e.target.value })}
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!tableExists}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Information File
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit Library Item" : "Create New Library Item"}</DialogTitle>
                  <DialogDescription>
                    {isEditMode
                      ? "Update the details of this library item."
                      : "Add a new item to your library. This will be visible to all users."}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleFileUpload(currentItem.title, currentItem.description, file)
                  }}
                >
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={currentItem.title || ""}
                        onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                        placeholder="Enter item title"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={currentItem.description || ""}
                        onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                        placeholder="Enter item description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="file">File</Label>
                      <Input type="file" id="file" onChange={handleFileChange} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!tableExists && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The library_items table does not exist. Please{" "}
              <Link href="/setup-library-table" className="font-medium underline">
                set up the library table
              </Link>{" "}
              first.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tableExists ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.length > 0 ? (
              items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-start">
                      <span>{item.title}</span>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>{new Date(item.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description || "No description provided."}</p>
                  </CardContent>
                  <CardFooter>
                    {item.type === "link" ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {item.url}
                      </a>
                    ) : (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {item.file_path}
                      </a>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 col-span-2">
                <h2 className="text-xl font-semibold mb-2">No Library Items</h2>
                <p className="text-muted-foreground">
                  Create your first library item by clicking the "Create New Item" button.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Library Table Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The library_items table does not exist in your database. Please set it up first.
            </p>
            <Link href="/setup-library-table">
              <Button>Setup Library Table</Button>
            </Link>
          </div>
        )}
      </main>
      <UploadFileDialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen} onSubmit={handleFileUpload} />
    </div>
  )
}
