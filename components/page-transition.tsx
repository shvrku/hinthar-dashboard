"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: 0.25,
          ease: [0.22, 1, 0.36, 1], // Custom smooth cubic bezier
        }}
        className="w-full flex-1 flex flex-col min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
