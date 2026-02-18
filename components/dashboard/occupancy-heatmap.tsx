"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface HeatmapData {
    data: { day: number; hour: number; count: number; intensity: number }[];
    maxCount: number;
}

interface OccupancyHeatmapProps {
    period: string;
    barberId: string;
}

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 to 22

export function OccupancyHeatmap({ period, barberId }: OccupancyHeatmapProps) {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const queryParams = new URLSearchParams({
                    period,
                    ...(barberId !== 'all' ? { barberId } : {})
                });
                const res = await fetch(`/api/stats/heatmap?${queryParams}`);
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error("Error fetching heatmap:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [period, barberId]);

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // Helper to find data for a cell
    const getCellData = (day: number, hour: number) => {
        return data?.data.find((d) => d.day === day && d.hour === hour);
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6 w-full overflow-x-auto">
            <h3 className="text-lg font-bold text-foreground mb-6">
                Mapa de Calor de Ocupação (Agendamentos)
            </h3>

            <div className="min-w-[600px]">
                {/* Header Row (Days) */}
                <div className="flex">
                    <div className="w-16 flex-shrink-0"></div> {/* Spacer for Hours column */}
                    {days.map((day, index) => (
                        <div key={day} className="flex-1 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Rows (Hours) */}
                {hours.map((hour) => (
                    <div key={hour} className="flex h-10 items-center">
                        {/* Hour Label */}
                        <div className="w-16 flex-shrink-0 text-xs text-muted-foreground font-medium pr-4 text-right">
                            {String(hour).padStart(2, '0')}:00
                        </div>

                        {/* Cells */}
                        {days.map((_, dayIndex) => {
                            const cell = getCellData(dayIndex, hour);
                            const count = cell?.count || 0;
                            const intensity = cell?.intensity || 0;

                            // Generate color: Base is Gold (212, 175, 55)
                            // Opacity based on intensity. Minimal opacity 0.05 for empty cells? No, 0.
                            const bgColor = count > 0
                                ? `rgba(212, 175, 55, ${Math.max(0.2, intensity)})` // Minimum 0.2 visibility for any count
                                : 'rgba(255, 255, 255, 0.03)'; // Very faint for empty

                            return (
                                <div key={`${dayIndex}-${hour}`} className="flex-1 h-full p-0.5 group relative">
                                    <div
                                        className="w-full h-full rounded transition-all duration-300 hover:scale-105 hover:z-10"
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 border border-border">
                                            {count} agendamento{count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <span>Menos</span>
                    <div className="w-4 h-4 rounded bg-[rgba(255,255,255,0.03)] border border-border"></div>
                    <div className="w-4 h-4 rounded bg-[rgba(212,175,55,0.2)]"></div>
                    <div className="w-4 h-4 rounded bg-[rgba(212,175,55,0.6)]"></div>
                    <div className="w-4 h-4 rounded bg-[rgba(212,175,55,1)]"></div>
                    <span>Mais Movimento</span>
                </div>
            </div>
        </div>
    );
}
