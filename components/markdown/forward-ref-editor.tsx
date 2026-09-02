"use client"

import dynamic from "next/dynamic"
import { forwardRef } from "react"
import type { MDXEditorMethods } from "@mdxeditor/editor"

import type { InitializedMDXEditorProps } from "@/components/markdown/initialized-mdx-editor"

const Editor = dynamic(() => import("@/components/markdown/initialized-mdx-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
      Loading editor…
    </div>
  ),
})

export const ForwardRefEditor = forwardRef<
  MDXEditorMethods,
  Omit<InitializedMDXEditorProps, "editorRef">
>((props, ref) => <Editor {...props} editorRef={ref} />)

ForwardRefEditor.displayName = "ForwardRefEditor"
