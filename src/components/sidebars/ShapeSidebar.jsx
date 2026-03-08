"use client"

import { useState } from 'react'

/**
 * A single property section in the bottom bar.
 * Shows an icon + current value preview. Clicking expands to show all options.
 */
export function PropertySection({ icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
          open
            ? 'bg-white/[0.08] text-text-primary'
            : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]'
        }`}
      >
        {icon && <i className={`bx ${icon} text-sm`} />}
        {label && <span className="whitespace-nowrap">{label}</span>}
        <svg
          className={`w-2.5 h-2.5 opacity-40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2 4l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e1e1e] border border-white/[0.08] rounded-xl px-2.5 py-2 shadow-lg shadow-black/40 min-w-max z-10">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#1e1e1e] border-r border-b border-white/[0.08]" />
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Divider between sections
 */
function Divider() {
  return <div className="w-px h-6 bg-white/[0.06] self-center mx-0.5 shrink-0" />
}

/**
 * Bottom horizontal property panel container.
 */
export default function ShapeSidebar({ visible, children }) {
  return (
    <div
      className={`absolute bottom-14 left-1/2 -translate-x-1/2 max-w-[92vw] bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-2 py-1.5 z-[999] font-[lixFont] transition-all duration-200 ${
        visible
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 pointer-events-none translate-y-3'
      }`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {children}
      </div>
    </div>
  )
}

export { Divider }
