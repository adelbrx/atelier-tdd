const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toSafeMoney(value: number | string, maximum = Number.POSITIVE_INFINITY): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;

  const bounded = Math.min(Math.max(parsed, 0), maximum);
  return Math.round((bounded + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number | string): string {
  return currencyFormatter.format(toSafeMoney(value));
}

export function toDecimalString(value: number): string {
  return toSafeMoney(value).toFixed(2);
}
