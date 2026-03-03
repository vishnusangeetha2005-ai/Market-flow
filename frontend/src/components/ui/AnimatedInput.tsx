import { motion } from 'framer-motion'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <motion.div
          animate={{
            boxShadow: isFocused
              ? '0 0 0 3px rgba(139,92,246,0.25)'
              : '0 0 0 0px rgba(139,92,246,0)',
          }}
          transition={{ duration: 0.15 }}
          className="rounded-xl overflow-hidden"
        >
          <input
            ref={ref}
            id={inputId}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400',
              'outline-none transition-colors duration-150',
              isFocused ? 'border-purple-500' : 'border-gray-200',
              error ? 'border-red-400' : '',
              className
            )}
            {...props}
          />
        </motion.div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)

AnimatedInput.displayName = 'AnimatedInput'
