"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { AdminHeader } from "@/components/admin-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, PlusCircle, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { type FAQ, getFaqs, createFaq, updateFaq, deleteFaq } from "@/lib/supabase-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [tableExists, setTableExists] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentFaq, setCurrentFaq] = useState<Partial<FAQ>>({
    question: "",
    answer: "",
    category: "",
    is_published: true,
    priority: 0,
  })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { toast } = useToast()

  // Load FAQs
  useEffect(() => {
    const loadFaqs = async () => {
      try {
        setIsLoading(true)
        setError("")

        const data = await getFaqs()
        setFaqs(data)
        setTableExists(true)

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((faq) => faq.category).filter(Boolean) as string[]))
        setCategories(uniqueCategories)
      } catch (err) {
        console.error("Error loading FAQs:", err)

        // Check if the error is because the table doesn't exist
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (errorMessage.includes("does not exist")) {
          setTableExists(false)
          setError("The faqs table does not exist. Please set it up first.")
        } else {
          setError(`Error loading FAQs: ${errorMessage}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadFaqs()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tableExists) {
      toast({
        title: "Error",
        description: "The faqs table does not exist. Please set it up first.",
        variant: "destructive",
      })
      return
    }

    try {
      if (!currentFaq.question || !currentFaq.answer) {
        toast({
          title: "Error",
          description: "Question and answer are required",
          variant: "destructive",
        })
        return
      }

      if (isEditMode && currentFaq.id) {
        // Update existing FAQ
        const updatedFaq = await updateFaq(currentFaq.id, {
          question: currentFaq.question,
          answer: currentFaq.answer,
          category: currentFaq.category || null,
          is_published: currentFaq.is_published,
          priority: currentFaq.priority,
        })

        // Update local state
        setFaqs((prevFaqs) => prevFaqs.map((faq) => (faq.id === updatedFaq.id ? updatedFaq : faq)))

        toast({
          title: "Success",
          description: "FAQ updated successfully",
        })
      } else {
        // Create new FAQ
        const newFaq = await createFaq({
          question: currentFaq.question,
          answer: currentFaq.answer,
          category: currentFaq.category || null,
          is_published: currentFaq.is_published || true,
          priority: currentFaq.priority || 0,
        })

        // Update local state
        setFaqs((prevFaqs) => [newFaq, ...prevFaqs])

        // Update categories if needed
        if (newFaq.category && !categories.includes(newFaq.category)) {
          setCategories((prev) => [...prev, newFaq.category!])
        }

        toast({
          title: "Success",
          description: "FAQ created successfully",
        })
      }

      // Reset form and close dialog
      resetForm()
    } catch (err) {
      console.error("Error saving FAQ:", err)
      toast({
        title: "Error",
        description: `Failed to save FAQ: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    }
  }

  // Handle FAQ deletion
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) {
      return
    }

    try {
      await deleteFaq(id)

      // Update local state
      setFaqs((prevFaqs) => prevFaqs.filter((faq) => faq.id !== id))

      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      })
    } catch (err) {
      console.error("Error deleting FAQ:", err)
      toast({
        title: "Error",
        description: `Failed to delete FAQ: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    }
  }

  // Handle edit button click
  const handleEdit = (faq: FAQ) => {
    setCurrentFaq(faq)
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setIsDialogOpen(false)
    setCurrentFaq({
      question: "",
      answer: "",
      category: "",
      is_published: true,
      priority: 0,
    })
    setIsEditMode(false)
  }

  // Handle priority change
  const handlePriorityChange = async (id: string, direction: "up" | "down") => {
    const faqIndex = faqs.findIndex((faq) => faq.id === id)
    if (faqIndex === -1) return

    const faq = faqs[faqIndex]
    const newPriority = direction === "up" ? (faq.priority || 0) + 1 : Math.max(0, (faq.priority || 0) - 1)

    try {
      const updatedFaq = await updateFaq(id, { priority: newPriority })

      // Update local state
      setFaqs((prevFaqs) => prevFaqs.map((f) => (f.id === updatedFaq.id ? { ...f, priority: updatedFaq.priority } : f)))

      toast({
        title: "Success",
        description: "FAQ priority updated",
      })
    } catch (err) {
      console.error("Error updating FAQ priority:", err)
      toast({
        title: "Error",
        description: `Failed to update priority: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      })
    }
  }

  // Filter FAQs by category
  const filteredFaqs = activeCategory ? faqs.filter((faq) => faq.category === activeCategory) : faqs

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">FAQ Management</h1>
          <div className="flex gap-2">
            {!tableExists && (
              <Link href="/setup-faqs-table">
                <Button variant="destructive">Setup FAQs Table</Button>
              </Link>
            )}
            <Button onClick={() => setIsDialogOpen(true)} disabled={!tableExists}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New FAQ
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tableExists ? (
          <>
            <Tabs defaultValue="all" className="mb-6">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setActiveCategory(null)}>
                  All Categories
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category} onClick={() => setActiveCategory(category)}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <Card key={faq.id} className={!faq.is_published ? "opacity-60" : ""}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                          <p className="text-gray-600 whitespace-pre-wrap">{faq.answer}</p>
                          <div className="flex items-center mt-4 text-sm text-gray-500">
                            {faq.category && <span className="mr-4">Category: {faq.category}</span>}
                            <span className="mr-4">Priority: {faq.priority}</span>
                            {!faq.is_published && <span className="text-amber-600">Draft</span>}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePriorityChange(faq.id, "up")}
                            title="Increase priority"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePriorityChange(faq.id, "down")}
                            title="Decrease priority"
                            disabled={faq.priority === 0}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold mb-2">No FAQs Found</h2>
                  <p className="text-muted-foreground">
                    {activeCategory
                      ? `No FAQs found in the "${activeCategory}" category.`
                      : "Create your first FAQ by clicking the 'Add New FAQ' button."}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">FAQs Table Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The faqs table does not exist in your database. Please set it up first.
            </p>
            <Link href="/setup-faqs-table">
              <Button>Setup FAQs Table</Button>
            </Link>
          </div>
        )}
      </main>

      {/* FAQ Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : resetForm())}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the question and answer for this FAQ."
                : "Add a new frequently asked question and answer."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={currentFaq.question || ""}
                  onChange={(e) => setCurrentFaq({ ...currentFaq, question: e.target.value })}
                  placeholder="Enter the question"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={currentFaq.answer || ""}
                  onChange={(e) => setCurrentFaq({ ...currentFaq, answer: e.target.value })}
                  placeholder="Enter the answer"
                  rows={5}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <div className="flex gap-2">
                  <Select
                    value={currentFaq.category || ""}
                    onValueChange={(value) => setCurrentFaq({ ...currentFaq, category: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or enter a new category"
                    value={
                      currentFaq.category && !categories.includes(currentFaq.category) ? currentFaq.category : "new"
                    }
                    onChange={(e) =>
                      setCurrentFaq({
                        ...currentFaq,
                        category: e.target.value,
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority (higher numbers appear first)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={currentFaq.priority || 0}
                  onChange={(e) => setCurrentFaq({ ...currentFaq, priority: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={currentFaq.is_published}
                  onCheckedChange={(checked) => setCurrentFaq({ ...currentFaq, is_published: checked })}
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
