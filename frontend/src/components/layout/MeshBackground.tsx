import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MeshBackgroundProps {
  children: ReactNode
}

export function MeshBackground({ children }: MeshBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      {/* Gradient orbs */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -25, 0],
          y: [0, 25, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-300/30 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, 20, -10, 0],
          y: [0, -15, 10, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-200/20 blur-3xl"
      />

      {/* Grid mesh overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
