'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DollarSign,
    Scissors,
    Package,
    Calendar,
    Download,
    Loader2,
    Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailyReport {
    date: string;
    summary: {
        totalServices: number;
        totalProducts: number;
        totalGeneral: number;
    };
    services: Array<{
        id: string;
        time: string;
        client: string;
        barber: string;
        items: string;
        amount: number;
        paymentMethod: string;
        type: string;
    }>;
    products: Array<{
        id: string;
        time: string;
        client: string;
        barber: string;
        product: string;
        quantity: number;
        unitPrice: number;
        total: number;
        paymentMethod: string;
        context: string;
    }>;
}

export default function FechamentoDiarioPage() {
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/reports/daily-closing?date=${selectedDate}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                toast.error('Erro ao carregar relatório');
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar relatório');
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        if (!report) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(184, 134, 11); // Gold
        doc.text('Fechamento Diário de Caixa', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100);
        const dateFormatted = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        doc.text(`Data: ${dateFormatted}`, pageWidth / 2, 30, { align: 'center' });

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Resumo Financeiro', 14, 45);

        autoTable(doc, {
            startY: 50,
            head: [['Categoria', 'Valor Total']],
            body: [
                ['Serviços Realizados', `R$ ${report.summary.totalServices.toFixed(2)}`],
                ['Venda de Produtos', `R$ ${report.summary.totalProducts.toFixed(2)}`],
                ['TOTAL GERAL', `R$ ${report.summary.totalGeneral.toFixed(2)}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [184, 134, 11] },
            columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
        });

        // Services
        doc.setFontSize(14);
        doc.text('Detalhamento de Serviços', 14, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Hora', 'Cliente', 'Barbeiro', 'Serviço', 'Pagto', 'Valor']],
            body: report.services.map(s => [
                format(parseISO(s.time), 'HH:mm'),
                s.client,
                s.barber,
                s.items,
                s.paymentMethod,
                `R$ ${s.amount.toFixed(2)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [60, 60, 60] },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } }
        });

        // Products
        if (report.products.length > 0) {
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Detalhamento de Produtos', 14, 20);

            autoTable(doc, {
                startY: 25,
                head: [['Hora', 'Produto', 'Qtd', 'Barbeiro', 'Contexto', 'Total']],
                body: report.products.map(p => [
                    format(parseISO(p.time), 'HH:mm'),
                    p.product,
                    p.quantity,
                    p.barber,
                    p.context,
                    `R$ ${p.total.toFixed(2)}`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [60, 60, 60] },
                columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } }
            });
        }

        doc.save(`Fechamento_Diario_${selectedDate}.pdf`);
    };

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 text-gold animate-spin" />
                <p className="text-muted-foreground animate-pulse text-lg">Carregando fechamento do dia...</p>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Fechamento do Dia</h1>
                    </div>
                    <p className="text-muted-foreground pl-11">
                        Conferência de caixa, serviços e produtos
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-[180px] bg-background border-gold/20 focus:ring-gold/30"
                        />
                    </div>
                    <Button
                        onClick={exportPDF}
                        disabled={loading}
                        className="bg-gold hover:bg-gold/90 text-white h-10 px-6 gap-2 rounded-xl shadow-lg shadow-gold/20"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="font-bold">Imprimir PDF</span>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-3">
                <KPICard
                    title="Total Serviços"
                    value={report.summary.totalServices}
                    icon={<Scissors className="w-5 h-5" />}
                    color="text-blue-500"
                />
                <KPICard
                    title="Total Produtos"
                    value={report.summary.totalProducts}
                    icon={<Package className="w-5 h-5" />}
                    color="text-purple-500"
                />
                <KPICard
                    title="Total Geral"
                    value={report.summary.totalGeneral}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="text-green-500"
                />
            </div>

            <Tabs defaultValue="services" className="space-y-6">
                <TabsList className="bg-card border border-border p-1 rounded-xl h-12 inline-flex">
                    <TabsTrigger value="services" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">
                        Serviços ({report.services.length})
                    </TabsTrigger>
                    <TabsTrigger value="products" className="px-6 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">
                        Produtos ({report.products.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                    <Card className="border-none bg-card shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4">Hora</th>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Barbeiro</th>
                                            <th className="px-6 py-4">Serviço(s)</th>
                                            <th className="px-6 py-4">Pagamento</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {report.services.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                                    Nenhum serviço registrado neste dia.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.services.map((s) => (
                                                <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {format(parseISO(s.time), 'HH:mm')}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{s.client}</td>
                                                    <td className="px-6 py-4 text-sm">{s.barber}</td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate" title={s.items}>
                                                        {s.items}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        <span className="bg-secondary px-2 py-1 rounded inline-block">
                                                            {s.paymentMethod}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-500">
                                                        R$ {s.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
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
                                            <th className="px-6 py-4">Hora</th>
                                            <th className="px-6 py-4">Produto</th>
                                            <th className="px-6 py-4 text-center">Qtd</th>
                                            <th className="px-6 py-4">Barbeiro</th>
                                            <th className="px-6 py-4">Origem</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {report.products.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                                    Nenhum produto vendido neste dia.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.products.map((p) => (
                                                <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {format(parseISO(p.time), 'HH:mm')}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{p.product}</td>
                                                    <td className="px-6 py-4 text-center">{p.quantity}</td>
                                                    <td className="px-6 py-4 text-sm">{p.barber}</td>
                                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                                        {p.context}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-purple-500">
                                                        R$ {p.total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
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

function KPICard({ title, value, icon, color }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
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
                </div>
            </CardContent>
        </Card>
    );
}
