import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"

export function notifySaveSuccess(message: string, onAfter?: () => void) {
  toast.add({ title: message, type: "success" })
  if (onAfter) {
    window.setTimeout(onAfter, 450)
  }
}

export function notifySaveError(err: unknown, fallback: string) {
  toast.add({
    title: err instanceof ApiError ? err.userMessage : fallback,
    type: "error",
  })
}
