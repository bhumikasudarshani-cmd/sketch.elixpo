"use client"

import { useEffect, useRef } from 'react'

/**
 * Hook that initializes the SketchEngine on the provided SVG element.
 * Must be called after the SVG is mounted in the DOM.
 */
export default function useSketchEngine(svgRef) {
  const engineRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return

    let cancelled = false

    async function initEngine() {
      try {
        const { SketchEngine } = await import('@/engine/SketchEngine')
        if (cancelled) return

        const engine = new SketchEngine(svgRef.current)
        await engine.init()
        engineRef.current = engine
      } catch (err) {
        console.error('[useSketchEngine] Failed to initialize:', err)
      }
    }

    initEngine()

    return () => {
      cancelled = true
      if (engineRef.current) {
        engineRef.current.cleanup()
        engineRef.current = null
      }
    }
  }, [svgRef])

  return engineRef
}
