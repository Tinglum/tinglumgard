/**
 * Format price in Norwegian Kroner
 * @param amount - Amount in NOK (can be number or string)
 * @param options - Formatting options
 * @returns Formatted price string like "3 500 kr" or "3 500,-"
 */
export function formatPrice(
  amount: number | string,
  options: {
    includeCurrency?: boolean;
    useComma?: boolean;
    decimals?: number;
  } = {}
): string {
  const {
    includeCurrency = true,
    useComma = false,
    decimals = 0
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return includeCurrency ? '0 kr' : '0';
  }

  // Format with Norwegian locale (space as thousand separator)
  const formatted = numAmount.toLocaleString('nb-NO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (!includeCurrency) {
    return formatted;
  }

  return useComma ? `${formatted},-` : `${formatted} kr`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value}%`;
}

/**
 * Calculate deposit amount from total and percentage
 */
export function calculateDeposit(total: number, percentage: number): number {
  return Math.round((total * percentage) / 100);
}

/**
 * Calculate remainder amount
 */
export function calculateRemainder(total: number, deposit: number): number {
  return total - deposit;
}
