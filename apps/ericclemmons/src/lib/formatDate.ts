export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function shortDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function numDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`
}

export function yearRange(start: string, end?: string) {
  const s = new Date(start).getFullYear()
  const e = end ? new Date(end).getFullYear() : null
  return e ? `${s}–${e}` : `${s}–Present`
}

export function groupByYear<T extends { data: { date: Date } }>(
  posts: T[]
): { years: number[]; byYear: Record<number, T[]> } {
  const byYear: Record<number, T[]> = {}
  for (const post of posts) {
    const year = post.data.date.getFullYear()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(post)
  }
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)
  return { years, byYear }
}
