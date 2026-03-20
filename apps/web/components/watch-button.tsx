'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface WatchButtonProps {
  companyId: number
  isWatch: boolean
  scoreBelowThreshold: boolean
  onToggle: (companyId: number, newState: boolean) => void
}

export function WatchButton({
  companyId,
  isWatch,
  scoreBelowThreshold,
  onToggle,
}: WatchButtonProps) {
  const [open, setOpen] = useState(false)

  function handleClick() {
    if (!isWatch) {
      // Inactive: add to watch immediately (optimistic, no confirmation)
      onToggle(companyId, true)
      return
    }

    if (isWatch && scoreBelowThreshold) {
      // Active + below threshold: show confirmation popover
      setOpen(true)
      return
    }

    // Active + above threshold: remove immediately
    onToggle(companyId, false)
  }

  function handleConfirmRemove() {
    setOpen(false)
    onToggle(companyId, false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-800"
            aria-label={isWatch ? 'Remove Watch' : 'Add to Watch'}
            onClick={handleClick}
          />
        }
      >
        {isWatch ? (
          <BookmarkCheck size={20} className="text-violet-500 fill-violet-500" />
        ) : (
          <Bookmark size={20} className="text-zinc-500" />
        )}
      </PopoverTrigger>
      <PopoverContent className="bg-zinc-800 border-zinc-700 w-64 p-4">
        <p className="text-sm font-semibold text-white mb-1">Remove Watch?</p>
        <p className="text-xs text-zinc-400 mb-3">
          This company will leave the shortlist — its score is below your threshold.
        </p>
        <div className="flex gap-2">
          <button
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg"
            onClick={handleConfirmRemove}
          >
            Remove Watch
          </button>
          <button
            className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Keep Watch
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
