import { Skeleton } from "@/components/ui/skeleton"
import { UserHeader } from "@/components/user-header"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <UserHeader />
      <main className="flex-1 container py-6 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Skeleton for notifications */}
        <div className="mb-6">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>

        {/* New layout with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Library sidebar skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 h-full">
              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action flows skeleton */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty right column */}
          <div className="lg:col-span-1">{/* This column intentionally left empty */}</div>
        </div>
      </main>
    </div>
  )
}
