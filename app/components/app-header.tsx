'use client'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import { signout } from '@/app/auth/actions'
import { SearchInput } from '@/app/components/search-input'

type AppHeaderProps = {
  userEmail?: string | null
  resultCount?: number
}

export function AppHeader({ userEmail, resultCount }: AppHeaderProps) {
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'U'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Logo />

        <div className="flex-1 mx-4">
          <SearchInput resultCount={resultCount} />
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Menú de usuario"
            >
              <Avatar className="size-8 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {userEmail && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                    {userEmail}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="px-1 py-0.5">
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed"
                >
                  <User className="size-4" />
                  Perfil
                </button>
              </div>
              <DropdownMenuSeparator />
              <div className="px-1 py-0.5">
                <form action={signout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  )
}
