import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function isServiceIncluded(includedStr: string | null | undefined, serviceName: string): boolean {
  if (!includedStr) return false;
  const normalizedIncluded = includedStr.toLowerCase();
  const normalizedName = serviceName.toLowerCase();

  const terms = normalizedIncluded.split(',').map(t => t.trim()).filter(t => t.length > 0);

  return terms.some(term =>
    normalizedName.includes(term) || term.includes(normalizedName)
  );
}