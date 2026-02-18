"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Scissors,
  Briefcase,
  Calendar,
  DollarSign,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Globe,
  Package,
  CalendarDays,
  Clock,
  Sparkles,
  Scale,
  Calculator,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/clientes",
  },
  {
    title: "Barbeiros",
    icon: Scissors,
    href: "/barbeiros",
  },
  {
    title: "Serviços",
    icon: Briefcase,
    href: "/servicos",
  },
  {
    title: "Produtos",
    icon: Package,
    href: "/produtos",
  },
  {
    title: "Atendimentos",
    icon: Calendar,
    href: "/atendimentos",
  },
  {
    title: "Agenda",
    icon: CalendarDays,
    href: "/agenda",
  },
  {
    title: "Assinaturas",
    icon: CreditCard,
    href: "/assinaturas",
  },
  {
    title: "Assinaturas Exclusivas",
    icon: Sparkles,
    href: "/assinaturas-exclusivas",
  },
  {
    title: "Planos",
    icon: Package,
    href: "/planos",
  },
  {
    title: "Config. Horários",
    icon: Settings,
    href: "/configuracoes-agendamento",
  },
  {
    title: "Comissões",
    icon: DollarSign,
    href: "/comissoes",
  },
  {
    title: "Horas & Comissões",
    icon: Clock,
    href: "/horas-comissoes",
  },
  {
    title: "Caixa",
    icon: Wallet,
    href: "/caixa",
  },
  {
    title: "Contas a Pagar",
    icon: TrendingDown,
    href: "/contas-pagar",
  },
  {
    title: "Contas a Receber",
    icon: TrendingUp,
    href: "/contas-receber",
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/relatorios",
  },
  {
    title: "Fechamento Diário",
    icon: Calculator,
    href: "/relatorios/fechamento-dia",
  },
  {
    title: "Fechamento Mensal",
    icon: Scale,
    href: "/relatorios/fechamento",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession() || {};
  const userRole = (session?.user as any)?.role;

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (userRole === "BARBER") {
      return ["/comissoes", "/horas-comissoes"].includes(item.href);
    }
    return true;
  });

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo Jhon Jhon Barbearia - Sistema Administrativo Desktop"
            className="w-32 h-auto"
          />
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">
            {session?.user?.name || "Usuário"}
          </p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.email || ""}
          </p>
          {userRole && (
            <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
              {userRole === "ADMIN" ? "Administrador" : userRole === "BARBER" ? "Barbeiro" : "Secretária"}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
