"use client"

import { useEffect } from 'react'
import useSketchStore, { TOOLS, SHORTCUT_MAP } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'

export default function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e) {
      const key = e.key.toLowerCase()

      // Global Ctrl shortcuts (work even when typing)
      if (e.ctrlKey || e.metaKey) {
        if (key === 's') {
          e.preventDefault()
          useUIStore.getState().toggleSaveModal()
          return
        }
        if (key === '/') {
          e.preventDefault()
          useUIStore.getState().toggleShortcutsModal()
          return
        }
      }

      // Skip if user is typing in an input, textarea, or contenteditable
      const tag = e.target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
      if (document.querySelector('.text-edit-overlay:not(.hidden)')) return

      const store = useSketchStore.getState()

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (key === 'a' && !e.shiftKey) {
          e.preventDefault()
          store.setActiveTool(TOOLS.SELECT)
          // Select all will be handled by engine
          return
        }
        if (key === 'g' && !e.shiftKey) {
          e.preventDefault()
          // Group — handled by engine
          return
        }
        if (key === 'g' && e.shiftKey) {
          e.preventDefault()
          // Ungroup — handled by engine
          return
        }
        if (key === 'd') {
          e.preventDefault()
          // Duplicate — handled by engine
          return
        }
        return
      }

      // Tool switching shortcuts (no modifier keys)
      if (!e.shiftKey && !e.altKey) {
        const tool = SHORTCUT_MAP[key]
        if (tool) {
          e.preventDefault()
          store.setActiveTool(tool)
          return
        }

        if (e.key === 'Escape') {
          const uiStore = useUIStore.getState()
          if (uiStore.shortcutsModalOpen) {
            uiStore.toggleShortcutsModal()
            return
          }
          if (uiStore.saveModalOpen) {
            uiStore.toggleSaveModal()
            return
          }
          if (uiStore.menuOpen) {
            uiStore.closeMenu()
            return
          }
          // Deselect all — handled by engine
          store.setCurrentShape(null)
          return
        }
      }
    }

    // Prevent browser zoom on Ctrl+scroll, route to canvas zoom
    function handleWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const store = useSketchStore.getState()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        store.setZoom(store.zoom + delta)

        // Update the SVG viewBox if the engine has set up the global
        if (typeof window !== 'undefined' && window.currentZoom !== undefined) {
          window.currentZoom = store.zoom + delta
          const svgEl = document.getElementById('freehand-canvas')
          if (svgEl) {
            const w = window.innerWidth / window.currentZoom
            const h = window.innerHeight / window.currentZoom
            if (window.currentViewBox) {
              window.currentViewBox.width = w
              window.currentViewBox.height = h
              svgEl.setAttribute(
                'viewBox',
                `${window.currentViewBox.x} ${window.currentViewBox.y} ${w} ${h}`
              )
            }
          }
          // Update zoom display if it exists
          const zoomSpan = document.getElementById('zoomPercent')
          if (zoomSpan) {
            zoomSpan.innerText = Math.round(window.currentZoom * 100) + '%'
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])
}
