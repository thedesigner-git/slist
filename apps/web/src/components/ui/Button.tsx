import { forwardRef } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const styles: Record<Variant, string> = {
  primary: 'bg-[#6366f1] hover:bg-[#4f51d8] text-white border-transparent',
  outline: 'bg-transparent hover:bg-[#1c1c1e] text-[#e4e4e7] border-[#27272a]',
  ghost:   'bg-transparent hover:bg-[#1c1c1e] text-[#71717a] border-transparent',
  danger:  'bg-transparent hover:bg-red-950 text-red-400 border-red-900',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[8px]',
  md: 'px-4 py-2   text-sm rounded-[10px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium border transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]',
        styles[variant], sizes[size], className,
      ].join(' ')}
      {...props}
    >
      {loading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
