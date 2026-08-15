export const CURRENCY_SYMBOL = "₹";

export function formatMoney(value) {
  const num = Number(value || 0);
  return `${CURRENCY_SYMBOL}${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
