import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `Rs.${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `Rs.${(amount / 100000).toFixed(0)}L`
  if (amount >= 1000) return `Rs.${(amount / 1000).toFixed(0)}K`
  return `Rs.${amount}`
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    JUNIOR: 1, SENIOR: 2, LEAD: 3, MANAGER: 4, VP: 5, EXECUTIVE: 6, CEO: 7,
  }
  return levels[role] ?? 0
}
