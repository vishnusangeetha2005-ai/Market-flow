import { motion } from 'framer-motion'
import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}: GradientButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-purple-200',
    secondary: 'bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:shadow-red-200',
  }
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || isLoading}
      className={cn(
        'rounded-full font-semibold transition-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...(props as object)}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </motion.button>
  )
}
