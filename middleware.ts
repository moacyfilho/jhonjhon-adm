import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

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
    "/desempenho-servicos/:path*",
    "/configuracoes/:path*",
  ],
};
