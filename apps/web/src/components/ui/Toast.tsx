import { useEffect } from 'react'
import { X } from 'lucide-react'

export type ToastType = 'success' | 'error'

interface ToastProps {
  message: string
  type: ToastType
  onDismiss: () => void
  duration?: number
}

const styles = {
  success: { wrap: 'bg-[#f0fdf4] border-[#22c55e]/40', dot: 'bg-[#22c55e]', text: 'text-[#15803d]' },
  error:   { wrap: 'bg-[#fef2f2] border-[#ef4444]/40', dot: 'bg-[#ef4444]', text: 'text-[#b91c1c]' },
}

export function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  const s = styles[type]
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-md border shadow-lg ${s.wrap} animate-in slide-in-from-top-2 duration-200`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-sm font-medium ${s.text}`}>{message}</span>
      <button onClick={onDismiss} className="ml-1 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

// Simple hook for toast state
import { useState, useCallback } from 'react'
interface ToastState { message: string; type: ToastType }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const show = useCallback((message: string, type: ToastType = 'success') => setToast({ message, type }), [])
  const dismiss = useCallback(() => setToast(null), [])
  return { toast, show, dismiss }
}
