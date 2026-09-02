"use client"

import * as React from "react"
import type { TextFormatType } from "lexical"
import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from "@lexical/rich-text"
import { $createParagraphNode } from "lexical"
import {
  activeEditor$,
  applyFormat$,
  applyListType$,
  convertSelectionToNode$,
  currentBlockType$,
  currentFormat$,
  currentListType$,
  IS_BOLD,
  IS_ITALIC,
  IS_UNDERLINE,
} from "@mdxeditor/editor"
import { useCellValue, usePublisher } from "@mdxeditor/gurx"
import { mergeRegister } from "@lexical/utils"
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical"
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const toolItemClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:hover:bg-accent"

function preventEditorBlur(event: React.MouseEvent) {
  event.preventDefault()
}

function UndoRedoToggles() {
  const activeEditor = useCellValue(activeEditor$)
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)

  React.useEffect(() => {
    if (!activeEditor) {
      setCanUndo(false)
      setCanRedo(false)
      return
    }

    return mergeRegister(
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      )
    )
  }, [activeEditor])

  return (
    <ToggleGroup variant="default" size="sm" spacing={0} value={[]}>
      <ToggleGroupItem
        value="undo"
        aria-label="Undo"
        disabled={!canUndo}
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => activeEditor?.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <Undo2 />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="redo"
        aria-label="Redo"
        disabled={!canRedo}
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => activeEditor?.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <Redo2 />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function InlineFormatToggles() {
  const format = useCellValue(currentFormat$)
  const applyFormat = usePublisher(applyFormat$)

  const value = React.useMemo(() => {
    const active: string[] = []
    if (format & IS_BOLD) active.push("bold")
    if (format & IS_ITALIC) active.push("italic")
    if (format & IS_UNDERLINE) active.push("underline")
    return active
  }, [format])

  return (
    <ToggleGroup
      multiple
      variant="default"
      size="sm"
      spacing={0}
      value={value}
      onValueChange={(next) => {
        if (next.length > value.length) {
          const added = next.find((item) => !value.includes(item))
          if (added) applyFormat(added as TextFormatType)
          return
        }
        const removed = value.find((item) => !next.includes(item))
        if (removed) applyFormat(removed as TextFormatType)
      }}
    >
      <ToggleGroupItem value="bold" aria-label="Bold" className={toolItemClass} onMouseDown={preventEditorBlur}>
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic" className={toolItemClass} onMouseDown={preventEditorBlur}>
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="underline"
        aria-label="Underline"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
      >
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function BlockTypeToggles() {
  const blockType = useCellValue(currentBlockType$)
  const convertSelectionToNode = usePublisher(convertSelectionToNode$)

  const value = blockType || "paragraph"

  const setBlockType = (type: string) => {
    if (type === value) return
    switch (type) {
      case "quote":
        convertSelectionToNode(() => $createQuoteNode())
        break
      case "paragraph":
        convertSelectionToNode(() => $createParagraphNode())
        break
      default:
        if (type.startsWith("h")) {
          convertSelectionToNode(() => $createHeadingNode(type as HeadingTagType))
        }
    }
  }

  return (
    <ToggleGroup variant="default" size="sm" spacing={0} value={[value]}>
      <ToggleGroupItem
        value="paragraph"
        aria-label="Paragraph"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => setBlockType("paragraph")}
      >
        <Pilcrow />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="h1"
        aria-label="Heading 1"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => setBlockType("h1")}
      >
        <Heading1 />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="h2"
        aria-label="Heading 2"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => setBlockType("h2")}
      >
        <Heading2 />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="quote"
        aria-label="Quote"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
        onClick={() => setBlockType("quote")}
      >
        <Quote />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function ListFormatToggles() {
  const listType = useCellValue(currentListType$)
  const applyListType = usePublisher(applyListType$)

  return (
    <ToggleGroup
      variant="default"
      size="sm"
      spacing={0}
      value={listType ? [listType] : []}
      onValueChange={(next) => {
        const selected = next[0]
        if (!selected) {
          applyListType("")
          return
        }
        if (selected === listType) {
          applyListType("")
          return
        }
        if (selected === "bullet" || selected === "number") {
          applyListType(selected)
        }
      }}
    >
      <ToggleGroupItem
        value="bullet"
        aria-label="Bulleted list"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
      >
        <List />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="number"
        aria-label="Numbered list"
        className={toolItemClass}
        onMouseDown={preventEditorBlur}
      >
        <ListOrdered />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function EditorFormatToolbar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-start gap-1 rounded-xl border border-border/80 bg-muted/40 p-1.5 shadow-xs",
        className
      )}
    >
      <UndoRedoToggles />
      <Separator orientation="vertical" className="mx-0.5 h-6" />
      <InlineFormatToggles />
      <Separator orientation="vertical" className="mx-0.5 h-6" />
      <BlockTypeToggles />
      <Separator orientation="vertical" className="mx-0.5 h-6" />
      <ListFormatToggles />
    </div>
  )
}
