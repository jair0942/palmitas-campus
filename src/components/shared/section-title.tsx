"use client";

import { cn } from "@/lib/utils";

interface SectionTitleProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionTitle({
  icon: Icon,
  title,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-5 text-[#6B7280]" />}
        <h2 className="text-[20px] font-semibold tracking-tight text-[#111827]">
          {title}
        </h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
