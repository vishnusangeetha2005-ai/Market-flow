import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedListProps {
  children: ReactNode[]
  className?: string
  staggerDelay?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children.map((child, i) => (
        <motion.li key={i} variants={itemVariants}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  )
}

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
}

export function AnimatedListItem({ children, className = '' }: AnimatedListItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
