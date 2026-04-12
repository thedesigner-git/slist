interface ToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="relative inline-flex items-center w-10 h-6 rounded-full border-0 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      style={{ background: value ? 'var(--accent)' : '#D1D5DB' }}
    >
      <span
        className="inline-block w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
