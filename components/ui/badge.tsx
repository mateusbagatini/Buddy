import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<React.ElementRef<"div">, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Badge.displayName = "Badge"

export { Badge }
