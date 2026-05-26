'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubmitButtonProps = {
  children: React.ReactNode
  pendingText?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'
  formAction?: (formData: FormData) => void | Promise<void>
}

export function SubmitButton({
  children,
  pendingText,
  className,
  variant = 'default',
  formAction,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      formAction={formAction}
      variant={variant}
      disabled={pending}
      aria-disabled={pending}
      className={cn('w-full h-11 gap-2', className)}
    >
      {pending && (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      )}
      {pending ? (pendingText ?? children) : children}
    </Button>
  )
}
