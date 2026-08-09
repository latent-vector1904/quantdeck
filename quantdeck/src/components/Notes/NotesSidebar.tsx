import { useRef, useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function NotesSidebar({ problemId }: { problemId: string }) {
  const { notes, updateNote } = useStore()
  const [text, setText] = useState(notes[problemId] || '')
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-sync text when problem changes
  useEffect(() => {
    setText(notes[problemId] || '')
    setSaved(false)
  }, [problemId, notes])

  function handleInput(val: string) {
    setText(val)
    setSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateNote(problemId, val)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 400)
  }

  return (
    <div className="flex flex-col h-full px-4 sm:px-[22px] py-4 sm:py-[22px]">
      <textarea
        value={text}
        onChange={e => handleInput(e.target.value)}
        placeholder="Write your notes here…"
        className="flex-1 w-full bg-bg border border-border rounded-xl p-4 text-[16px] sm:text-[14.5px] leading-[1.7] text-text resize-none focus:outline-none focus:border-accent transition-colors placeholder-text-faint scrollbar-thin"
      />
      <div className="flex items-center justify-between mt-2.5 text-[12px]">
        <span className={`text-accent-dim font-medium transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>Saved ✓</span>
        <span className="text-text-faint">{text.length} chars</span>
      </div>
    </div>
  )
}
