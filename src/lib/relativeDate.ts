const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

const unitsFromTime = [
  ['minute', 60],
  ['hour', 60],
  ['day', 24],
  ['week', 7],
  ['year', 52],
]

export function relativeDate(date: Date) {
  const [unit, length] = unitsFromTime.reduce(
    ([prevUnit, prevLength], [unit, divisor]) => {
      const length = Math.floor(prevLength / divisor)

      return Math.abs(length >= 1) ? [unit, length] : [prevUnit, prevLength]
    },
    ['second', (new Date() - date) / 1000]
  )

  return rtf.format(-length, unit)
}
