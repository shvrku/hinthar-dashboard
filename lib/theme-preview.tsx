import { ImageResponse } from "next/og"
import type { ThemeMode, ThemePalette } from "./theme-types"

export type { ThemeMode, ThemePalette }

export const THEME_PREVIEW_SIZE = { width: 960, height: 540 }

type PreviewColors = {
  background: string
  foreground: string
  card: string
  muted: string
  border: string
  primary: string
  sidebar: string
}

const COLORS: Record<ThemePalette, Record<ThemeMode, PreviewColors>> = {
  emerald: {
    light: {
      background: "#ffffff",
      foreground: "#18181b",
      card: "#ffffff",
      muted: "#f4f4f5",
      border: "#e4e4e7",
      primary: "#0f766e",
      sidebar: "#fafafa",
    },
    dark: {
      background: "#18181b",
      foreground: "#fafafa",
      card: "#27272a",
      muted: "#27272a",
      border: "#3f3f46",
      primary: "#0f766e",
      sidebar: "#27272a",
    },
  },
  mono: {
    light: {
      background: "#ffffff",
      foreground: "#18181b",
      card: "#ffffff",
      muted: "#f4f4f5",
      border: "#e4e4e7",
      primary: "#18181b",
      sidebar: "#fafafa",
    },
    dark: {
      background: "#18181b",
      foreground: "#fafafa",
      card: "#27272a",
      muted: "#27272a",
      border: "#3f3f46",
      primary: "#fafafa",
      sidebar: "#27272a",
    },
  },
  amoled: {
    light: {
      background: "#ffffff",
      foreground: "#18181b",
      card: "#ffffff",
      muted: "#f4f4f5",
      border: "#e4e4e7",
      primary: "#18181b",
      sidebar: "#fafafa",
    },
    dark: {
      background: "#000000",
      foreground: "#fafafa",
      card: "#0a0a0a",
      muted: "#121212",
      border: "#1a1a1a",
      primary: "#fafafa",
      sidebar: "#0a0a0a",
    },
  },
}

/** Simple dashboard chrome snapshot for Settings palette cards. */
export function renderThemePreview(
  palette: ThemePalette,
  mode: ThemeMode
): ImageResponse {
  const c = COLORS[palette][mode]
  const footerBg = palette === "mono" || palette === "amoled" ? c.muted : c.card

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: c.background,
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 180,
            backgroundColor: c.sidebar,
            borderRadius: 12,
            border: `1px solid ${c.border}`,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: c.primary,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              backgroundColor: c.primary,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              backgroundColor: c.muted,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              backgroundColor: c.muted,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              backgroundColor: c.muted,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            marginLeft: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 48,
              borderRadius: 12,
              border: `1px solid ${c.border}`,
              backgroundColor: c.card,
              paddingLeft: 16,
              paddingRight: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 120,
                height: 12,
                borderRadius: 6,
                backgroundColor: c.muted,
              }}
            />
            <div
              style={{
                display: "flex",
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c.primary,
              }}
            />
          </div>

          <div style={{ display: "flex", marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                backgroundColor: c.card,
                marginRight: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.muted,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 88,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: c.foreground,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                backgroundColor: c.card,
                marginRight: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.muted,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 88,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: c.foreground,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                backgroundColor: c.card,
                marginRight: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.muted,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 88,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: c.foreground,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                backgroundColor: c.card,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.muted,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 88,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: c.foreground,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: 12,
              border: `1px solid ${c.border}`,
              backgroundColor: c.card,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 28,
                  marginBottom: 8,
                  backgroundColor: c.muted,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  height: 28,
                  marginBottom: 8,
                  backgroundColor: c.muted,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  height: 28,
                  marginBottom: 8,
                  backgroundColor: c.muted,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  height: 28,
                  backgroundColor: c.muted,
                  borderRadius: 6,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 14,
                paddingRight: 14,
                height: 44,
                borderTop: `1px solid ${c.border}`,
                backgroundColor: footerBg,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 140,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.border,
                }}
              />
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    display: "flex",
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: c.primary,
                    marginRight: 6,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `1px solid ${c.border}`,
                    backgroundColor: c.card,
                    marginRight: 6,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `1px solid ${c.border}`,
                    backgroundColor: c.card,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: THEME_PREVIEW_SIZE.width, height: THEME_PREVIEW_SIZE.height }
  )
}
