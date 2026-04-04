export type Percentage = {
  readonly value: number;
};

export function createPercentage(value: number): Percentage {
  return {value};
}

export function calculatePercentage(part: number, whole: number): Percentage {
  if (whole === 0) {
    return createPercentage(0);
  }
  return createPercentage((part / whole) * 100);
}

export function formatPercentage(percentage: Percentage, decimals: number = 1): string {
  return `${percentage.value.toFixed(decimals)}%`;
}

/**
 * Calculates the percentage change from previous to current.
 * Returns 0 if previous is 0 to avoid division by zero.
 */
export function calculateChange(previous: number, current: number): Percentage {
  if (previous === 0) {
    return createPercentage(0);
  }
  return createPercentage(((current - previous) / previous) * 100);
}
