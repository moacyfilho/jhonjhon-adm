
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceStats {
    count: number;
    revenue: number; // This might be an object if prisma returns aggregated sum object, but we mapped it to number
}

interface ServiceReportItem {
    id: string;
    name: string;
    daily: ServiceStats;
    weekly: ServiceStats;
    monthly: ServiceStats;
}

export default function RelatorioServicosPage() {
    const [reportData, setReportData] = useState<ServiceReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/reports/services-summary"); // Assumes this endpoint exists
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            } else {
                toast.error("Erro ao carregar relatório de serviços");
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error("Erro de conexão ao carregar relatório");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = reportData.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Desempenho de Serviços</h1>
                    </div>
                    <p className="text-muted-foreground pl-11">
                        Acompanhe a quantidade e receita de cada serviço por período
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar serviço..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background border-gold/20 focus:ring-gold/30"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <Card className="border-none bg-card shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4 text-center bg-blue-500/5 border-l border-border">Hoje</th>
                                    <th className="px-6 py-4 text-center bg-green-500/5 border-l border-border">Esta Semana</th>
                                    <th className="px-6 py-4 text-center bg-purple-500/5 border-l border-border">Este Mês</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Carregando dados...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            Nenhum serviço encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item) => (
                                        <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground border-r border-border/50">
                                                {item.name}
                                            </td>

                                            {/* Daily */}
                                            <td className="px-6 py-4 text-center bg-blue-500/5 border-r border-border/50">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-bold text-blue-500">{item.daily.count}</span>
                                                    {item.daily.revenue > 0 && (
                                                        <span className="text-xs text-muted-foreground mt-1">
                                                            R$ {item.daily.revenue.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Weekly */}
                                            <td className="px-6 py-4 text-center bg-green-500/5 border-r border-border/50">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-bold text-green-500">{item.weekly.count}</span>
                                                    {item.weekly.revenue > 0 && (
                                                        <span className="text-xs text-muted-foreground mt-1">
                                                            R$ {item.weekly.revenue.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Monthly */}
                                            <td className="px-6 py-4 text-center bg-purple-500/5">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-bold text-purple-500">{item.monthly.count}</span>
                                                    {item.monthly.revenue > 0 && (
                                                        <span className="text-xs text-muted-foreground mt-1">
                                                            R$ {item.monthly.revenue.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
