const DATE_LOCALE = "en";
const DATE_TIME_ZONE = "UTC";

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    ...options,
    timeZone: DATE_TIME_ZONE,
  }).format(date);
}

export function formatYear(value: Date = new Date()): string {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    year: "numeric",
    timeZone: DATE_TIME_ZONE,
  }).format(value);
}
