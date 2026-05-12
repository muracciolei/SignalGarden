import { Coffee } from 'lucide-react'

const SUPPORT_URL = 'https://buymeacoffee.com/muracciolei'

export function SupportButton() {
  return (
    <a
      className="support-float group"
      href={SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Support the ecosystem"
    >
      <Coffee size={17} aria-hidden="true" />
      <span className="support-tooltip">Support the ecosystem</span>
    </a>
  )
}
