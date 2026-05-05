export function formatCurrency(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency"
  }).format(value);
}

