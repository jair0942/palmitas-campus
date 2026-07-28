"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#E5E7EB] bg-white px-6 py-16 text-center shadow-[0_4px_12px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-[#F1F5F9]">
        <Icon className="size-9 text-[#6B7280]/60" />
      </div>
      <h3 className="text-[18px] font-semibold text-[#111827]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-[15px] text-[#6B7280]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
