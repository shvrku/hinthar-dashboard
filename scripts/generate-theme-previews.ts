/**
 * Regenerates static Settings palette previews into public/themes/.
 * Run: npx tsx scripts/generate-theme-previews.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  renderThemePreview,
} from "../lib/theme-preview"
import type { ThemeMode, ThemePalette } from "../lib/theme-types"

const OUT_DIR = join(process.cwd(), "public", "themes")
const PALETTES: ThemePalette[] = ["emerald", "mono", "amoled"]
const MODES: ThemeMode[] = ["light", "dark"]

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  for (const palette of PALETTES) {
    for (const mode of MODES) {
      const response = renderThemePreview(palette, mode)
      const buffer = Buffer.from(await response.arrayBuffer())
      const file = join(OUT_DIR, `${palette}-${mode}.png`)
      writeFileSync(file, buffer)
      console.log(`wrote ${file} (${buffer.length} bytes)`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
