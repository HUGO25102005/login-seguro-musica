'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSong } from '@/app/catalog/actions'

interface CreateSongDialogProps {
  trigger?: React.ReactNode
}

export function CreateSongDialog({ trigger }: CreateSongDialogProps) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createSong(formData)
      if ('error' in result) {
        setFormError(result.error)
        toast.error(result.error)
      } else {
        setOpen(false)
        toast.success('Canción agregada')
        formRef.current?.reset()
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (isPending && !newOpen) return
        setOpen(newOpen)
      }}
      disablePointerDismissal={isPending}
    >
      <DialogTrigger
        render={
          trigger ? (
            <span />
          ) : (
            <Button size="sm">
              <PlusCircle />
              Crear canción
            </Button>
          )
        }
        onClick={() => setOpen(true)}
      >
        {trigger ?? null}
      </DialogTrigger>

      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Agregar canción</DialogTitle>
          <DialogDescription>
            Completa los datos para añadirla a tu biblioteca.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3" noValidate>
          {formError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="song-title">Título <span aria-hidden="true">*</span></Label>
            <Input
              id="song-title"
              name="title"
              placeholder="Nombre de la canción"
              required
              autoFocus
              disabled={isPending}
              aria-invalid={formError?.includes('título') ? true : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="song-artist">Artista <span aria-hidden="true">*</span></Label>
            <Input
              id="song-artist"
              name="artist"
              placeholder="Nombre del artista o banda"
              required
              disabled={isPending}
              aria-invalid={formError?.includes('artista') ? true : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="song-album">Álbum <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="song-album"
              name="album"
              placeholder="Nombre del álbum"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="song-year">Año <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="song-year"
                name="year"
                type="number"
                placeholder="2024"
                min={1900}
                max={2100}
                disabled={isPending}
                aria-invalid={formError?.includes('año') ? true : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-genre">Género <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="song-genre"
                name="genre"
                placeholder="Rock, Pop, Jazz…"
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose
              render={<Button variant="outline" disabled={isPending} />}
              onClick={() => { if (!isPending) setOpen(false) }}
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isPending ? 'Guardando…' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
