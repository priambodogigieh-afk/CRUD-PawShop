import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-16 animate-fade-in-up">
      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#5B50E5]/10 to-teal-400/10 flex items-center justify-center border border-[#5B50E5]/20 shadow-inner mb-4 animate-scale-up">
        <span className="material-symbols-outlined text-[32px] text-[#5B50E5]" style={{ fontVariationSettings: "'FILL' 0" }}>
          {icon}
        </span>
      </div>
      <h3 className="font-extrabold text-[#1E2330] text-base tracking-tight">{title}</h3>
      <p className="text-xs text-[#6E7385] mt-1 max-w-[280px] leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
