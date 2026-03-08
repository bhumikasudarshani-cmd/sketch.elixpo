"use client"

import { useState } from 'react'

/**
 * Bottom horizontal property panel container.
 * Each section is expandable/collapsible.
 */
export function PropertySection({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-dim hover:text-text-muted transition-colors px-1 py-0.5 mb-1"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        {label}
      </button>
      {open && <div className="px-1">{children}</div>}
    </div>
  )
}

/**
 * Divider between sections in the horizontal panel
 */
function Divider() {
  return <div className="w-px h-8 bg-border-light self-center mx-1 shrink-0" />
}

export default function ShapeSidebar({ visible, children }) {
  return (
    <div
      className={`absolute bottom-12 left-1/2 -translate-x-1/2 max-w-[90vw] bg-surface border border-border-light rounded-xl px-3 py-2 z-[999] font-[lixFont] transition-all duration-200 ${
        visible
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 pointer-events-none translate-y-2'
      }`}
    >
      <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide">
        {children}
      </div>
    </div>
  )
}

export { Divider }
