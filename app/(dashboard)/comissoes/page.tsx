"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@/hooks/use-user";

interface CommissionData {
  barber: {
    id: string;
    name: string;
    commissionRate: number;
  };
  totalAppointments: number;
  totalRevenue: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  appointments: Array<{
    id: string;
    date: string;
    totalAmount: number;
    commissionAmount: number;
    commissionPaid: boolean;
    commissionId: string;
    client: { name: string };
    services: Array<{ service: { name: string } }>;
  }>;
}

export default function ComissoesPage() {
  const { user } = useUser();
  const userRole = user?.user_metadata?.role;
  const [commissionsData, setCommissionsData] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);

  useEffect(() => {
    // Set default dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchCommissions();
    }
  }, [startDate, endDate]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/commissions?${params}`);
      const data = await res.json();
      setCommissionsData(data);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast.error("Erro ao carregar comissões");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (commissionId: string) => {
    if (!confirm("Marcar esta comissão como paga?")) return;

    try {
      const res = await fetch(`/api/commissions/${commissionId}/pay`, {
        method: "PUT",
      });

      if (res.ok) {
        toast.success("Comissão marcada como paga!");
        fetchCommissions();
      } else {
        toast.error("Erro ao marcar comissão como paga");
      }
    } catch (error) {
      console.error("Error marking commission as paid:", error);
      toast.error("Erro ao marcar comissão como paga");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalPending = commissionsData.reduce((sum, data) => sum + data.pendingCommission, 0);
  const totalPaid = commissionsData.reduce((sum, data) => sum + data.paidCommission, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Gestão de <span className="text-gold-500">Comissões</span>
        </h1>
        <p className="text-gray-500 font-medium">
          Acompanhe e pague as comissões dos seus barbeiros.
        </p>
      </div>

      {/* Date Filters */}
      <div className="glass-panel p-6 rounded-3xl">
        <h3 className="text-lg font-serif font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold-500" />
          Período de Análise
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-gray-400 text-sm uppercase tracking-wide">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 bg-white/5 border-white/10 text-white focus:ring-gold-500/50 focus:border-gold-500"
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="text-gray-400 text-sm uppercase tracking-wide">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 bg-white/5 border-white/10 text-white focus:ring-gold-500/50 focus:border-gold-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <DollarSign className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest">Total Pendente</p>
              <p className="text-3xl font-serif font-bold text-white">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-green-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-green-500/60 uppercase tracking-widest">Total Pago</p>
              <p className="text-3xl font-serif font-bold text-white">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barbers Commissions */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gold-500 font-serif italic">Calculando comissões...</p>
        </div>
      ) : commissionsData.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-gray-600" />
          </div>
          <p className="text-white text-lg font-bold mb-2">
            Nenhuma comissão encontrada
          </p>
          <p className="text-gray-500">
            Tente ajustar o período selecionado
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {commissionsData.map((data) => (
            <div
              key={data.barber.id}
              className="glass-panel rounded-3xl overflow-hidden group hover:border-gold-500/30 transition-all duration-500"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-gold-500 transition-colors">
                      {data.barber.name}
                    </h3>
                    <p className="text-xs font-bold text-gold-500/60 uppercase tracking-widest">
                      {data.barber.commissionRate}% de Comissão
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedBarber(
                        expandedBarber === data.barber.id ? null : data.barber.id
                      )
                    }
                    className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white hover:border-gold-500/30"
                  >
                    {expandedBarber === data.barber.id ? "Ocultar" : "Ver"} Detalhes
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Atendimentos</p>
                    <p className="text-2xl font-bold text-white">
                      {data.totalAppointments}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Faturamento</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(data.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                    <p className="text-xs font-bold text-amber-500/80 uppercase tracking-wide mb-1">Pendente</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {formatCurrency(data.pendingCommission)}
                    </p>
                  </div>
                  <div className="bg-green-500/10 rounded-2xl p-4 border border-green-500/20">
                    <p className="text-xs font-bold text-green-500/80 uppercase tracking-wide mb-1">Pago</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(data.paidCommission)}
                    </p>
                  </div>
                </div>
              </div>

              {expandedBarber === data.barber.id && (
                <div className="border-t border-white/5 p-6 bg-white/[0.02]">
                  <h4 className="font-serif font-bold text-white mb-4">
                    Atendimentos no Período
                  </h4>
                  <div className="space-y-3">
                    {data.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-white">
                            {appointment.client.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(appointment.date), "dd/MM/yyyy HH:mm", { locale: ptBR })} •{" "}
                            {appointment.services.map(s => s.service.name).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Total</p>
                            <p className="font-bold text-white">
                              {formatCurrency(appointment.totalAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Comissão</p>
                            <p className="font-bold text-gold-500">
                              {formatCurrency(appointment.commissionAmount)}
                            </p>
                          </div>
                          {!appointment.commissionPaid && userRole === "ADMIN" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(appointment.commissionId)}
                              className="bg-gold-500 hover:bg-gold-600 text-black font-bold"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          {appointment.commissionPaid && (
                            <span className="px-3 py-1.5 bg-green-500/10 text-green-500 text-sm font-bold rounded-xl border border-green-500/20">
                              Pago ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
