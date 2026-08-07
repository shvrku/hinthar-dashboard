"use client"

import * as React from "react"
import { Moon, Rabbit, Sun, Turtle } from "lucide-react"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { ThemePaletteCard } from "@/components/theme-palette-card"
import { useTheme, type ThemeMode, type ThemePalette } from "@/components/theme-provider"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const PALETTES: {
  id: ThemePalette
  label: string
  description: string
}[] = [
  {
    id: "emerald",
    label: "Hinthar",
    description: "Emerald accent on zinc neutrals — the default look.",
  },
  {
    id: "mono",
    label: "Monochrome",
    description: "Dashboard-style greys with quiet table chrome.",
  },
]

export default function SettingsPage() {
  const { theme, palette, setTheme, setPalette } = useTheme()
  const { reducedMotion, toggleReducedMotion } = useMotionPreference()

  return (
    <StaggerContainer className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <StaggerItem>
        <StandardPageHeader
          title="Settings"
          description="Appearance preferences for this browser."
        />
      </StaggerItem>

      <div className="flex flex-col gap-8">
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Palette
              </h2>
              <p className="text-sm text-muted-foreground">
                Preview matches your current light or dark mode.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {PALETTES.map((item) => (
                <ThemePaletteCard
                  key={item.id}
                  palette={item.id}
                  label={item.label}
                  description={item.description}
                  mode={theme}
                  selected={palette === item.id}
                  onSelect={() => setPalette(item.id)}
                />
              ))}
            </div>
          </section>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
              <CardDescription>
                Switch between light and dark surfaces. Same as the header toggle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "light" as ThemeMode, label: "Light", icon: Sun },
                    { id: "dark" as ThemeMode, label: "Dark", icon: Moon },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    variant={theme === id ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    aria-pressed={theme === id}
                    onClick={() => setTheme(id)}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Motion</CardTitle>
              <CardDescription>
                Reduce page and table entrance animations. Same as the header turtle / rabbit control.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant={reducedMotion ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5")}
                aria-pressed={reducedMotion}
                onClick={toggleReducedMotion}
              >
                {reducedMotion ? (
                  <Rabbit className="size-3.5" />
                ) : (
                  <Turtle className="size-3.5" />
                )}
                {reducedMotion ? "Animations reduced" : "Full motion"}
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>
    </StaggerContainer>
  )
}
