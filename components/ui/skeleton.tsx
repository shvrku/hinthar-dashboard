"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70 dark:bg-muted/40",
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 dark:via-foreground/15 to-transparent"
        animate={{
          transform: ["translateX(-100%)", "translateX(100%)"],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}
