import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border border-transparent px-3 py-0.5 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-[#0F6A3B] text-white",
        secondary:
          "bg-[#F2C230] text-[#111827]",
        destructive:
          "bg-[#D62828]/10 text-[#D62828] focus-visible:ring-destructive/20 dark:bg-[#D62828]/20 dark:focus-visible:ring-destructive/40",
        success:
          "bg-[#16A34A]/10 text-[#16A34A]",
        outline:
          "border-[#E5E7EB] text-[#111827]",
        ghost:
          "hover:bg-[#F1F5F9] text-[#6B7280] dark:hover:bg-[#1E293B]",
        link: "text-[#0F6A3B] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
