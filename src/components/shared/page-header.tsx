"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex items-center justify-between", className)}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex size-11 items-center justify-center rounded-full bg-[#0F6A3B]/10">
            <Icon className="size-5 text-[#0F6A3B]" />
          </div>
        )}
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-[15px] text-[#6B7280]">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </motion.div>
  );
}
