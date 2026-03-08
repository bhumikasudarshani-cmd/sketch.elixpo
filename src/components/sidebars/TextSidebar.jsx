"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar, { PropertySection, Divider } from './ShapeSidebar'
import { useState } from 'react'

const TEXT_COLORS = [
  { color: '#fff', label: 'White' },
  { color: '#FF8383', label: 'Red' },
  { color: '#3A994C', label: 'Green' },
  { color: '#56A2E8', label: 'Blue' },
  { color: '#FFD700', label: 'Gold' },
]

const FONT_SIZES = [
  { value: 'S', px: 14 },
  { value: 'M', px: 18 },
  { value: 'L', px: 24 },
  { value: 'XL', px: 32 },
]

const FONTS = [
  { value: 'lixFont', label: 'Lix' },
  { value: 'lixCode', label: 'Code' },
  { value: 'lixDefault', label: 'Default' },
  { value: 'lixFancy', label: 'Fancy' },
]

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
  'sql', 'bash', 'json', 'yaml', 'markdown',
]

export default function TextSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [textColor, setTextColor] = useState('#fff')
  const [fontSize, setFontSize] = useState('M')
  const [font, setFont] = useState('lixFont')
  const [codeMode, setCodeMode] = useState(false)
  const [language, setLanguage] = useState('javascript')

  const visible = activeTool === TOOLS.TEXT || activeTool === TOOLS.CODE

  return (
    <ShapeSidebar visible={visible}>
      <PropertySection icon="bx-palette" label={<span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: textColor }} />}>
        <div className="flex items-center gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.color}
              onClick={() => setTextColor(c.color)}
              className={`w-5 h-5 rounded-full border-[1.5px] transition-all duration-150 ${
                textColor === c.color ? 'border-accent scale-125' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-font-family">
        <div className="flex items-center gap-1">
          {FONTS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFont(f.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] transition-all duration-150 ${
                font === f.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-font-size">
        <div className="flex items-center gap-1">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFontSize(s.value)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] transition-all duration-150 ${
                fontSize === s.value ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/[0.05]'
              }`}
            >
              {s.value}
            </button>
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection icon="bx-code-alt">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCodeMode(!codeMode)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 ${
              codeMode ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted hover:bg-white/[0.05]'
            }`}
          >
            <div
              className={`w-6 h-3 rounded-full transition-all duration-150 relative ${
                codeMode ? 'bg-accent-blue' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all duration-150 ${
                  codeMode ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </div>
            Code
          </button>
          {codeMode && (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 rounded text-[9px] transition-all duration-150 ${
                    language === lang ? 'bg-white/10 text-white' : 'text-text-dim hover:bg-white/[0.05] hover:text-text-muted'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </PropertySection>
    </ShapeSidebar>
  )
}
