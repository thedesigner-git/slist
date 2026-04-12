import { Star } from 'lucide-react'

interface StarIconProps {
  selected: boolean
  onToggle: () => void
}

export function StarIcon({ selected, onToggle }: StarIconProps) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle() }}
      aria-label={selected ? 'Remove from watchlist' : 'Add to watchlist'}
      className="p-1 rounded transition-colors duration-150 hover:bg-[rgba(99,102,241,0.12)] focus-visible:ring-2 focus-visible:ring-[#6366f1]"
    >
      <Star
        size={15}
        className="transition-colors duration-150"
        fill={selected ? '#6366f1' : 'none'}
        stroke={selected ? '#6366f1' : '#52525b'}
      />
    </button>
  )
}
