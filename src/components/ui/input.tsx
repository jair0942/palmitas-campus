import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[14px] border border-[#E5E7EB] bg-white px-4 py-3 text-[16px] transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#6B7280] focus-visible:border-[#0F6A3B] focus-visible:ring-4 focus-visible:ring-[rgba(15,106,59,0.15)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:opacity-50 aria-invalid:border-[#D62828] aria-invalid:ring-4 aria-invalid:ring-[rgba(214,40,40,0.15)] dark:border-[#1E293B] dark:bg-transparent dark:disabled:bg-[#1E293B] dark:focus-visible:border-[#16A34A] dark:focus-visible:ring-[rgba(22,163,74,0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
