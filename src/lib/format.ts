export function fmtUsd(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, ...opts }).format(n)
}

export function fmtUsdPrecise(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

export function fmtUsdCents(n: number): string {
  return `$${n.toFixed(3)}`
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function fmtCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function daysBetween(a: string, b: string): number {
  const A = new Date(`${a}T00:00:00Z`).getTime()
  const B = new Date(`${b}T00:00:00Z`).getTime()
  return Math.round((B - A) / (1000 * 60 * 60 * 24))
}
