import { motion } from 'framer-motion'

interface LoadingScreenProps {
  visible: boolean
}

export function LoadingScreen({ visible }: LoadingScreenProps) {
  if (!visible) {
    return null
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-void"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="loading-core" aria-label="Signal Garden loading">
        <motion.div
          className="loading-orbit"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="loading-pulse"
          animate={{ scale: [0.86, 1.12, 0.86], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="loading-label">
          <span>Signal Garden</span>
          <small>Booting biosphere</small>
        </div>
      </div>
    </motion.div>
  )
}
