import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="url(#logo-grad)" />
        {/* Waveform bars */}
        <rect x="7"  y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.8" />
        <rect x="11" y="11" width="2.5" height="10" rx="1.25" fill="white" />
        <rect x="15" y="8"  width="2.5" height="16" rx="1.25" fill="white" />
        <rect x="19" y="11" width="2.5" height="10" rx="1.25" fill="white" />
        <rect x="23" y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.8" />
      </svg>
      <span className="font-bold text-base tracking-tight text-foreground">
        Secure Music Cloud
      </span>
    </div>
  )
}
