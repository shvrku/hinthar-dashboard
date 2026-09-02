"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { useFormatAnchor } from "@/components/markdown/editor-format-anchor"
import { EditorFormatToolbar } from "@/components/markdown/editor-format-toolbar"

export function FormatToolbarPortal() {
  const anchor = useFormatAnchor()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !anchor) return null

  return createPortal(
    <div data-editor-format-row className="mb-3">
      <EditorFormatToolbar />
    </div>,
    anchor
  )
}
