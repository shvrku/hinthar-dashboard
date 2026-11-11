---
trigger: always_on
---

Follow the Hinthar Dashboard v2 Tactical Monochrome Design System documented in `docs/DESIGN_SYSTEM_AND_STYLING.md` and `docs/FRONTEND_DATA_FLOW_AND_CONTROLS.md`:
- Strict Two-Mode Monochrome theme (`Light` and `Dark` only; `data-palette="mono"` in `app/globals.css`).
- Reserve color (`--success`, `--warning`, `--destructive`) strictly for operational status telemetry (`present`, `late`, `absent`, `excused`) and alerts.
- Use V2 primitives from `components/design-system/v2-primitives.tsx` (`SystemHeader`, `DataModule`, `CohortSwitcher`, `RollStatusControl`, `InspectorSheet`, `CodeChip`, `TelemetryTag`) and shadcn/ui components (`base-vega / zinc` in `components.json`).
- Enforce `4px` (`rounded-sm`) geometry on controls/buttons/inputs and `2px` (`rounded-[2px]`) on code/telemetry tags.
