"use client"

import * as React from "react"
import { Bell, Info, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

export default function CheckInMessagesPage() {
  return (
    <div className="space-y-6">

      <StaggerContainer className="flex items-center justify-center py-12">
        <StaggerItem>
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-muted">
              <Bell className="size-5 text-muted-foreground" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Oh! Hi There
            </h2>

            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
              You aren't supposed to be here but I liked the the way you came here.
              You either came here from the breadcrumb or the direct link.
              Either way, I like your curiosity keep it up!  
            </p>


          </Card>
        </StaggerItem>
      </StaggerContainer>
    </div>
  )
}
