"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar, { PropertySection, Divider } from './ShapeSidebar'
import { useState } from 'react'

export default function FrameSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [frameName, setFrameName] = useState('Frame 1')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.FRAME}>
      <PropertySection icon="bx-rename">
        <input
          type="text"
          value={frameName}
          onChange={(e) => setFrameName(e.target.value)}
          className="w-28 px-2 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-text-secondary text-xs outline-none focus:border-accent/50 transition-all duration-150 font-[lixFont]"
          spellCheck={false}
        />
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-expand" defaultOpen={true}>
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-text-muted text-[11px] hover:bg-white/[0.05] hover:text-text-primary transition-all duration-150">
          <i className="bx bx-expand text-sm" />
          Resize to Fit
        </button>
      </PropertySection>
    </ShapeSidebar>
  )
}
