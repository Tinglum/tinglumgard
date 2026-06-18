import {
  CalendarDays, Compass, Megaphone, Rocket, BookMarked, Clock, Timer, Wand2,
  MessagesSquare, Quote, Users, MonitorPlay, Dumbbell, Briefcase, ListChecks, BookOpen,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  CalendarDays, Compass, Megaphone, Rocket, BookMarked, Clock, Timer, Wand2,
  MessagesSquare, Quote, Users, MonitorPlay, Dumbbell, Briefcase, ListChecks, ClipboardList,
}

export function AppendixIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || BookOpen
  return <Icon className={className} />
}
