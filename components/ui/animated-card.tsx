"use client"

import { motion, HTMLMotionProps } from "motion/react"

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  delay?: number
}

export function AnimatedCard({
  children,
  className = "",
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
