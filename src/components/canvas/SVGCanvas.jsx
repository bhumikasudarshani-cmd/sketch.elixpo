"use client"

import { useRef } from 'react'
import useSketchStore from '@/store/useSketchStore'
import useSketchEngine from '@/hooks/useSketchEngine'

export default function SVGCanvas() {
  const svgRef = useRef(null)
  const canvasBackground = useSketchStore((s) => s.canvasBackground)
  const getCursor = useSketchStore((s) => s.getCursor)
  const cursor = getCursor()

  // Initialize the imperative sketch engine on this SVG element
  useSketchEngine(svgRef)

  return (
    <svg
      id="freehand-canvas"
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{
        background: canvasBackground,
        cursor,
      }}
      viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1536} ${typeof window !== 'undefined' ? window.innerHeight : 730}`}
    />
  )
}
