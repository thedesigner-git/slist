import { useState, useEffect } from 'react'
import { X, Plus, Trash2, FileText } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'
import type { Note } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  userId: string | undefined
  ticker: string
  companyName: string
}

export function NotesModal({ open, onClose, userId, ticker, companyName }: Props) {
  const { notes, addNote, updateNote, deleteNote } = useNotes(userId, ticker)
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')

  /* Sync editor when selection changes */
  useEffect(() => {
    if (selected) { setTitle(selected.title); setContent(selected.content) }
    else          { setTitle(''); setContent('') }
  }, [selected])

  /* Auto-select first note */
  useEffect(() => {
    if (notes.length > 0 && !selected) setSelected(notes[0])
    if (notes.length === 0) setSelected(null)
  }, [notes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  function handleAdd() {
    const note = addNote('Untitled note', '')
    setSelected(note)
  }

  function handleTitleBlur() {
    if (selected) updateNote(selected.id, { title })
  }

  function handleContentBlur() {
    if (selected) updateNote(selected.id, { content })
  }

  function handleDelete() {
    if (!selected) return
    deleteNote(selected.id)
    setSelected(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Card */}
      <div className="w-full max-w-[860px] rounded-[2px] overflow-hidden shadow-2xl flex flex-col"
           style={{ maxHeight: '90vh', minHeight: '560px', height: '660px' }}>

        {/* Header — dark */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
             style={{ background: '#0A0A0A' }}>
          <FileText size={16} className="shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
          <span className="text-[14px] font-semibold text-white">Research Notes</span>
          <span className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {companyName}
          </span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — note list */}
          <div className="w-[220px] flex flex-col shrink-0 border-r"
               style={{ background: '#000000', borderColor: '#2A2A2A' }}>
            <div className="p-3 flex items-center justify-center shrink-0">
              <button
                onClick={handleAdd}
                className="flex items-center justify-between gap-2 h-9 px-3 rounded-[2px] border text-[12px] font-semibold transition-colors hover:bg-white/10"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF', width: 140 }}>
                New note
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
              {notes.length === 0 && (
                <p className="text-center text-[12px] mt-6 px-3"
                   style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No notes yet. Create one above.
                </p>
              )}
              {notes.map(n => (
                <button
                  key={n.id}
                  onClick={() => setSelected(n)}
                  className="w-full text-left px-3 py-2.5 rounded-[2px] transition-colors"
                  style={
                    selected?.id === n.id
                      ? { background: '#FFFFFF', color: '#000000' }
                      : { background: 'transparent' }
                  }>
                  <div className="text-[12px] font-medium truncate"
                       style={{ color: selected?.id === n.id ? '#000000' : '#FFFFFF' }}>
                    {n.title || 'Untitled'}
                  </div>
                  <div className="text-[10px] mt-0.5 line-clamp-2"
                       style={{ color: selected?.id === n.id ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.38)' }}>
                    {n.content || 'Empty note'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {selected ? (
              <>
                {/* Editor toolbar */}
                <div className="flex items-center justify-end px-5 pt-3 shrink-0">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 border rounded-[2px]"
                    style={{ color: 'var(--signal-down)', borderColor: 'var(--signal-down)', padding: '12px 12px' }}>
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>

                {/* Title */}
                <div className="px-6 pt-2 pb-1 shrink-0">
                  <input
                    className="no-focus-ring w-full text-[22px] font-bold border-none outline-none bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    placeholder="Note title"
                  />
                </div>

                {/* Content */}
                <textarea
                  className="no-focus-ring flex-1 px-6 py-2 w-full resize-none border-none outline-none text-[14px] leading-relaxed bg-transparent [appearance:none]"
                  style={{ color: 'var(--text-secondary)' }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onBlur={handleContentBlur}
                  placeholder="Start writing your research notes here..."
                />

                {/* Paste hint */}
                <div className="px-6 py-3 shrink-0 border-t text-[12px]"
                     style={{ borderColor: 'var(--border-light)', color: 'var(--text-faint)' }}>
                  🖇 Paste (Ctrl+V / ⌘+V) to attach a screenshot
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center"
                     style={{ borderColor: 'var(--border-strong)' }}>
                  <Plus size={22} style={{ color: 'var(--text-faint)' }} />
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Create a note to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
