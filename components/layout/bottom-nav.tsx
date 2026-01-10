"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    DollarSign,
    Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
    {
        title: "Início",
        icon: LayoutDashboard,
        href: "/dashboard",
    },
    {
        title: "Agenda",
        icon: CalendarDays,
        href: "/agenda",
    },
    {
        title: "Clientes",
        icon: Users,
        href: "/clientes",
    },
    {
        title: "Financeiro",
        icon: DollarSign,
        href: "/caixa",
    },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gold-gradient opacity-5 pointer-events-none" />

                {mobileItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-3xl transition-all duration-500 relative group",
                                isActive
                                    ? "bg-gold-500/10 text-gold-500 scale-110 shadow-inner"
                                    : "text-gray-500 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute -top-1 w-1 h-1 bg-gold-500 rounded-full shadow-gold animate-bounce" />
                            )}
                            <Icon className={cn(
                                "w-6 h-6 transition-transform duration-500",
                                isActive ? "animate-pulse" : "group-hover:scale-110"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tighter transition-all",
                                isActive ? "opacity-100" : "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100"
                            )}>
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
