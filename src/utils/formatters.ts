/**
 * Formats a currency amount into standard readable Indian Rupee format (Cr / L)
 */
export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Formats Lakhs directly with 'L' suffix
 */
export function formatLakhs(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)} L`;
}
