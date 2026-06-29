const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateOnly(value: string): string {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) return value;

  const [, year, month, day] = match;
  return `${Number(month)}/${Number(day)}/${year}`;
}
