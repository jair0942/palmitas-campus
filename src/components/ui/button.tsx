import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-clip-padding text-[17px] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#0F6A3B] text-white hover:bg-[#0C5A31] shadow-sm",
        outline:
          "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F1F5F9] hover:text-[#111827] aria-expanded:bg-[#F1F5F9] aria-expanded:text-[#111827] dark:border-[#1E293B] dark:bg-transparent dark:hover:bg-[#1E293B]",
        secondary:
          "bg-[#F2C230] text-[#111827] hover:bg-[#E0B020] shadow-sm",
        ghost:
          "hover:bg-[#F1F5F9] text-[#111827] aria-expanded:bg-[#F1F5F9] aria-expanded:text-[#111827] dark:hover:bg-[#1E293B] dark:text-[#E2E8F0]",
        destructive:
          "bg-[#D62828] text-white hover:bg-[#B82020] shadow-sm",
        success:
          "bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm",
        link: "text-[#0F6A3B] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[44px] gap-2 px-5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1.5 rounded-[10px] px-3 text-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 rounded-[12px] px-4 text-[15px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-[52px] gap-2 px-6 text-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-[44px]",
        "icon-xs":
          "size-8 rounded-[10px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-10 rounded-[12px]",
        "icon-lg": "size-[52px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
