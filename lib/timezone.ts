/**
 * Utilitários para trabalhar com o fuso horário de Manaus (America/Manaus - GMT-4)
 */

// Offset de Manaus em relação a UTC (em horas)
const MANAUS_OFFSET_HOURS = -4;

/**
 * Retorna a data/hora atual no fuso horário de Manaus
 */
export function getManausNow(): Date {
  const now = new Date();
  // Converte UTC para Manaus (UTC-4)
  const manausTime = new Date(now.getTime() + (MANAUS_OFFSET_HOURS * 60 * 60 * 1000));
  return manausTime;
}

/**
 * Converte uma data UTC para o horário de Manaus
 */
export function toManausTime(date: Date): Date {
  return new Date(date.getTime() + (MANAUS_OFFSET_HOURS * 60 * 60 * 1000));
}

/**
 * Cria uma data com horário específico no fuso de Manaus
 * Converte horário LOCAL de Manaus para UTC
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param hours - Horas (0-23) no horário LOCAL de Manaus
 * @param minutes - Minutos (0-59) no horário LOCAL de Manaus
 * @returns Date em UTC correspondente ao horário de Manaus
 * @example createManausDate('2026-01-06', 18, 0) → 2026-01-06T22:00:00.000Z (18h Manaus = 22h UTC)
 */
export function createManausDate(dateStr: string, hours: number, minutes: number): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Manaus é UTC-4, então para converter Manaus → UTC precisamos ADICIONAR 4 horas
  // Exemplo: 18:00 Manaus = 22:00 UTC (18 + 4)
  const utcHours = hours - MANAUS_OFFSET_HOURS; // hours - (-4) = hours + 4
  
  // Cria a data diretamente em UTC com o horário ajustado
  return new Date(Date.UTC(year, month - 1, day, utcHours, minutes, 0));
}

/**
 * Extrai o horário (HH:MM) de uma data no fuso de Manaus
 */
export function getManausTimeString(date: Date): string {
  const manausDate = toManausTime(date);
  const hours = manausDate.getUTCHours();
  const minutes = manausDate.getUTCMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Retorna o início do dia (00:00:00) no fuso de Manaus
 */
export function getManausStartOfDay(dateStr: string): Date {
  return createManausDate(dateStr, 0, 0);
}

/**
 * Retorna o fim do dia (23:59:59) no fuso de Manaus
 */
export function getManausEndOfDay(dateStr: string): Date {
  return createManausDate(dateStr, 23, 59);
}

/**
 * Verifica se duas datas são do mesmo dia no fuso de Manaus
 */
export function isSameDayManaus(date1: Date, date2: Date): boolean {
  const manaus1 = toManausTime(date1);
  const manaus2 = toManausTime(date2);
  
  return (
    manaus1.getUTCFullYear() === manaus2.getUTCFullYear() &&
    manaus1.getUTCMonth() === manaus2.getUTCMonth() &&
    manaus1.getUTCDate() === manaus2.getUTCDate()
  );
}

/**
 * Formata uma data para exibição no formato brasileiro (dd/MM/yyyy HH:mm)
 */
export function formatManausDateTime(date: Date): string {
  const manausDate = toManausTime(date);
  const day = String(manausDate.getUTCDate()).padStart(2, '0');
  const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
  const year = manausDate.getUTCFullYear();
  const hours = String(manausDate.getUTCHours()).padStart(2, '0');
  const minutes = String(manausDate.getUTCMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
