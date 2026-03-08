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
  { value: 2, label: 'Thin' },
  { value: 5, label: 'Medium' },
  { value: 7, label: 'Thick' },
]

const STYLES = [
  {
    value: 'solid',
    label: 'Solid',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2"/></svg>',
  },
  {
    value: 'dashed',
    label: 'Dashed',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/></svg>',
  },
  {
    value: 'dotted',
    label: 'Dotted',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="1 3" stroke-linecap="round"/></svg>',
  },
]

const SLOPPINESS_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 2, label: 'Low' },
  { value: 4, label: 'High' },
]

const EDGE_OPTIONS = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'rough', label: 'Rough' },
]

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function LineSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [thickness, setThickness] = useState(2)
  const [lineStyle, setLineStyle] = useState('solid')
  const [sloppiness, setSloppiness] = useState(0)
  const [edge, setEdge] = useState('smooth')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.LINE}>
      <PropertySection label="Stroke">
        <div className="flex items-center gap-1.5">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.color}
              title={c.label}
              onClick={() => setStrokeColor(c.color)}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                strokeColor === c.color
                  ? 'border-accent scale-110'
                  : 'border-border hover:border-border-light'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Thickness">
        <div className="flex items-center gap-1">
          {THICKNESSES.map((t) => (
            <button
              key={t.value}
              onClick={() => setThickness(t.value)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-all duration-200 ${
                thickness === t.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Style">
        <div className="flex items-center gap-1">
          {STYLES.map((s) => (
            <button
              key={s.value}
              title={s.label}
              onClick={() => setLineStyle(s.value)}
              className={`px-2 py-1.5 flex items-center justify-center rounded-lg transition-all duration-200 ${
                lineStyle === s.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <SvgIcon svg={s.svg} />
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Sloppiness">
        <div className="flex items-center gap-1">
          {SLOPPINESS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSloppiness(s.value)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-all duration-200 ${
                sloppiness === s.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Edge">
        <div className="flex items-center gap-1">
          {EDGE_OPTIONS.map((e) => (
            <button
              key={e.value}
              onClick={() => setEdge(e.value)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-all duration-200 ${
                edge === e.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </PropertySection>
    </ShapeSidebar>
  )
}
