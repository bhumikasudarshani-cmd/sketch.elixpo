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

const OUTLINE_STYLES = [
  { value: 'solid', dash: '' },
  { value: 'dashed', dash: '6 4' },
  { value: 'dotted', dash: '2 4' },
]

const HEAD_STYLES = [
  {
    value: 'default',
    svg: '<svg width="20" height="14" viewBox="0 0 24 16"><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="2"/><polyline points="14,3 20,8 14,13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  },
  {
    value: 'square',
    svg: '<svg width="20" height="14" viewBox="0 0 24 16"><line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2"/><rect x="15" y="4" width="6" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    value: 'outline',
    svg: '<svg width="20" height="14" viewBox="0 0 24 16"><line x1="2" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/><polygon points="14,3 22,8 14,13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    value: 'solid',
    svg: '<svg width="20" height="14" viewBox="0 0 24 16"><line x1="2" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/><polygon points="14,3 22,8 14,13" fill="currentColor" stroke="currentColor" stroke-width="1"/></svg>',
  },
]

const ARROW_TYPES = [
  { value: 'straight', icon: 'bx-trending-up' },
  { value: 'curved', icon: 'bx-transfer' },
  { value: 'elbow', icon: 'bx-git-branch' },
]

const CURVATURES = [
  { value: 8, label: 'Lo' },
  { value: 20, label: 'Md' },
  { value: 40, label: 'Hi' },
]

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function ArrowSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [headStyle, setHeadStyle] = useState('default')
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [thickness, setThickness] = useState(2)
  const [outlineStyle, setOutlineStyle] = useState('solid')
  const [arrowType, setArrowType] = useState('straight')
  const [curvature, setCurvature] = useState(8)

  return (
    <ShapeSidebar visible={activeTool === TOOLS.ARROW}>
      <PropertySection icon="bx-chevrons-right">
        <div className="flex items-center gap-1">
          {HEAD_STYLES.map((h) => (
            <button
              key={h.value}
              onClick={() => setHeadStyle(h.value)}
              className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                headStyle === h.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              <SvgIcon svg={h.svg} />
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

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
          {OUTLINE_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setOutlineStyle(s.value)}
              className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                outlineStyle === s.value ? 'bg-white/10' : 'hover:bg-white/[0.05]'
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

      <PropertySection icon="bx-git-merge">
        <div className="flex items-center gap-1">
          {ARROW_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => setArrowType(a.value)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                arrowType === a.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              <i className={`bx ${a.icon} text-sm`} />
            </button>
          ))}
        </div>
      </PropertySection>

      {arrowType === 'curved' && (
        <>
          <Divider />
          <PropertySection icon="bx-trip">
            <div className="flex items-center gap-1">
              {CURVATURES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCurvature(c.value)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] transition-all duration-150 ${
                    curvature === c.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </PropertySection>
        </>
      )}
    </ShapeSidebar>
  )
}
