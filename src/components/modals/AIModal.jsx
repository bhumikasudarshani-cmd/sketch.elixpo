"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useUIStore from '@/store/useUIStore'

// Floating toast that shows AI generation progress — lives outside the modal
function AIToast({ status, message, onDismiss }) {
  if (!status) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up font-[lixFont]">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
        status === 'loading'
          ? 'bg-surface-card/90 border-accent-blue/30'
          : status === 'success'
          ? 'bg-surface-card/90 border-green-500/30'
          : 'bg-surface-card/90 border-red-500/30'
      }`}>
        {status === 'loading' && (
          <>
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin" />
            </div>
            <span className="text-text-primary text-sm">Generating diagram...</span>
          </>
        )}
        {status === 'success' && (
          <>
            <i className="bx bx-check-circle text-green-400 text-lg" />
            <span className="text-text-primary text-sm">Diagram placed on canvas</span>
          </>
        )}
        {status === 'error' && (
          <>
            <i className="bx bx-error-circle text-red-400 text-lg" />
            <span className="text-red-300 text-sm">{message}</span>
            <button onClick={onDismiss} className="text-text-dim hover:text-text-primary ml-1">
              <i className="bx bx-x text-base" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Mini SVG preview component
function DiagramPreview({ svgMarkup }) {
  if (!svgMarkup) return null
  return (
    <div
      className="w-full rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  )
}

export default function AIModal() {
  const aiModalOpen = useUIStore((s) => s.aiModalOpen)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  const [mode, setMode] = useState('describe')
  const [prompt, setPrompt] = useState('')
  const [toast, setToast] = useState({ status: null, message: '' })

  // Preview state
  const [previewDiagram, setPreviewDiagram] = useState(null) // the JSON diagram
  const [previewSVG, setPreviewSVG] = useState('')            // rendered SVG preview string
  const [isGenerating, setIsGenerating] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')             // follow-up edit prompt
  const [chatHistory, setChatHistory] = useState([])           // conversation context for edits

  const editInputRef = useRef(null)

  // Auto-dismiss success toast
  useEffect(() => {
    if (toast.status === 'success') {
      const t = setTimeout(() => setToast({ status: null, message: '' }), 2500)
      return () => clearTimeout(t)
    }
  }, [toast.status])

  // Focus edit input when preview appears
  useEffect(() => {
    if (previewDiagram && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [previewDiagram])


  // Reset state when modal closes
  useEffect(() => {
    if (!aiModalOpen) {
      // Don't reset preview — user might reopen
    }
  }, [aiModalOpen])

  const resetPreview = useCallback(() => {
    setPreviewDiagram(null)
    setPreviewSVG('')
    setEditPrompt('')
    setChatHistory([])
    setPrompt('')
  }, [])

  // Generate preview (don't place on canvas yet)
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    const currentPrompt = prompt.trim()
    const isMermaid = mode === 'mermaid'

    // MERMAID: parse locally, show preview
    if (isMermaid) {
      if (window.__mermaidParser) {
        const diagram = window.__mermaidParser(currentPrompt)
        if (diagram) {
          setPreviewDiagram(diagram)
          if (window.__aiPreview) {
            setPreviewSVG(window.__aiPreview(diagram))
          }
          setChatHistory([{ role: 'user', content: currentPrompt }])
        } else {
          setToast({ status: 'error', message: 'Invalid Mermaid syntax. Check your input.' })
        }
      } else {
        setToast({ status: 'error', message: 'Mermaid parser not ready' })
      }
      return
    }

    // TEXT-TO-DIAGRAM: call AI, show preview
    setIsGenerating(true)

    try {
      const messages = [
        ...chatHistory,
        { role: 'user', content: currentPrompt },
      ]

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          mode: 'text',
          history: chatHistory.length > 0 ? chatHistory : undefined,
          previousDiagram: previewDiagram || undefined,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setToast({ status: 'error', message: 'Invalid server response' })
        setIsGenerating(false)
        return
      }

      if (!res.ok || data.error) {
        setToast({ status: 'error', message: data.error || `Failed (${res.status})` })
        setIsGenerating(false)
        return
      }

      if (!data.diagram || !data.diagram.nodes || data.diagram.nodes.length === 0) {
        setToast({ status: 'error', message: 'Empty diagram. Try rephrasing.' })
        setIsGenerating(false)
        return
      }

      // Show preview
      setPreviewDiagram(data.diagram)
      if (window.__aiPreview) {
        setPreviewSVG(window.__aiPreview(data.diagram))
      }
      setChatHistory([...messages, { role: 'assistant', content: JSON.stringify(data.diagram) }])
    } catch (err) {
      console.error('[AIModal] Fetch error:', err)
      setToast({ status: 'error', message: 'Connection failed. Try again.' })
    }

    setIsGenerating(false)
  }, [prompt, mode, chatHistory, previewDiagram])

  // Send an edit suggestion to refine the preview
  const handleEdit = useCallback(async (directText) => {
    const text = directText || editPrompt.trim()
    if (!text || !previewDiagram) return

    const editText = text
    setEditPrompt('')
    setIsGenerating(true)

    try {
      const newHistory = [
        ...chatHistory,
        { role: 'user', content: editText },
      ]

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editText,
          mode: 'text',
          history: chatHistory,
          previousDiagram: previewDiagram,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setToast({ status: 'error', message: 'Invalid server response' })
        setIsGenerating(false)
        return
      }

      if (!res.ok || data.error) {
        setToast({ status: 'error', message: data.error || `Failed (${res.status})` })
        setIsGenerating(false)
        return
      }

      if (!data.diagram || !data.diagram.nodes || data.diagram.nodes.length === 0) {
        setToast({ status: 'error', message: 'Edit returned empty diagram.' })
        setIsGenerating(false)
        return
      }

      setPreviewDiagram(data.diagram)
      if (window.__aiPreview) {
        setPreviewSVG(window.__aiPreview(data.diagram))
      }
      setChatHistory([...newHistory, { role: 'assistant', content: JSON.stringify(data.diagram) }])
    } catch (err) {
      setToast({ status: 'error', message: 'Connection failed.' })
    }

    setIsGenerating(false)
  }, [editPrompt, previewDiagram, chatHistory])

  // Place the previewed diagram on the canvas
  const handlePlace = useCallback(() => {
    if (!previewDiagram) return

    toggleAIModal()

    if (window.__aiRenderer) {
      const success = window.__aiRenderer(previewDiagram)
      if (success === false) {
        setToast({ status: 'error', message: 'Failed to render diagram' })
        return
      }
    }

    setToast({ status: 'success', message: '' })
    resetPreview()
  }, [previewDiagram, toggleAIModal, resetPreview])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (previewDiagram) {
        handlePlace()
      } else {
        handleGenerate()
      }
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
  }

  return (
    <>
      {/* Toast — always rendered, even when modal is closed */}
      <AIToast
        status={toast.status}
        message={toast.message}
        onDismiss={() => setToast({ status: null, message: '' })}
      />

      {/* Modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
          onClick={toggleAIModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className={`relative bg-surface-card border border-border-light rounded-2xl p-8 mx-4 transition-all duration-300 ${
              previewDiagram ? 'w-[700px]' : 'w-[580px]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                </svg>
                AI Diagram Generator
              </h2>
              <div className="flex items-center gap-2">
                {previewDiagram && (
                  <button
                    onClick={resetPreview}
                    className="px-3 py-1.5 rounded-lg text-text-muted text-xs hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
                  >
                    Start Over
                  </button>
                )}
                <button
                  onClick={toggleAIModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
                >
                  <i className="bx bx-x text-2xl" />
                </button>
              </div>
            </div>

            {/* No preview yet — show initial prompt UI */}
            {!previewDiagram ? (
              <>
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
                  disabled={isGenerating}
                />

                {/* Footer */}
                <div className="flex items-center justify-between mt-5">
                  <span className="text-text-dim text-xs">Ctrl + Enter to generate</span>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      !prompt.trim() || isGenerating
                        ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                        : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                    }`}
                  >
                    {isGenerating && (
                      <div className="relative w-4 h-4">
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
                      </div>
                    )}
                    {isGenerating ? 'Generating...' : 'Preview Diagram'}
                  </button>
                </div>
              </>
            ) : (
              /* Preview mode — show diagram + edit input */
              <>
                {/* Preview */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider">Preview</p>
                    <p className="text-text-dim text-xs">
                      {previewDiagram.nodes?.length || 0} nodes, {previewDiagram.edges?.length || 0} edges
                    </p>
                  </div>
                  <DiagramPreview svgMarkup={previewSVG} />
                </div>

                {/* Edit input */}
                <div className="mb-4">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Suggest Edits</p>
                  <div className="flex gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      placeholder='e.g. "Add an error handling step" or "Make it left-to-right"'
                      className="flex-1 bg-surface-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-blue placeholder:text-text-dim"
                      disabled={isGenerating}
                    />
                    <button
                      onClick={handleEdit}
                      disabled={!editPrompt.trim() || isGenerating}
                      className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                        !editPrompt.trim() || isGenerating
                          ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                          : 'bg-surface-active text-text-primary hover:bg-white/[0.12]'
                      }`}
                    >
                      {isGenerating ? (
                        <div className="relative w-4 h-4">
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
                        </div>
                      ) : (
                        <i className="bx bx-refresh text-base" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick edit suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {['Add more detail', 'Simplify it', 'Use left-to-right layout', 'Add error handling'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleEdit(suggestion)}
                      disabled={isGenerating}
                      className="px-3 py-1 rounded-lg text-[11px] text-text-dim border border-white/[0.06] hover:border-white/[0.15] hover:text-text-secondary transition-all duration-150"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-text-dim text-xs">Ctrl + Enter to place</span>
                  <div className="flex gap-2">
                    <button
                      onClick={resetPreview}
                      className="px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handlePlace}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-all duration-200 flex items-center gap-2"
                    >
                      <i className="bx bx-check text-base" />
                      Place on Canvas
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
