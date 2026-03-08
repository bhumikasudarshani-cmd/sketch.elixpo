"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar, { PropertySection, Divider } from './ShapeSidebar'
import { useState } from 'react'

const STROKE_COLORS = [
  { color: '#fff', label: 'White' },
  { color: '#FF8383', label: 'Red' },
  { color: '#3A994C', label: 'Green' },
  { color: '#56A2E8', label: 'Blue' },
  { color: '#FFD700', label: 'Gold' },
]

const THICKNESSES = [
  { value: 2, width: 'h-px' },
  { value: 5, width: 'h-0.5' },
  { value: 7, width: 'h-1' },
]

const STYLES = [
  { value: 'solid', dash: '' },
  { value: 'dashed', dash: '6 4' },
  { value: 'dotted', dash: '2 4' },
]

const SLOPPINESS_OPTIONS = [
  { value: 0, label: '0' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
]

const EDGE_OPTIONS = [
  { value: 'smooth', icon: 'bx-water' },
  { value: 'rough', icon: 'bx-scatter-chart' },
]

export default function LineSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [thickness, setThickness] = useState(2)
  const [lineStyle, setLineStyle] = useState('solid')
  const [sloppiness, setSloppiness] = useState(0)
  const [edge, setEdge] = useState('smooth')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.LINE}>
      <PropertySection icon="bx-palette" label={<span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: strokeColor }} />}>
        <div className="flex items-center gap-2">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.color}
              onClick={() => setStrokeColor(c.color)}
              className={`w-5 h-5 rounded-full border-[1.5px] transition-all duration-150 ${
                strokeColor === c.color ? 'border-accent scale-125' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-line-chart">
        <div className="flex items-center gap-1">
          {THICKNESSES.map((t) => (
            <button
              key={t.value}
              onClick={() => setThickness(t.value)}
              className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                thickness === t.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              <div className={`w-5 ${t.width} bg-current rounded-full`} />
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-pulse">
        <div className="flex items-center gap-1">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setLineStyle(s.value)}
              className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                lineStyle === s.value ? 'bg-white/10' : 'hover:bg-white/[0.05]'
              }`}
            >
              <svg width="24" height="3" viewBox="0 0 32 12">
                <line x1="2" y1="6" x2="30" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray={s.dash} strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-shape-polygon">
        <div className="flex items-center gap-1">
          {SLOPPINESS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSloppiness(s.value)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] transition-all duration-150 ${
                sloppiness === s.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-wind">
        <div className="flex items-center gap-1">
          {EDGE_OPTIONS.map((e) => (
            <button
              key={e.value}
              onClick={() => setEdge(e.value)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                edge === e.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              <i className={`bx ${e.icon} text-sm`} />
            </button>
          ))}
        </div>
      </PropertySection>
    </ShapeSidebar>
  )
}
