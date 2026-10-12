import { useId, useRef, useState, type DragEvent } from 'react'
import { applyBillToProfile } from '../../lib/bills/applyBillToProfile'
import { readBillFile } from '../../lib/bills/readBillFile'
import type { BillFacts, BillReadResult } from '../../lib/bills/types'
import type { ProfileData } from '../../types/profile'

export function useBillUpload(profile: ProfileData, onChange: (profile: ProfileData) => void) {
  const inputId = useId()
  const readToken = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState<BillReadResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [facts, setFacts] = useState<BillFacts | null>(null)

  async function readChosen(next: File) {
    readToken.current += 1
    const token = readToken.current
    setFile(next)
    setResult(null)
    setFacts(null)
    setReading(true)
    const parsed = await readBillFile(next)
    if (token !== readToken.current) return
    setReading(false)
    setResult(parsed)
    if (parsed.ok) {
      setFacts(parsed.facts)
      onChange(applyBillToProfile(profile, parsed.facts))
    }
  }

  function clearFile() {
    readToken.current += 1
    setFile(null)
    setResult(null)
    setFacts(null)
    setReading(false)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) readChosen(dropped)
  }

  function onInputChange(files: FileList | null) {
    const chosen = files?.[0]
    if (chosen) readChosen(chosen)
  }

  return {
    inputId,
    file,
    reading,
    result,
    dragging,
    facts,
    setDragging,
    onDrop,
    onInputChange,
    clearFile,
  }
}
