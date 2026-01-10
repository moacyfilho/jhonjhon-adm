import { Scissors, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
}

interface ServiceCardSelectionProps {
    services: Service[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function ServiceCardSelection({
    services,
    selectedId,
    onSelect,
}: ServiceCardSelectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => {
                const isSelected = selectedId === service.id;
                return (
                    <div
                        key={service.id}
                        onClick={() => onSelect(service.id)}
                        className={cn(
                            "glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-300 relative group overflow-hidden",
                            isSelected
                                ? "border-gold-500 bg-gold-500/10 shadow-gold"
                                : "hover:border-white/20 hover:bg-white/5 border-white/5"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-gold-500 rounded-full p-1 border border-black animate-in zoom-in duration-300">
                                <Check className="w-3 h-3 text-black" />
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                                isSelected
                                    ? "bg-gold-500/20 border-gold-500/30"
                                    : "bg-white/5 border-white/10 group-hover:border-white/20"
                            )}>
                                <Scissors className={cn("w-6 h-6", isSelected ? "text-gold-500" : "text-gray-400")} />
                            </div>

                            <div className="flex-1">
                                <h4 className={cn("text-lg font-bold font-serif transition-colors", isSelected ? "text-gold-500" : "text-white")}>
                                    {service.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-gold-500 font-bold text-sm">R$ {service.price.toFixed(2)}</span>
                                    <span className="text-gray-500 text-xs">•</span>
                                    <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">{service.duration} min</span>
                                </div>
                                {service.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 italic">
                                        {service.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
