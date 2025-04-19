import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin-header"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 container py-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="mb-6">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
