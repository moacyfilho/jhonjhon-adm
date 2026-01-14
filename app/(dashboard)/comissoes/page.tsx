"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, Check, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    image?: string;
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

interface Barber {
  id: string;
  name: string;
  image?: string;
  commissionRate: number;
}

interface Service {
  id: string;
  name: string;
}

interface CommissionConfig {
  barberId: string;
  serviceId: string;
  percentage: number;
}

export default function ComissoesPage() {
  const { user } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => setUserRole(data.role))
      .catch(err => console.error(err));
  }, []);

  const [commissionsData, setCommissionsData] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);

  // Config Dialog States
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

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

  const fetchConfigData = async () => {
    try {
      const [barbersRes, servicesRes, configsRes] = await Promise.all([
        fetch('/api/barbers'),
        fetch('/api/services'),
        fetch('/api/commissions/config')
      ]);

      if (barbersRes.ok && servicesRes.ok && configsRes.ok) {
        setBarbers(await barbersRes.json());
        setServices(await servicesRes.json());
        setConfigs(await configsRes.json());
      }
    } catch (error) {
      console.error("Error fetching config data:", error);
      toast.error("Erro ao carregar dados de configuração");
    }
  };

  const handleOpenConfig = () => {
    fetchConfigData();
    setConfigDialogOpen(true);
  };

  const handleConfigChange = (barberId: string, serviceId: string, value: string) => {
    const percentage = parseFloat(value);
    if (isNaN(percentage)) return;

    setConfigs(prev => {
      const existing = prev.find(c => c.barberId === barberId && c.serviceId === serviceId);
      if (existing) {
        return prev.map(c =>
          c.barberId === barberId && c.serviceId === serviceId
            ? { ...c, percentage }
            : c
        );
      } else {
        return [...prev, { barberId, serviceId, percentage }];
      }
    });
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/commissions/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs)
      });

      if (res.ok) {
        toast.success("Configurações salvas com sucesso!");
        setConfigDialogOpen(false);
      } else {
        toast.error("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingConfig(false);
    }
  };

  const getCommissionValue = (barberId: string, serviceId: string) => {
    const config = configs.find(c => c.barberId === barberId && c.serviceId === serviceId);
    return config?.percentage ?? 0;
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Gestão de <span className="text-gold-500">Comissões</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Acompanhe e pague as comissões dos seus barbeiros.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleOpenConfig}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Comissões
          </Button>
        )}
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
                      {data.barber.commissionRate}% de Comissão Base
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

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#1A1A1A] border-white/10 text-white p-0 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">Configurar comissões</DialogTitle>
            <div className="flex bg-black/40 rounded-lg p-1 hidden">
              <Button size="sm" variant="ghost" className="bg-white/10 text-white hover:bg-white/20">Comissões</Button>
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wide">Serviços</h4>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[300px] text-gray-400">Serviço</TableHead>
                    {barbers.map(barber => (
                      <TableHead key={barber.id} className="text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gold-500 font-bold border border-white/10 overflow-hidden">
                            {barber.image ? <img src={barber.image} className="w-full h-full object-cover" /> : barber.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{barber.name.split(' ')[0]}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(service => (
                    <TableRow key={service.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{service.name}</TableCell>
                      {barbers.map(barber => {
                        const currentValue = getCommissionValue(barber.id, service.id);
                        return (
                          <TableCell key={barber.id} className="text-center p-2">
                            <div className="flex items-center justify-center bg-black/40 rounded-lg border border-white/10 focus-within:border-gold-500/50">
                              <Input
                                className="w-16 h-8 bg-transparent border-none text-right focus-visible:ring-0 p-1"
                                value={currentValue}
                                onChange={(e) => handleConfigChange(barber.id, service.id, e.target.value)}
                                type="number"
                                min="0"
                                max="100"
                              />
                              <span className="pr-2 text-gray-500 text-sm">%</span>
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">Assinatura</TableCell>
                    {barbers.map(barber => (
                      <TableCell key={barber.id} className="text-center text-gold-500 font-bold text-sm">
                        45%
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">Produtos</TableCell>
                    {barbers.map(barber => (
                      <TableCell key={barber.id} className="text-center text-gray-500 text-sm italic">
                        Por Produto
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-white/10 bg-black/20">
            <Button variant="ghost" onClick={() => setConfigDialogOpen(false)} className="hover:bg-white/10">
              Fechar
            </Button>
            <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
              {savingConfig ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
