import type { ParseResult } from './auth-schemas'

export interface CreateSongData {
  title: string
  artist: string
  album: string | null
  genre: string | null
  year: number | null
}

export function parseCreateSong(raw: Record<string, unknown>): ParseResult<CreateSongData> {
  if (typeof raw.title !== 'string' || !raw.title.trim())
    return { success: false, error: 'Ingresa el título de la canción.' }
  const title = raw.title.trim().slice(0, 200)

  if (typeof raw.artist !== 'string' || !raw.artist.trim())
    return { success: false, error: 'Ingresa el artista.' }
  const artist = raw.artist.trim().slice(0, 200)

  const album =
    typeof raw.album === 'string' && raw.album.trim()
      ? raw.album.trim().slice(0, 200)
      : null

  const genre =
    typeof raw.genre === 'string' && raw.genre.trim()
      ? raw.genre.trim().slice(0, 50)
      : null

  let year: number | null = null
  if (typeof raw.year === 'string' && raw.year.trim()) {
    const parsed = parseInt(raw.year, 10)
    if (isNaN(parsed) || parsed < 1900 || parsed > 2100)
      return { success: false, error: 'El año debe estar entre 1900 y 2100.' }
    year = parsed
  }

  return { success: true, data: { title, artist, album, genre, year } }
}
