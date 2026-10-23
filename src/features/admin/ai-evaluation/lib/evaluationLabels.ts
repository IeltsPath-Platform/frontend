export function percent(value: number | null) { return value === null ? 'Chưa có' : `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` }

/** A score with two decimals, as the contract's thresholds are written (0.60). */
export function score(value: number | null) { return value === null ? 'Chưa có' : value.toFixed(2) }
