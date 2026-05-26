'use client'

import { useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchInputProps = {
  resultCount?: number
}

export function SearchInput({ resultCount }: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get('q') ?? ''
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set('q', value)
        } else {
          params.delete('q')
        }
        router.replace(`/catalog?${params.toString()}`)
      })
    }, 250)
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ''
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('q')
      router.replace(`/catalog?${params.toString()}`)
    })
  }

  return (
    <div className="relative w-full max-w-lg">
      <Search
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-opacity',
          isPending && 'opacity-50',
        )}
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={currentQuery}
        onChange={handleChange}
        placeholder="Buscar por título, artista o género…"
        aria-label="Buscar canciones"
        className="pl-9 pr-8 h-9"
      />
      {currentQuery && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
      {resultCount !== undefined && currentQuery && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'} para &quot;{currentQuery}&quot;
        </p>
      )}
    </div>
  )
}
