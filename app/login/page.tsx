import { login, signup, signInWithGoogle } from '@/app/auth/actions'

export default async function LoginPage(props: {
  searchParams: Promise<{ message: string; error: string }>
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <h1 className="text-2xl font-bold mb-6">Iniciar Sesión</h1>
        
        <label className="text-md" htmlFor="email">
          Correo Electrónico
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        
        <label className="text-md" htmlFor="password">
          Contraseña
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        <button
          formAction={login}
          className="bg-indigo-600 rounded-md px-4 py-2 text-white font-semibold mb-2 hover:bg-indigo-700 transition-colors"
        >
          Entrar
        </button>
        
        <button
          formAction={signup}
          className="border border-indigo-600 rounded-md px-4 py-2 text-indigo-600 font-semibold mb-6 hover:bg-indigo-50 transition-colors"
        >
          Registrarse
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">O continuar con</span>
          </div>
        </div>

        <button
          formAction={signInWithGoogle}
          type="submit"
          className="flex items-center justify-center gap-2 border rounded-md px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
            />
          </svg>
          Google
        </button>

        {searchParams?.message && (
          <p className="mt-4 p-4 bg-green-100 text-green-800 text-center rounded-md">
            {searchParams.message}
          </p>
        )}
        
        {searchParams?.error && (
          <p className="mt-4 p-4 bg-red-100 text-red-800 text-center rounded-md">
            {searchParams.error}
          </p>
        )}
      </form>
    </div>
  )
}
