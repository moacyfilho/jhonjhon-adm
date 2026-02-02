"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Calendar, Scissors, Package, Clock, Download, TrendingUp, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ClientHistoryModalProps {
    clientId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ClientHistoryModal({
    clientId,
    isOpen,
    onClose,
}: ClientHistoryModalProps) {
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchHistory();
        }
    }, [isOpen, clientId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Error fetching client history:", error);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (!history || !history.appointments) return null;

        const totalSpent = history.appointments.reduce((acc: number, app: any) => acc + app.totalAmount, 0);
        const lastVisit = history.appointments[0]?.date;
        const visitCount = history.appointments.length;

        return { totalSpent, lastVisit, visitCount };
    }, [history]);

    const exportToPDF = () => {
        if (!history) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo/Header
        doc.setFontSize(22);
        doc.setTextColor(184, 134, 11);
        doc.text("Relatório de Histórico do Cliente", pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(history.name, 14, 35);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Telefone: ${history.phone}`, 14, 42);
        doc.text(`Email: ${history.email || "Não informado"}`, 14, 47);
        doc.text(`Relatório gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 52);

        // Summary Line
        doc.setDrawColor(184, 134, 11);
        doc.line(14, 55, pageWidth - 14, 55);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Total Gasto: R$ ${stats?.totalSpent.toFixed(2)}`, 14, 65);
        doc.text(`Total de Atendimentos: ${stats?.visitCount}`, 14, 72);

        // Appointments Table
        const tableBody = history.appointments.map((app: any) => [
            format(new Date(app.date), "dd/MM/yyyy HH:mm"),
            app.barber.name,
            app.services.map((s: any) => s.service.name).join(", "),
            app.products.length > 0 ? app.products.map((p: any) => `${p.quantity}x ${p.product.name}`).join(", ") : "-",
            `R$ ${app.totalAmount.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [["Data", "Barbeiro", "Serviços", "Produtos", "Total"]],
            body: tableBody,
            headStyles: { fillColor: [184, 134, 11] },
            theme: "striped",
        });

        doc.save(`Historico_${history.name.replace(/\s+/g, "_")}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent onClose={onClose} className="max-w-3xl overflow-hidden flex flex-col h-[85vh]">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <User className="w-6 h-6 text-gold" />
                                Histórico do Cliente
                            </DialogTitle>
                            <DialogDescription>
                                {history?.name ? `Detalhamento completo de ${history.name}` : "Carregando histórico..."}
                            </DialogDescription>
                        </div>
                        {history && (
                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors text-sm font-bold shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Exportar PDF
                            </button>
                        )}
                    </div>
                </DialogHeader>

                <DialogBody className="flex-1 overflow-y-auto p-6 bg-secondary/5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-10 h-10 text-gold animate-spin" />
                            <p className="text-muted-foreground">Buscando registros...</p>
                        </div>
                    ) : !history || history?.appointments?.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-secondary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">Nenhum atendimento registrado para este cliente.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Gasto</p>
                                    <p className="text-2xl font-extrabold text-emerald-500">R$ {stats?.totalSpent.toFixed(2)}</p>
                                </div>
                                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Frequência</p>
                                    <p className="text-2xl font-extrabold text-gold">{stats?.visitCount} Visitas</p>
                                </div>
                                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Última Vez</p>
                                    <p className="text-xl font-bold">
                                        {stats?.lastVisit ? format(new Date(stats.lastVisit), "dd/MM/yyyy") : "-"}
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground pt-2">Linha do Tempo</h3>

                            <div className="space-y-4">
                                {history?.appointments?.map((appointment: any) => (
                                    <div
                                        key={appointment.id}
                                        className="bg-card border border-border rounded-xl p-5 hover:border-gold/50 transition-all duration-300 shadow-sm group"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                                                    <Calendar className="w-5 h-5 text-gold" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">
                                                        {format(new Date(appointment.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {format(new Date(appointment.date), "HH:mm")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-gold">R$ {appointment.totalAmount.toFixed(2)}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded inline-block">
                                                    {appointment.paymentMethod}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Services */}
                                            <div className="space-y-2">
                                                <h4 className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                                    <Scissors className="w-3 h-3 text-gold" />
                                                    Serviços Realizados
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {appointment.services.map((as: any) => (
                                                        <div key={as.id} className="text-sm bg-secondary/30 p-2 rounded-lg flex justify-between">
                                                            <span className="font-medium">{as.service.name}</span>
                                                            <span className="text-gold font-bold">R$ {as.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Products */}
                                            {appointment.products?.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                                        <Package className="w-3 h-3 text-emerald-500" />
                                                        Produtos Comprados
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {appointment.products.map((ap: any) => (
                                                            <div key={ap.id} className="text-sm bg-emerald-500/5 p-2 rounded-lg flex justify-between">
                                                                <span>{ap.quantity}x {ap.product.name}</span>
                                                                <span className="text-emerald-500 font-bold">R$ {ap.totalPrice.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                                            <TrendingUp className="w-3 h-3" />
                                            <span>Profissional: <strong className="text-foreground">{appointment.barber.name}</strong></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogBody>

                <DialogFooter className="px-6 py-4 border-t bg-card">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-xl transition-all active:scale-95"
                    >
                        Fechar Histórico
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
