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
  { value: 'S', label: 'S', px: 14 },
  { value: 'M', label: 'M', px: 18 },
  { value: 'L', label: 'L', px: 24 },
  { value: 'XL', label: 'XL', px: 32 },
]

const FONTS = [
  { value: 'lixFont', label: 'LixFont' },
  { value: 'lixCode', label: 'LixCode' },
  { value: 'lixDefault', label: 'LixDefault' },
  { value: 'lixFancy', label: 'LixFancy' },
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
  const [fontExpanded, setFontExpanded] = useState(false)
  const [codeMode, setCodeMode] = useState(false)
  const [language, setLanguage] = useState('javascript')
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  const visible = activeTool === TOOLS.TEXT || activeTool === TOOLS.CODE

  return (
    <ShapeSidebar visible={visible}>
      <PropertySection label="Color">
        <div className="flex items-center gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.color}
              title={c.label}
              onClick={() => setTextColor(c.color)}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                textColor === c.color
                  ? 'border-accent scale-110'
                  : 'border-border hover:border-border-light'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Font">
        <div className="relative">
          <button
            onClick={() => setFontExpanded(!fontExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
          >
            <span style={{ fontFamily: font }}>{font}</span>
            <i className={`bx bx-chevron-${fontExpanded ? 'up' : 'down'} text-sm`} />
          </button>
          {fontExpanded && (
            <div className="absolute top-full left-0 mt-1 bg-surface-dark border border-border-light rounded-lg z-10 min-w-[100px]">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setFont(f.value)
                    setFontExpanded(false)
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs transition-all duration-200 first:rounded-t-lg last:rounded-b-lg ${
                    font === f.value
                      ? 'bg-surface-active text-text-primary'
                      : 'text-text-muted hover:bg-surface-hover'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </PropertySection>

      <Divider />

      <PropertySection label="Size">
        <div className="flex items-center gap-1">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFontSize(s.value)}
              className={`px-2 py-1 rounded-lg text-[10px] transition-all duration-200 ${
                fontSize === s.value
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

      <PropertySection label="Code">
        <button
          onClick={() => setCodeMode(!codeMode)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
            codeMode
              ? 'bg-surface-active text-text-primary'
              : 'text-text-muted hover:bg-surface-hover'
          }`}
        >
          <i className="bx bx-code-alt text-sm" />
          <div
            className={`w-7 h-3.5 rounded-full transition-all duration-200 relative ${
              codeMode ? 'bg-accent-blue' : 'bg-surface-dark'
            }`}
          >
            <div
              className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-200 ${
                codeMode ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </div>
        </button>
      </PropertySection>

      {codeMode && (
        <>
          <Divider />
          <PropertySection label="Language">
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-secondary text-xs bg-surface-dark border border-border hover:border-border-light transition-all duration-200"
              >
                {language}
                <i className={`bx bx-chevron-${langDropdownOpen ? 'up' : 'down'} text-sm`} />
              </button>
              {langDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 bg-surface-dark border border-border-light rounded-lg max-h-[160px] overflow-y-auto no-scrollbar z-10 min-w-[120px]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang)
                        setLangDropdownOpen(false)
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs transition-all duration-200 first:rounded-t-lg last:rounded-b-lg ${
                        language === lang
                          ? 'bg-surface-active text-text-primary'
                          : 'text-text-muted hover:bg-surface-hover'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PropertySection>
        </>
      )}
    </ShapeSidebar>
  )
}
