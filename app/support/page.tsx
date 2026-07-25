"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Info, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

export default function CheckInMessagesPage() {
  return (
    <div className="space-y-6">
      <StandardPageHeader
        title="Messages"
        description="This page is apart of the messages section "
      />

      <StaggerContainer className="flex items-center justify-center py-12">
        <StaggerItem>
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-muted">
              <Bell className="size-5 text-muted-foreground" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Support form
            </h2>

            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
              We don't really have any support forms set up yet. Not statisfied? 
              Please contact the feedback form.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Info className="size-3.5" />
              </Button>
              <Button size="sm" className="gap-1.5" render={<Link href="/feedback" />}>
                <ArrowRight className="size-3.5" />
                Go to Feedback
              </Button>
            </div>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </div>
  )
}
