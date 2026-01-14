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

export function isServiceIncluded(includedStr: string | null | undefined, serviceName: string, serviceId?: string): boolean {
  if (!includedStr) return false;

  const normalizedName = serviceName.toLowerCase().trim();
  let terms: string[] = [];

  // Tenta parsear como JSON (array ou objeto)
  try {
    const parsed = JSON.parse(includedStr);
    if (Array.isArray(parsed)) {
      // Ex: ["Corte", "Barba"]
      terms = parsed.map(String);
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Ex: { "Corte": true, "Barba": { "unlimited": true } }
      terms = Object.keys(parsed);
    } else {
      // Fallback para string simples se não for array/objeto
      terms = [String(parsed)];
    }
  } catch (e) {
    // Se falhar JSON, assume string separada por vírgulas
    terms = includedStr.split(',').map(t => t.trim());
  }

  // Verifica inclusão (por nome OU ID)
  return terms.some(term => {
    const normalizedTerm = term.toLowerCase().trim();
    if (!normalizedTerm) return false;

    // Check match by Name
    if (normalizedName.includes(normalizedTerm) || normalizedTerm.includes(normalizedName)) {
      return true;
    }

    // Check match by ID (exact match)
    if (serviceId && normalizedTerm === serviceId.toLowerCase()) {
      return true;
    }

    return false;
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}