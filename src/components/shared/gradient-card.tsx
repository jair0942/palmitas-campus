"use client";

import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: React.ReactNode;
  gradient: string;
  className?: string;
}

export default function GradientCard({ children, gradient, className }: GradientCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl px-6 py-8 text-white",
        className,
      )}
      style={{ background: gradient }}
    >
      {children}
    </div>
  );
}

export const GRADIENT_COLORS = [
  "linear-gradient(135deg, #0F6A3B, #16A34A)",
  "linear-gradient(135deg, #137333, #00A862)",
  "linear-gradient(135deg, #D62828, #E37400)",
  "linear-gradient(135deg, #0F6A3B, #084D2C)",
  "linear-gradient(135deg, #16A34A, #0F6A3B)",
  "linear-gradient(135deg, #00A862, #137333)",
  "linear-gradient(135deg, #F2C230, #D62828)",
  "linear-gradient(135deg, #084D2C, #0F6A3B)",
] as const;

export const CLASS_COLORS = [
  "from-[#0F6A3B] to-[#16A34A]",
  "from-emerald-500 to-emerald-600",
  "from-[#D62828] to-[#E37400]",
  "from-[#F2C230] to-[#D4A020]",
  "from-[#0F6A3B] to-[#084D2C]",
  "from-cyan-500 to-cyan-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
] as const;
