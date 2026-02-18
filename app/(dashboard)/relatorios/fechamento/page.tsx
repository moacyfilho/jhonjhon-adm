'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    DollarSign,
    Scissors,
    Package,
    UserCheck,
    Download,
    Loader2,
    TrendingUp,
    TrendingDown,
    Scale,
    Calendar,
    Award,
    Star,
    ArrowUpRight,
    ArrowDownRight,
    Target
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyReport {
    summary: {
        servicesTotal: number;
        productsTotal: number;
        commissionsTotal: number;
        netTotal: number;
    };
    details: {
        services: any[];
        products: any[];
        commissions: any[];
    };
    period: {
        start: string;
        end: string;
    };
}

export default function FechamentoMensalPage() {
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [prevReport, setPrevReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

    // Generates a list of last 12 months for selector
    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = subMonths(now, i);
            options.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM yyyy', { locale: ptBR })
            });
        }
        return options;
    }, []);

    useEffect(() => {
        fetchData();
    }, [month]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [currentRes, prevRes] = await Promise.all([
                fetch(`/api/reports/monthly-closing?month=${month}`),
                fetch(`/api/reports/monthly-closing?month=${format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM')}`)
            ]);

            if (currentRes.ok) {
                const currentData = await currentRes.json();
                setReport(currentData);
            }
            if (prevRes.ok) {
                const prevData = await prevRes.json();
                setPrevReport(prevData);
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar relatório');
        } finally {
            setLoading(false);
        }
    };

    // Derived statistics
    const stats = useMemo(() => {
        if (!report) return null;

        const totalTransactions = report.details.services.length;
        const ticketMedio = totalTransactions > 0 ? report.summary.servicesTotal / totalTransactions : 0;

        // Rankings
        const barberRank: Record<string, number> = {};
        report.details.services.forEach((s: any) => {
            const name = s.appointment.barber.name;
            barberRank[name] = (barberRank[name] || 0) + s.price;
        });

        const serviceRank: Record<string, number> = {};
        report.details.services.forEach((s: any) => {
            const name = s.service.name;
            serviceRank[name] = (serviceRank[name] || 0) + 1;
        });

        const sortedBarbers = Object.entries(barberRank)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        const sortedServices = Object.entries(serviceRank)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        // Growth comparison
        const growth = prevReport ? ((report.summary.netTotal - prevReport.summary.netTotal) / (prevReport.summary.netTotal || 1)) * 100 : 0;

        return {
            ticketMedio,
            totalTransactions,
            sortedBarbers,
            sortedServices,
            growth
        };
    }, [report, prevReport]);

    const exportPDF = () => {
        if (!report) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(22);
        doc.setTextColor(184, 134, 11); // Dark Gold
        doc.text('Relatório de Fechamento Barbearia Jhon Jhon', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(100);
        const monthLabel = monthOptions.find(o => o.value === month)?.label || month;
        doc.text(`Competência: ${monthLabel}`, pageWidth / 2, 30, { align: 'center' });

        // KPIs
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Indicadores de Performance', 14, 45);

        autoTable(doc, {
            startY: 50,
            head: [['Métrica', 'Valor']],
            body: [
                ['Faturamento de Serviços', `R$ ${report.summary.servicesTotal.toFixed(2)}`],
                ['Venda de Produtos', `R$ ${report.summary.productsTotal.toFixed(2)}`],
                ['Total de Comissões Pagas', `R$ ${report.summary.commissionsTotal.toFixed(2)}`],
                ['Saldo Líquido Operacional', `R$ ${report.summary.netTotal.toFixed(2)}`],
                ['Ticket Médio (Serviços)', `R$ ${stats?.ticketMedio.toFixed(2)}`],
                ['Número de Atendimentos', `${stats?.totalTransactions}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [184, 134, 11] },
        });

        // Barbeiros
        doc.text('Top 3 Barbeiros (Faturamento)', 14, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Barbeiro', 'Total Produzido']],
            body: stats?.sortedBarbers.map(([name, total]) => [name, `R$ ${total.toFixed(2)}`]) || [],
        });

        // New pages for details
        // Services Details
        doc.addPage();
        doc.text('Detalhamento de Entradas (Serviços)', 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Data', 'Cliente', 'Serviço', 'Barbeiro', 'Valor']],
            body: report.details.services.map(s => [
                format(parseISO(s.appointment.date), 'dd/MM/yyyy'),
                s.appointment.client.name,
                s.service.name,
                s.appointment.barber.name,
                `R$ ${s.price.toFixed(2)}`
            ]),
        });

        // Products Details (Added)
        doc.addPage();
        doc.text('Detalhamento de Vendas de Produtos', 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Data', 'Produto', 'Cliente/Obs', 'Qtd', 'Total']],
            body: report.details.products.map((p: any) => [
                format(parseISO(p.date), 'dd/MM/yyyy'),
                p.productName,
                p.clientName,
                p.quantity,
                `R$ ${p.totalPrice.toFixed(2)}`
            ]),
        });

        doc.save(`Fechamento_JhonJhon_${month}.pdf`);
    };

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 text-gold animate-spin" />
                <p className="text-muted-foreground animate-pulse text-lg">Consolidando dados financeiros...</p>
            </div>
        );
    }

    if (!report) return null;

    const goal = 15000; // Example goal
    const goalProgress = Math.min((report.summary.netTotal / goal) * 100, 100);

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Scale className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Fechamento Mensal</h1>
                    </div>
                    <p className="text-muted-foreground pl-11">
                        Análise consolidada de performance e rentabilidade
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mês de Referência</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[200px] bg-background border-gold/20 focus:ring-gold/30">
                                <SelectValue placeholder="Selecione o mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label.charAt(0).toUpperCase() + opt.label.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={exportPDF}
                        disabled={loading}
                        className="bg-gold hover:bg-gold/90 text-white h-11 px-6 gap-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-gold/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        <span className="font-bold">Gerar Relatório PDF</span>
                    </Button>
                </div>
            </div>

            {/* Overall KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Total em Serviços"
                    value={report.summary.servicesTotal}
                    icon={<Scissors className="w-5 h-5" />}
                    color="text-gold"
                    trend={report.summary.servicesTotal > (prevReport?.summary.servicesTotal || 0) ? 'up' : 'down'}
                />
                <KPICard
                    title="Venda de Produtos"
                    value={report.summary.productsTotal}
                    icon={<Package className="w-5 h-5" />}
                    color="text-green-500"
                    trend={report.summary.productsTotal > (prevReport?.summary.productsTotal || 0) ? 'up' : 'down'}
                />
                <KPICard
                    title="Comissões Pagas"
                    value={report.summary.commissionsTotal}
                    icon={<TrendingDown className="w-5 h-5" />}
                    color="text-red-500"
                    invertedTrend
                />
                <KPICard
                    title="Resultado Líquido"
                    value={report.summary.netTotal}
                    icon={<DollarSign className="w-5 h-5" />}
                    color={report.summary.netTotal >= 0 ? "text-emerald-500" : "text-red-500"}
                    trend={stats?.growth && stats.growth > 0 ? 'up' : 'down'}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-card border border-border p-1 rounded-xl h-12 inline-flex">
                    <TabsTrigger value="overview" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">Visão Geral</TabsTrigger>
                    <TabsTrigger value="services" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">Serviços</TabsTrigger>
                    <TabsTrigger value="products" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">Produtos</TabsTrigger>
                    <TabsTrigger value="commissions" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">Comissões</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Meta e Ticket Médio */}
                        <Card className="lg:col-span-1 border-none bg-card shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-border/50 bg-secondary/30">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Target className="w-5 h-5 text-gold" />
                                    Metas do Mês
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Faturamento Líquido</span>
                                        <span className="font-bold">{goalProgress.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={goalProgress} className="h-3 bg-secondary" />
                                    <p className="text-xs text-muted-foreground">Meta sugerida: R$ {goal.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
                                    <p className="text-sm text-muted-foreground font-medium">Ticket Médio por Cliente</p>
                                    <p className="text-3xl font-bold text-gold">R$ {stats?.ticketMedio.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">{stats?.totalTransactions} atendimentos realizados</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Barbeiros */}
                        <Card className="border-none bg-card shadow-sm">
                            <CardHeader className="border-b border-border/50 bg-secondary/30">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Award className="w-5 h-5 text-gold" />
                                    Top Barbeiros
                                </CardTitle>
                                <CardDescription>Os que mais geraram faturamento</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {stats?.sortedBarbers.map(([name, total], i) => (
                                        <div key={name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg group hover:bg-secondary/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-gold text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    {i + 1}
                                                </div>
                                                <span className="font-semibold">{name}</span>
                                            </div>
                                            <span className="text-gold font-bold">R$ {total.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {stats?.sortedBarbers.length === 0 && <p className="text-center text-muted-foreground py-4">Sem dados no período</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Serviços */}
                        <Card className="border-none bg-card shadow-sm">
                            <CardHeader className="border-b border-border/50 bg-secondary/30">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Star className="w-5 h-5 text-gold" />
                                    Serviços Populares
                                </CardTitle>
                                <CardDescription>Os mais solicitados no mês</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {stats?.sortedServices.map(([name, count], i) => (
                                        <div key={name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                            <span className="font-medium">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-gold/10 text-gold text-xs font-bold rounded-full">{count}x</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats?.sortedServices.length === 0 && <p className="text-center text-muted-foreground py-4">Sem dados no período</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="services">
                    <Card className="border-none bg-card shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Serviço</th>
                                            <th className="px-6 py-4">Barbeiro</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {report.details.services.map((s: any) => (
                                            <tr key={s.id} className="hover:bg-secondary/20 transition-colors group">
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{format(parseISO(s.appointment.date), 'dd/MM HH:mm')}</td>
                                                <td className="px-6 py-4 font-semibold text-foreground group-hover:text-gold transition-colors">{s.appointment.client.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-primary/5 rounded text-xs">{s.service.name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{s.appointment.barber.name}</td>
                                                <td className="px-6 py-4 text-right font-bold text-gold">R$ {s.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="products">
                    <Card className="border-none bg-card shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Produto</th>
                                            <th className="px-6 py-4">Cliente/Obs</th>
                                            <th className="px-6 py-4 text-right">Qtd</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {report.details.products.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{format(parseISO(p.date), 'dd/MM HH:mm')}</td>
                                                <td className="px-6 py-4 font-semibold">{p.productName}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.clientName}</td>
                                                <td className="px-6 py-4 text-right font-medium">{p.quantity}</td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-500">R$ {p.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="commissions">
                    <Card className="border-none bg-card shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Barbeiro</th>
                                            <th className="px-6 py-4">Cliente Ref.</th>
                                            <th className="px-6 py-4 text-right">Comissão</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {report.details.commissions.map((c: any) => (
                                            <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{format(parseISO(c.createdAt), 'dd/MM/yyyy')}</td>
                                                <td className="px-6 py-4 font-semibold">{c.barber.name}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{c.appointment?.client.name || '-'}</td>
                                                <td className="px-6 py-4 text-right font-bold text-red-500">- R$ {c.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function KPICard({ title, value, icon, color, trend, invertedTrend = false }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down';
    invertedTrend?: boolean;
}) {
    return (
        <Card className="bg-card border-none shadow-sm group hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className={`p-2 bg-secondary/80 rounded-lg group-hover:bg-secondary transition-colors ${color}`}>
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className={`text-2xl font-bold ${color}`}>
                        R$ {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {trend && (
                        <div className={`flex items-center text-xs mt-1 ${(trend === 'up' && !invertedTrend) || (trend === 'down' && invertedTrend)
                            ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            <span>vs mês ant.</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
