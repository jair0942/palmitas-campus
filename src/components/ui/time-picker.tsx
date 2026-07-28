"use client"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [h, m] = (value || "08:00").split(":")

  return (
    <div className="flex items-center gap-1.5">
      <Select value={h} onValueChange={(v) => onChange(`${v ?? "08"}:${m}`)}>
        <SelectTrigger className="w-20 text-center">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm font-medium">:</span>
      <Select value={m} onValueChange={(v) => onChange(`${h}:${v ?? "00"}`)}>
        <SelectTrigger className="w-20 text-center">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((min) => (
            <SelectItem key={min} value={min}>
              {min}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
