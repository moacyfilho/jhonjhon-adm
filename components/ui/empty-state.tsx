import { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-12 text-center bg-white/5 border border-white/5 rounded-[2rem] animate-in fade-in zoom-in duration-500",
            className
        )}>
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-gold-500/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 bg-gold-500/10 rounded-3xl flex items-center justify-center border border-gold-500/20 shadow-inner">
                    <Icon className="w-12 h-12 text-gold-500" />
                </div>
            </div>

            <h3 className="text-2xl font-serif font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-8 font-medium italic">
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold"
                >
                    <Plus className="w-5 h-5" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
