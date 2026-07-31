import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAOA(value: number): string {
  if (value >= 1_000_000_000) {
    return `AOA ${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `AOA ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `AOA ${(value / 1_000).toFixed(0)}K`
  }
  return `AOA ${value.toLocaleString('pt-AO')}`
}
