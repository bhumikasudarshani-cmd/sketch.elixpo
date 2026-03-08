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

const BG_COLORS = [
  { color: '#f0f0f0', label: 'Light Gray' },
  { color: '#ffcccb', label: 'Light Red' },
  { color: '#90ee90', label: 'Light Green' },
  { color: '#add8e6', label: 'Light Blue' },
  { color: 'transparent', label: 'None' },
]

const THICKNESSES = [
  { value: 2, icon: 'bx-minus', width: 'h-px' },
  { value: 5, icon: 'bx-minus', width: 'h-0.5' },
  { value: 7, icon: 'bx-minus', width: 'h-1' },
]

const STYLES = [
  { value: 'solid', svg: 'M0,6 L32,6', dash: '' },
  { value: 'dashed', svg: 'M0,6 L32,6', dash: '6 4' },
  { value: 'dotted', svg: 'M0,6 L32,6', dash: '2 4' },
]

const FILLS = [
  { value: 'hachure', label: 'Hachure' },
  { value: 'solid', label: 'Solid' },
  { value: 'dots', label: 'Dots' },
  { value: 'cross-hatch', label: 'Cross' },
  { value: 'transparent', label: 'None' },
]

function ColorDot({ color, selected, onClick }) {
  const isTrans = color === 'transparent'
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-full border-[1.5px] transition-all duration-150 ${
        selected ? 'border-accent scale-125 shadow-sm shadow-accent/30' : 'border-transparent hover:scale-110'
      } ${isTrans ? 'bg-transparent' : ''}`}
      style={!isTrans ? { backgroundColor: color } : undefined}
    >
      {isTrans && (
        <svg className="w-full h-full text-text-dim" viewBox="0 0 20 20">
          <line x1="4" y1="16" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </button>
  )
}

export default function RectangleSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [bgColor, setBgColor] = useState('transparent')
  const [thickness, setThickness] = useState(2)
  const [lineStyle, setLineStyle] = useState('solid')
  const [fillStyle, setFillStyle] = useState('hachure')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.RECTANGLE}>
      {/* Stroke color - show current color dot */}
      <PropertySection icon="bx-palette" label={<span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: strokeColor }} />}>
        <div className="flex items-center gap-2">
          {STROKE_COLORS.map((c) => (
            <ColorDot key={c.color} color={c.color} selected={strokeColor === c.color} onClick={() => setStrokeColor(c.color)} />
          ))}
        </div>
      </PropertySection>

      <Divider />

      {/* Background */}
      <PropertySection icon="bx-paint-roll" label={<span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }} />}>
        <div className="flex items-center gap-2">
          {BG_COLORS.map((c) => (
            <ColorDot key={c.color} color={c.color} selected={bgColor === c.color} onClick={() => setBgColor(c.color)} />
          ))}
        </div>
      </PropertySection>

      <Divider />

      {/* Thickness */}
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

      {/* Stroke style */}
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

      {/* Fill style */}
      <PropertySection icon="bx-brush">
        <div className="flex items-center gap-1">
          {FILLS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFillStyle(f.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] transition-all duration-150 ${
                fillStyle === f.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </PropertySection>
    </ShapeSidebar>
  )
}
