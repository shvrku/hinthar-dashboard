export function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder = "text"
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end) || placeholder
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  const cursorStart = start + before.length
  const cursorEnd = cursorStart + selected.length
  return { next, cursorStart, cursorEnd }
}

export function insertAtCursor(textarea: HTMLTextAreaElement, snippet: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const next = value.slice(0, start) + snippet + value.slice(end)
  const cursor = start + snippet.length
  return { next, cursorStart: cursor, cursorEnd: cursor }
}

export function applyTextareaUpdate(
  textarea: HTMLTextAreaElement,
  next: string,
  cursorStart: number,
  cursorEnd: number
) {
  textarea.value = next
  textarea.focus()
  textarea.setSelectionRange(cursorStart, cursorEnd)
  textarea.dispatchEvent(new Event("input", { bubbles: true }))
}
