import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createClient } from '@/utils/supabase/server'

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
    // We need to re-verify the user for the actual redirection logic
    // We'll use the headers and cookies from the request
    const supabase = createClient()
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
