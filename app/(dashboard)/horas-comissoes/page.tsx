"use client";

import { useState, useEffect } from "react";
import { Clock, DollarSign, TrendingUp, User, Calendar as CalendarIcon, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BarberData {
  id: string;
  name: string;
  phone: string;
  commissionRate: number;
  totalHours: number;
  totalAppointments: number;
  totalCommission: number;
  totalCommissionPaid: number;
  totalCommissionPending: number;
  appointments: Array<{
    id: string;
    date: string;
    clientName: string;
    services: string;
    workedHours: number;
    totalAmount: number;
  }>;
}

interface ApiResponse {
  barbers: BarberData[];
  period: {
    start: string;
    end: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
};

export default function HorasComissoesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/barbers/worked-hours?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast.error("Erro ao carregar dados");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const selectedBarberData = selectedBarber === "all"
    ? null
    : data?.barbers.find(b => b.id === selectedBarber);

  const totals = data?.barbers.reduce(
    (acc, barber) => ({
      hours: acc.hours + barber.totalHours,
      appointments: acc.appointments + barber.totalAppointments,
      commission: acc.commission + barber.totalCommission,
      commissionPaid: acc.commissionPaid + barber.totalCommissionPaid,
      commissionPending: acc.commissionPending + barber.totalCommissionPending,
    }),
    { hours: 0, appointments: 0, commission: 0, commissionPaid: 0, commissionPending: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Horas Trabalhadas & Comissões</h1>
        <p className="text-muted-foreground">
          Acompanhe as horas trabalhadas e comissões de cada barbeiro
        </p>
      </div>

      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Filtrar por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Cards de Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatHours(totals?.hours || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totals?.appointments || 0} atendimentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Comissões</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totals?.commission || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Acumulado no período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals?.commissionPaid || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Já quitadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totals?.commissionPending || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  A pagar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs por Barbeiro */}
          <Tabs value={selectedBarber} onValueChange={setSelectedBarber} className="w-full">
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-6">
              <TabsTrigger value="all">Todos os Barbeiros</TabsTrigger>
              {data?.barbers.map((barber) => (
                <TabsTrigger key={barber.id} value={barber.id}>
                  {barber.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Barbeiro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.barbers.map((barber) => (
                      <div
                        key={barber.id}
                        className="bg-secondary/50 p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{barber.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Comissão: {barber.commissionRate}%
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBarber(barber.id)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Horas Trabalhadas</p>
                            <p className="text-lg font-bold text-primary">
                              {formatHours(barber.totalHours)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Atendimentos</p>
                            <p className="text-lg font-bold">{barber.totalAppointments}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Comissões</p>
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(barber.totalCommission)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pendente</p>
                            <p className="text-lg font-bold text-yellow-600">
                              {formatCurrency(barber.totalCommissionPending)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tabs individuais para cada barbeiro */}
            {data?.barbers.map((barber) => (
              <TabsContent key={barber.id} value={barber.id} className="mt-0">
                <div className="space-y-6">
                  {/* Cards de resumo do barbeiro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">
                          {formatHours(barber.totalHours)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {barber.totalAppointments} atendimentos
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Comissões</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(barber.totalCommission)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {barber.commissionRate}% dos serviços
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(barber.totalCommissionPaid)}
                        </div>
                        <Badge variant="outline" className="mt-1 border-green-500 text-green-600">
                          Quitadas
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {formatCurrency(barber.totalCommissionPending)}
                        </div>
                        <Badge variant="outline" className="mt-1 border-yellow-500 text-yellow-600">
                          A pagar
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de atendimentos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Atendimentos Realizados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {barber.appointments.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                          Nenhum atendimento no período selecionado
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                  Data/Hora
                                </th>
                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                  Cliente
                                </th>
                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                  Serviços
                                </th>
                                <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                                  Horas
                                </th>
                                <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                                  Valor
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {barber.appointments.map((apt) => (
                                <tr key={apt.id} className="border-b border-border/50">
                                  <td className="p-3 text-sm">
                                    {format(new Date(apt.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </td>
                                  <td className="p-3 text-sm font-medium">{apt.clientName}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{apt.services}</td>
                                  <td className="p-3 text-sm text-right font-medium text-primary">
                                    {formatHours(apt.workedHours)}
                                  </td>
                                  <td className="p-3 text-sm text-right font-semibold">
                                    {formatCurrency(apt.totalAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
