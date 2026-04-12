interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-150 whitespace-nowrap',
        active
          ? 'bg-[rgba(99,102,241,0.15)] text-[#a5b4fc] border-[rgba(99,102,241,0.3)]'
          : 'bg-transparent text-[#52525b] border-[#27272a] hover:text-[#e4e4e7] hover:border-[#3f3f46]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
