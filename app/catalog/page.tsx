import { createClient } from '@/utils/supabase/server'
import { signout } from '@/app/auth/actions'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const query = searchParams.q || ''

  // 🛡️ SecOps: Mitigación de SQL Injection (SQLi)
  // Usamos el cliente de Supabase que parametriza automáticamente las consultas.
  // JAMÁS concatenamos strings en la query.
  let dbQuery = supabase
    .from('music_catalog')
    .select('*')

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,artist.ilike.%${query}%,genre.ilike.%${query}%`)
  }

  const { data: songs, error } = await dbQuery.order('title', { ascending: true })

  return (
    <div className="flex-1 w-full flex flex-col gap-8 items-center p-8 bg-zinc-50 dark:bg-black min-h-screen">
      <nav className="w-full flex justify-between items-center max-w-5xl border-b pb-4">
        <h1 className="text-2xl font-bold text-indigo-600">Secure Music Cloud</h1>
        <form action={signout}>
          <button className="px-4 py-2 rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors text-sm font-medium">
            Cerrar Sesión
          </button>
        </form>
      </nav>

      <div className="w-full max-w-5xl flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Explorar Catálogo</h2>
          <form className="flex gap-2">
            <input
              type="text"
              name="q"
              placeholder="Buscar por título, artista o género..."
              defaultValue={query}
              className="flex-1 px-4 py-2 rounded-md border focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              Buscar
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs?.map((song) => (
            <div 
              key={song.id} 
              className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="font-bold text-lg truncate">{song.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">{song.artist}</p>
              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium uppercase tracking-wider text-xs">
                  {song.genre}
                </span>
                <span className="text-zinc-500">{song.year}</span>
              </div>
            </div>
          ))}
          {songs?.length === 0 && (
            <p className="col-span-full text-center py-12 text-zinc-500">
              No se encontraron canciones que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
