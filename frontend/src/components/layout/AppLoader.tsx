'use client'

import { motion } from 'framer-motion'

export function AppLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      {/* Animated pulsing ring */}
      <div className="relative mb-6">
        {/* Outer pulsing ring */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-3xl border-2 border-teal-400/60 dark:border-teal-500/40"
          style={{ margin: '-8px' }}
        />
        {/* Second pulsing ring */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.25, 0.05, 0.25],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
          className="absolute inset-0 rounded-3xl border border-teal-300/40 dark:border-teal-600/20"
          style={{ margin: '-16px' }}
        />
        {/* Logo */}
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative"
        >
          <img
            src="/logo.png"
            alt="Uwezo School"
            className="w-20 h-20 rounded-2xl shadow-lg shadow-teal-200/50 dark:shadow-teal-900/50 object-contain"
          />
        </motion.div>
      </div>

      {/* Loading text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col items-center gap-1.5"
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 tracking-wide">
          Loading...
        </p>
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400"
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
