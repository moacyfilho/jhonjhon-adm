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
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    group: "Visão Geral",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
    ],
  },
  {
    group: "Gestão",
    items: [
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
    ],
  },
  {
    group: "Operacional",
    items: [
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
        title: "Config. Horários",
        icon: Settings,
        href: "/configuracoes-agendamento",
      },
    ],
  },
  {
    group: "Financeiro",
    items: [
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
    ],
  },
  {
    group: "Análise",
    items: [
      {
        title: "Relatórios",
        icon: BarChart3,
        href: "/relatorios",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const supabase = createClient();
  const userRole = user?.user_metadata?.role;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-card border-r border-border h-screen sticky top-0 shadow-2xl z-50">
      {/* Logo Section */}
      <div className="p-8 border-b border-border/50 bg-gradient-to-b from-background/50 to-transparent">
        <div className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Logo Jhon Jhon Barbearia"
            className="w-40 h-auto hover:scale-105 transition-transform duration-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-8 py-8">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-3">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                      isActive
                        ? "bg-gold-500/10 text-gold-500 shadow-inner overflow-hidden"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gold-500 rounded-r-full shadow-gold animate-in fade-in slide-in-from-left-2 duration-500" />
                    )}
                    <div className={cn(
                      "p-1.5 rounded-lg transition-all duration-300",
                      isActive ? "bg-gold-500/10" : "group-hover:bg-white/5"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isActive ? "animate-pulse" : "group-hover:scale-110 group-hover:text-white transition-all"
                      )} />
                    </div>
                    <span className={cn(
                      "font-semibold tracking-tight transition-all duration-300",
                      isActive ? "translate-x-1" : "group-hover:translate-x-1"
                    )}>
                      {item.title}
                    </span>
                    {!isActive && (
                      <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-500/30" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Session Info */}
      <div className="p-6 border-t border-border/50 bg-background/30 backdrop-blur-md">
        <div className="flex items-center gap-4 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold-500 font-bold text-sm">
                {(user?.email || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário"}
            </p>
            {userRole && (
              <span className="text-[10px] font-black uppercase tracking-widest text-gold-500/60">
                {userRole === "ADMIN" ? "Administrador" : "Secretária"}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 border border-white/5 hover:border-red-500/20 transition-all group font-bold text-sm"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
