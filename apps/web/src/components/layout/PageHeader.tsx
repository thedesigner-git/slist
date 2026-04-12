interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-[#1c1c1e] shrink-0 bg-[#09090b]">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-[#52525b] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
