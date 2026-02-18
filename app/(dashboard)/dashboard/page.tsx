"use client";

import { useEffect, useState } from "react";
import { DollarSign, Calendar, TrendingUp, Award, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { BarbersChart } from "@/components/dashboard/barbers-chart";
import { ServicesChart } from "@/components/dashboard/services-chart";
import { PaymentChart } from "@/components/dashboard/payment-chart";
import { OccupancyHeatmap } from "@/components/dashboard/occupancy-heatmap";

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalAppointments: number;
    averageTicket: number;
    topBarber: { name: string; count: number } | null;
  };
  charts: {
    revenueByDay: Array<{ date: string; revenue: number }>;
    appointmentsByBarber: Array<{ name: string; count: number }>;
    topServices: Array<{ name: string; count: number }>;
    paymentMethods: Array<{ method: string; count: number }>;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState("all");

  useEffect(() => {
    // Buscar lista de barbeiros
    async function fetchBarbers() {
      try {
        const res = await fetch('/api/barbers');
        if (res.ok) {
          const data = await res.json();
          setBarbers(data);
        }
      } catch (error) {
        console.error("Erro ao buscar barbeiros:", error);
      }
    }
    fetchBarbers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Timeout de 10 segundos
      const timeoutId = setTimeout(() => {
        setLoading(false);
        console.error("Dashboard data fetch timeout");
      }, 10000);

      try {
        const queryParams = new URLSearchParams({
          period,
          ...(selectedBarber !== 'all' ? { barberId: selectedBarber } : {})
        });
        const response = await fetch(`/api/stats?${queryParams}`);
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          console.error("Error response:", response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, selectedBarber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho da barbearia
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Barber Filter */}
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
            className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">Todos os Barbeiros</option>
            {barbers.map(barber => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>

          {/* Period Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("today")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${period === "today"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${period === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${period === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Faturamento Total"
          value={`R$ ${data?.summary?.totalRevenue?.toFixed?.(2) ?? '0.00'}`}
          icon={DollarSign}
          description={
            period === "today"
              ? "Hoje"
              : period === "week"
                ? "Últimos 7 dias"
                : "Este mês"
          }
        />
        <StatCard
          title="Atendimentos"
          value={String(data?.summary?.totalAppointments ?? 0)}
          icon={Calendar}
          description={
            period === "today"
              ? "Hoje"
              : period === "week"
                ? "Últimos 7 dias"
                : "Este mês"
          }
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${data?.summary?.averageTicket?.toFixed?.(2) ?? '0.00'}`}
          icon={TrendingUp}
          description="Por atendimento"
        />
        <StatCard
          title="Barbeiro Destaque"
          value={data?.summary?.topBarber?.name ?? "N/A"}
          icon={Award}
          description={
            data?.summary?.topBarber
              ? `${data?.summary?.topBarber?.count ?? 0} atendimentos`
              : "Sem dados"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data?.charts?.revenueByDay ?? []} />
        <BarbersChart data={data?.charts?.appointmentsByBarber ?? []} />
        <ServicesChart data={data?.charts?.topServices ?? []} />
        <PaymentChart data={data?.charts?.paymentMethods ?? []} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <OccupancyHeatmap period={period} barberId={selectedBarber} />
      </div>
    </div>
  );
}
