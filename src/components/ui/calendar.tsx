"use client"

import { useState, useCallback } from "react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, format, addMonths, subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]

interface CalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  minDate?: Date
  className?: string
}

export default function Calendar({ selected, onSelect, minDate, className }: CalendarProps) {
  const [viewDate, setViewDate] = useState(selected || new Date())

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const prevMonth = useCallback(() => setViewDate((d) => subMonths(d, 1)), [])
  const nextMonth = useCallback(() => setViewDate((d) => addMonths(d, 1)), [])

  const monthLabel = format(viewDate, "MMMM yyyy", { locale: es })

  return (
    <div className={cn("w-full select-none", className)}>
      <div className="flex items-center justify-between px-1 pb-3">
        <Button variant="ghost" size="icon-sm" onClick={prevMonth} className="size-8">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-base font-bold capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon-sm" onClick={nextMonth} className="size-8">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {daysOfWeek.map((d) => (
          <div key={d} className="flex h-9 items-center justify-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
            const same = selected ? isSameDay(day, selected) : false
          const today = isToday(day)
          const inMonth = isSameMonth(day, viewDate)
          const disabled = minDate ? day < startOfWeek(minDate, { weekStartsOn: 1 }) && !isSameMonth(day, viewDate) : false
          const past = minDate ? day < new Date(new Date(minDate).setHours(0, 0, 0, 0)) : false

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => { if (!past) onSelect(day) }}
              disabled={past}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-lg text-base transition-all duration-150",
                !inMonth && "text-muted-foreground/30",
                past && "cursor-not-allowed opacity-30",
                same && "bg-primary text-primary-foreground font-semibold shadow-sm",
                !same && today && "ring-1 ring-primary/50 font-semibold text-primary",
                !same && !today && inMonth && "text-foreground hover:bg-accent",
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}
