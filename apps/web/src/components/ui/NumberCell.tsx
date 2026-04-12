interface NumberCellProps {
  value: number | null
  format?: 'percent' | 'ratio' | 'price' | 'raw'
  showArrow?: boolean
  colorize?: boolean
  digits?: number
}

function fmt(value: number, format: string, digits: number) {
  if (format === 'percent') return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`
  if (format === 'price')   return `$${value.toFixed(2)}`
  if (format === 'ratio')   return `${value.toFixed(digits)}×`
  return value.toFixed(digits)
}

export function NumberCell({ value, format = 'raw', showArrow, colorize = true, digits = 1 }: NumberCellProps) {
  if (value == null) return <span className="text-[#3f3f46] text-sm">—</span>
  const positive = value >= 0
  const color = colorize
    ? positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
    : 'text-[#e4e4e7]'
  return (
    <span className={`text-sm tabular-nums font-medium ${color}`}>
      {showArrow && (positive ? '▲ ' : '▼ ')}
      {fmt(value, format, digits)}
    </span>
  )
}
