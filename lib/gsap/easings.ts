/** Soft ease-out used for UI enters and reveals. */
export const easeOutSoft = "power2.out"

/** Slightly snappier ease for small presence swaps (icons, toasts). */
export const easeOutSnap = "power3.out"

/** Default durations (seconds). */
export const durations = {
  page: 0.4,
  enter: 0.45,
  reveal: 0.4,
  row: 0.32,
  presence: 0.22,
  hover: 0.18,
} as const

/** Default stagger gaps (seconds). */
export const staggers = {
  section: 0.07,
  row: 0.045,
  card: 0.06,
} as const

/**
 * Max table rows to stagger individually. Beyond this, remaining rows
 * fade in as one group to keep main-thread cost bounded on large pages.
 */
export const TABLE_ROW_STAGGER_CAP = 24
