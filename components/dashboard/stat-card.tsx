import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 hover:shadow-gold transition-all duration-300 relative overflow-hidden group">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gold-500 opacity-50 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">{title}</p>
          <h3 className="text-3xl font-serif font-bold text-white mb-1 group-hover:text-gold-500 transition-colors uppercase tracking-tight">
            {value}
          </h3>
          {description && (
            <p className="text-sm text-gray-500 font-medium italic">{description}</p>
          )}
        </div>
        <div className="w-14 h-14 bg-gold-500/10 rounded-xl flex items-center justify-center border border-gold-500/10 group-hover:border-gold-500/30 transition-all shadow-inner">
          <Icon className="w-7 h-7 text-gold-500 group-hover:scale-110 transition-transform" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <span
            className={`text-sm font-bold flex items-center gap-1 ${trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
            <span className="text-gray-500 text-xs font-normal ml-1">em relação ao anterior</span>
          </span>
        </div>
      )}
    </div>
  );
}
