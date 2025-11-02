/**
 * Format number as percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number as currency
 */
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toFixed(decimals)}`;
}

/**
 * Format number with X suffix
 */
export function formatMultiple(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}x`;
}

/**
 * Format date
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
