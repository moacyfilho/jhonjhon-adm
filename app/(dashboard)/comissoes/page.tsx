"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role;
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Comissões</h1>
        <p className="text-muted-foreground">
          Gerencie as comissões dos barbeiros
        </p>
      </div>

      {/* Date Filters */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barbers Commissions */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : commissionsData.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            Nenhuma comissão encontrada
          </p>
          <p className="text-muted-foreground">
            Tente ajustar o período selecionado
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {commissionsData.map((data) => (
            <div
              key={data.barber.id}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {data.barber.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Comissão: {data.barber.commissionRate}%
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
                  >
                    {expandedBarber === data.barber.id ? "Ocultar" : "Ver"} Detalhes
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Atendimentos</p>
                    <p className="text-lg font-semibold text-foreground">
                      {data.totalAppointments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(data.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Pendente</p>
                    <p className="text-lg font-semibold text-yellow-500">
                      {formatCurrency(data.pendingCommission)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Paga</p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatCurrency(data.paidCommission)}
                    </p>
                  </div>
                </div>
              </div>

              {expandedBarber === data.barber.id && (
                <div className="border-t border-border p-6 bg-secondary/20">
                  <h4 className="font-semibold text-foreground mb-4">
                    Atendimentos no Período
                  </h4>
                  <div className="space-y-3">
                    {data.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-card rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {appointment.client.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), "dd/MM/yyyy HH:mm", { locale: ptBR })} •{" "}
                            {appointment.services.map(s => s.service.name).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-semibold text-foreground">
                              {formatCurrency(appointment.totalAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Comissão</p>
                            <p className="font-semibold text-primary">
                              {formatCurrency(appointment.commissionAmount)}
                            </p>
                          </div>
                          {!appointment.commissionPaid && userRole === "ADMIN" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(appointment.commissionId)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          {appointment.commissionPaid && (
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-sm font-semibold rounded">
                              Pago
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
