import Image from "next/image";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";

interface Barber {
    id: string;
    name: string;
}

interface BarberSelectionProps {
    barbers: Barber[];
    selectedId: string;
    onSelect: (id: string) => void;
    getBarberPhoto: (name: string) => string | null;
}

export function BarberSelection({
    barbers,
    selectedId,
    onSelect,
    getBarberPhoto,
}: BarberSelectionProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => {
                const isSelected = selectedId === barber.id;
                const photo = getBarberPhoto(barber.name);

                return (
                    <div
                        key={barber.id}
                        onClick={() => onSelect(barber.id)}
                        className={cn(
                            "group relative cursor-pointer rounded-2xl transition-all duration-500 overflow-hidden",
                            isSelected ? "ring-2 ring-gold-500 ring-offset-4 ring-offset-black" : ""
                        )}
                    >
                        {/* Background Image Container */}
                        <div className="aspect-[4/5] relative overflow-hidden bg-gray-900">
                            {photo ? (
                                <Image
                                    src={photo}
                                    alt={barber.name}
                                    fill
                                    className={cn(
                                        "object-cover transition-transform duration-700",
                                        isSelected ? "scale-105" : "group-hover:scale-110 grayscale hover:grayscale-0",
                                        !isSelected && "opacity-60"
                                    )}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5 uppercase font-serif text-4xl text-white/10">
                                    {barber.name.charAt(0)}
                                </div>
                            )}

                            {/* Overlays */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity",
                                isSelected ? "opacity-100" : "opacity-80 group-hover:opacity-40"
                            )} />

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={cn(
                                            "text-xl font-serif font-bold transition-colors",
                                            isSelected ? "text-gold-500" : "text-white group-hover:text-gold-500"
                                        )}>
                                            {barber.name}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Star className="w-3 h-3 text-gold-500 fill-gold-500" />
                                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Master Barber</span>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center border-2 border-black shadow-gold animate-in zoom-in duration-300">
                                            <Check className="w-4 h-4 text-black" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Glow */}
                        {isSelected && (
                            <div className="absolute -bottom-10 inset-x-0 h-20 bg-gold-500/20 blur-3xl" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
