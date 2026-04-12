import { useState, useEffect, useCallback } from 'react'
import type { Note } from '@/lib/types'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function key(userId: string, ticker: string) {
  return `alphascreen_notes_${userId}_${ticker}`
}

export function useNotes(userId: string | undefined, ticker: string) {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!userId || !ticker) { setNotes([]); return }
    try {
      const raw = localStorage.getItem(key(userId, ticker))
      setNotes(raw ? (JSON.parse(raw) as Note[]) : [])
    } catch {
      setNotes([])
    }
  }, [userId, ticker])

  const persist = useCallback(
    (next: Note[]) => {
      if (!userId || !ticker) return
      localStorage.setItem(key(userId, ticker), JSON.stringify(next))
      setNotes(next)
    },
    [userId, ticker],
  )

  const addNote = useCallback(
    (title = 'New note', content = '') => {
      const note: Note = {
        id: genId(), title, content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      persist([...notes, note])
      return note
    },
    [notes, persist],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      persist(
        notes.map(n =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
        ),
      )
    },
    [notes, persist],
  )

  const deleteNote = useCallback(
    (id: string) => persist(notes.filter(n => n.id !== id)),
    [notes, persist],
  )

  return { notes, addNote, updateNote, deleteNote }
}
