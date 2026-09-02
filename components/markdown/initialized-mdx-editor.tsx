"use client"

import type { ForwardedRef } from "react"
import {
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor"

import { EditorFloatingBar } from "@/components/markdown/editor-floating-bar"
import { FormatToolbarPortal } from "@/components/markdown/editor-toolbar-portals"

import "@mdxeditor/editor/style.css"

export type InitializedMDXEditorProps = {
  editorRef: ForwardedRef<MDXEditorMethods> | null
  optionsSlot?: React.ReactNode
  actions?: React.ReactNode
  showFloatingBar?: boolean
} & MDXEditorProps

export default function InitializedMDXEditor({
  editorRef,
  optionsSlot,
  actions,
  showFloatingBar = true,
  className,
  ...props
}: InitializedMDXEditorProps) {
  const floating = showFloatingBar && actions

  return (
    <MDXEditor
      ref={editorRef}
      className={className}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarClassName: "hinthar-mdx-toolbar",
          toolbarPosition: "bottom",
          toolbarContents: () => (
            <>
              <FormatToolbarPortal />
              {floating ? (
                <EditorFloatingBar optionsSlot={optionsSlot} actions={actions} />
              ) : null}
            </>
          ),
        }),
      ]}
      {...props}
    />
  )
}
