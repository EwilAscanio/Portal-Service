/**
 * Helpers para generar fechas relativas a "ahora".
 * Mantiene los datos de demostración siempre frescos y realistas.
 */
export function daysFromNow(days, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}
