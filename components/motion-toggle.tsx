"use client"

import * as React from "react"
import { Rabbit, Turtle } from "lucide-react"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { Button } from "@/components/ui/button"
import { GsapPresence } from "@/components/animation/gsap-presence"

export function MotionToggle() {
  const { reducedMotion, toggleReducedMotion } = useMotionPreference()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleReducedMotion}
      aria-label={
        reducedMotion ? "Enable animations" : "Reduce motion"
      }
      aria-pressed={reducedMotion}
      title={reducedMotion ? "Enable animations" : "Reduce motion"}
    >
      <GsapPresence activeKey={reducedMotion ? "reduced" : "full"}>
        {reducedMotion ? (
          <Rabbit className="size-4" />
        ) : (
          <Turtle className="size-4" />
        )}
      </GsapPresence>
      <span className="sr-only">
        {reducedMotion ? "Enable animations" : "Reduce motion"}
      </span>
    </Button>
  )
}
