import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  onSubmit?: () => void
  submitLabel?: string
  children: ReactNode
}
export default function Modal({ open, title, onClose, onSubmit, submitLabel = 'Save', children }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
