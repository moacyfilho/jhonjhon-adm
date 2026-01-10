import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Update the session - this refreshes the token if needed
  const supabaseResponse = await updateSession(request)

  // Create a supabase client for checking the session
  const cookieStore = {
    get: (name: string) => request.cookies.get(name)?.value,
  }

  // We can't use the server client here directly easily because of the response handling, 
  // but updateSession already handles the refresh.
  // Let's check if the user is authenticated for protected routes.

  const protectedPaths = [
    "/dashboard",
    "/clientes",
    "/barbeiros",
    "/servicos",
    "/atendimentos",
    "/comissoes",
    "/caixa",
    "/contas-pagar",
    "/contas-receber",
    "/relatorios",
    "/configuracoes",
  ]

  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    // Creating a client specifically for middleware context using request cookies
    const supabase = createServerClient(
      'https://tmhokhxuavrglpnuorrg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9raHh1YXZyZ2xwbnVvcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDI1MTYsImV4cCI6MjA4MzQ3ODUxNn0.8ku7FqoszTVqdF6YE8GXsNocT4Xf5ofThr1hlu8I_Jo',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/barbeiros/:path*",
    "/servicos/:path*",
    "/atendimentos/:path*",
    "/comissoes/:path*",
    "/caixa/:path*",
    "/contas-pagar/:path*",
    "/contas-receber/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
  ],
};
