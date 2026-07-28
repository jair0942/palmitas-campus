"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = Math.ceil(value / (duration * 60));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}

const circleColors: Record<string, string> = {
  teachers: "bg-[#0F6A3B]",
  students: "bg-[#F2C230]",
  classes: "bg-[#D62828]",
  tasks: "bg-[#16A34A]",
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  colorKey?: string;
  sublabel?: string;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  colorKey = "teachers",
  sublabel,
  className,
}: StatCardProps) {
  const circleClass = circleColors[colorKey] || "bg-[#0F6A3B]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-250 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      <div className="flex items-center gap-4 px-6 py-6">
        <div className={cn("flex size-[52px] items-center justify-center rounded-full shadow-sm", circleClass)}>
          <Icon className="size-6 text-white" />
        </div>
        <div>
          <p className="text-[32px] font-bold tracking-tight text-[#111827]">
            {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
          </p>
          <p className="text-[16px] text-[#6B7280]">{label}</p>
          {sublabel && (
            <p className="mt-0.5 text-[13px] text-[#6B7280]/70">{sublabel}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
