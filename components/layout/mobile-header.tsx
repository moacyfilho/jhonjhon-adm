"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Scissors, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Wallet,
  BarChart3,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Globe,
  Settings,
  Package,
  CalendarDays,
  Clock,
  Sparkles,
  Scale,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Clientes", icon: Users, href: "/clientes" },
  { title: "Barbeiros", icon: Scissors, href: "/barbeiros" },
  { title: "Serviços", icon: Briefcase, href: "/servicos" },
  { title: "Produtos", icon: Package, href: "/produtos" },
  { title: "Atendimentos", icon: Calendar, href: "/atendimentos" },
  { title: "Agenda", icon: CalendarDays, href: "/agenda" },
  { title: "Assinaturas", icon: CreditCard, href: "/assinaturas" },
  { title: "Assinaturas Exclusivas", icon: Sparkles, href: "/assinaturas-exclusivas" },
  { title: "Config. Horários", icon: Settings, href: "/configuracoes-agendamento" },
  { title: "Comissões", icon: DollarSign, href: "/comissoes" },
  { title: "Horas & Comissões", icon: Clock, href: "/horas-comissoes" },
  { title: "Caixa", icon: Wallet, href: "/caixa" },
  { title: "Contas a Pagar", icon: TrendingDown, href: "/contas-pagar" },
  { title: "Contas a Receber", icon: TrendingUp, href: "/contas-receber" },
  { title: "Relatórios", icon: BarChart3, href: "/relatorios" },
  { title: "Relatório Serviços", icon: BarChart3, href: "/relatorios/servicos" },
  { title: "Fechamento Diário", icon: Calendar, href: "/relatorios/fechamento-dia" },
  { title: "Fechamento Mensal", icon: Scale, href: "/relatorios/fechamento" },
];

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role;

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo-mobile.png"
              alt="Logo Jhon Jhon Barbearia - Sistema Administrativo Mobile"
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="absolute right-0 top-[57px] bottom-0 w-64 bg-card border-l border-border p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info */}
            <div className="mb-6 p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium text-foreground">
                {session?.user?.name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {session?.user?.email || ""}
              </p>
              {userRole && (
                <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                  {userRole === "ADMIN" ? "Administrador" : "Secretária"}
                </span>
              )}
            </div>

            {/* Menu */}
            <nav className="space-y-1 mb-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
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
            </nav>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
