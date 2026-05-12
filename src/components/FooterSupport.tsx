import { motion } from 'framer-motion'
import { Coffee, Sparkles } from 'lucide-react'

const SUPPORT_URL = 'https://buymeacoffee.com/muracciolei'

export function FooterSupport() {
  return (
    <section className="support-section">
      <div className="support-section__grid">
        <motion.div
          className="support-section__copy"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="support-kicker">
            <Sparkles size={16} aria-hidden="true" />
            Local-first creative code
          </span>
          <h2>Help Signal Garden evolve</h2>
          <p>
            Support future habitats, stranger shaders, cleaner performance, and more
            browser-native experiments.
          </p>
        </motion.div>
        <motion.a
          className="support-large"
          href={SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Coffee size={24} aria-hidden="true" />
          Buy a coffee
        </motion.a>
      </div>
    </section>
  )
}
