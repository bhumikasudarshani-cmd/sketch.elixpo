"use client"

import { useState } from 'react'
import useUIStore from '@/store/useUIStore'

export default function AIModal() {
  const aiModalOpen = useUIStore((s) => s.aiModalOpen)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  const [mode, setMode] = useState('describe')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!aiModalOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: mode === 'describe' ? 'text' : 'mermaid',
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setError('Failed to parse server response. Please try again.')
        return
      }

      if (!res.ok || data.error) {
        setError(data.error || `Generation failed (${res.status})`)
        return
      }

      if (!data.diagram || !data.diagram.nodes || data.diagram.nodes.length === 0) {
        setError('AI returned an empty diagram. Try rephrasing your prompt.')
        return
      }

      // Render diagram on canvas
      if (window.__aiRenderer) {
        window.__aiRenderer(data.diagram)
      }

      // Close modal and reset
      setPrompt('')
      setError(null)
      toggleAIModal()
    } catch (err) {
      console.error('[AIModal] Fetch error:', err)
      setError('Could not reach the AI service. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleAIModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface-card border border-border-light rounded-2xl p-8 w-[580px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
            </svg>
            AI Diagram Generator
          </h2>
          <button
            onClick={toggleAIModal}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 mb-5 bg-surface-dark rounded-xl p-1">
          <button
            onClick={() => setMode('describe')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              mode === 'describe'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Describe
          </button>
          <button
            onClick={() => setMode('mermaid')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              mode === 'mermaid'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Mermaid
          </button>
        </div>

        {/* Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'describe'
              ? 'Describe a diagram...\n\ne.g. "User authentication flow with login, 2FA verification, and dashboard redirect"'
              : 'Paste Mermaid syntax...\n\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]'
          }
          className={`w-full bg-surface-dark border border-border rounded-xl px-5 py-4 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim ${
            mode === 'mermaid' ? 'h-56 font-mono' : 'h-40'
          }`}
          autoFocus
        />

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <i className="bx bx-error-circle text-red-400 text-base mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-5">
          <span className="text-text-dim text-xs">Ctrl + Enter to generate</span>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              !prompt.trim() || loading
                ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                : 'bg-accent-blue text-white hover:bg-accent-blue/80'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Diagram'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
