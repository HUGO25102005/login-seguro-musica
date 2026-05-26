'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireAuth, isAdmin } from '@/app/data/auth'
import { auditLog, getRequestContext } from '@/app/lib/audit-logger'
import { getRateLimiter } from '@/app/lib/rate-limiter'
import { parseCreateSong } from '@/app/lib/catalog-schemas'

const limiter = getRateLimiter()

export async function createSong(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const user = await requireAuth()
  const { ip, userAgent } = await getRequestContext()

  if (!(await isAdmin(user.id))) {
    auditLog({ event: 'UNAUTHORIZED_ACCESS', userId: user.id, ip, userAgent, metadata: { action: 'createSong' } })
    return { error: 'No tienes permisos.' }
  }

  const limitResult = await limiter.check(`create-song|${user.id}`)
  if (!limitResult.success) {
    return { error: `Demasiadas solicitudes. Reintenta en ${limitResult.retryAfter}s.` }
  }

  const parsed = parseCreateSong(Object.fromEntries(formData))
  if (!parsed.success || !parsed.data) {
    return { error: parsed.error ?? 'Datos inválidos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('music_catalog').insert(parsed.data)

  if (error) {
    console.error('[createSong]', error.message)
    return { error: 'No se pudo guardar la canción. Intenta de nuevo.' }
  }

  auditLog({ event: 'SONG_CREATED', userId: user.id, ip, userAgent, metadata: { title: parsed.data.title } })
  revalidatePath('/catalog')
  return { ok: true }
}
