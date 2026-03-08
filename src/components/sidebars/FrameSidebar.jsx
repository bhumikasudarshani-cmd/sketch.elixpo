"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar, { PropertySection, Divider } from './ShapeSidebar'
import { useState } from 'react'

export default function FrameSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [frameName, setFrameName] = useState('Frame 1')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.FRAME}>
      <PropertySection label="Name">
        <input
          type="text"
          value={frameName}
          onChange={(e) => setFrameName(e.target.value)}
          className="w-24 px-2 py-1 bg-surface-dark border border-border rounded-lg text-text-secondary text-xs outline-none focus:border-border-accent transition-all duration-200 font-[lixFont]"
          spellCheck={false}
        />
      </PropertySection>

      <Divider />

      <PropertySection label="Actions">
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-text-muted text-xs hover:bg-surface-hover hover:text-text-primary transition-all duration-200">
          <i className="bx bx-expand text-sm" />
          Resize to Fit
        </button>
      </PropertySection>
    </ShapeSidebar>
  )
}
