"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Calendar as CalendarIcon, Trash2, Eye, User, Phone, DollarSign, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toManausTime } from "@/lib/timezone";
import { CardGridSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { AppointmentForm } from "@/components/appointments/appointment-form";

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Barber {
  id: string;
  name: string;
  commissionRate: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Appointment {
  id: string;
  date: string;
  totalAmount: number;
  commissionAmount: number;
  paymentMethod: string;
  notes: string | null;
  status: string;
  client: Client;
  barber: Barber;
  services: Array<{
    service: Service;
  }>;
}

// Horários disponíveis para agendamento
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00'
];

export default function AtendimentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBarber, setFilterBarber] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBarberTab, setSelectedBarberTab] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);



  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchBarbers();
    fetchServices();
  }, [search, filterBarber, filterPayment, filterStatus, dateRange]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterBarber) params.append("barberId", filterBarber);
      if (filterPayment) params.append("paymentMethod", filterPayment);
      if (filterStatus) params.append("status", filterStatus);
      if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erro ao carregar atendimentos");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchBarbers = async () => {
    try {
      const res = await fetch("/api/barbers");
      const data = await res.json();
      setBarbers(data.filter((b: Barber & { isActive: boolean }) => b.isActive));
    } catch (error) {
      console.error("Error fetching barbers:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data.filter((s: Service & { isActive: boolean }) => s.isActive));
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este atendimento?")) return;

    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Atendimento excluído com sucesso!");
        fetchAppointments();
      } else {
        toast.error("Erro ao excluir atendimento");
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Erro ao excluir atendimento");
    }
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const paymentMethodLabels: Record<string, string> = {
    CASH: "Dinheiro",
    DEBIT_CARD: "Cartão Débito",
    CREDIT_CARD: "Cartão Crédito",
    PIX: "PIX",
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Histórico de <span className="text-gold-500">Atendimentos</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Registre e gerencie os atendimentos da barbearia
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Atendimento
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white focus:ring-gold-500/50 focus:border-gold-500 rounded-2xl py-4"
            />
          </div>
          <Select value={filterBarber || undefined} onValueChange={(value) => setFilterBarber(value)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl h-full py-4">
              <SelectValue placeholder="Barbeiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {barbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus || undefined} onValueChange={(value) => setFilterStatus(value)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl h-full py-4">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Agendado</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
              <SelectItem value="CANCELED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPayment || undefined} onValueChange={(value) => setFilterPayment(value)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl h-full py-4">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-full"
          />
        </div>
      </div>

      {/* Appointments List by Barber */}
      {loading ? (
        <CardGridSkeleton count={4} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="Nenhum atendimento"
          description={search ? "Não encontramos atendimentos para sua busca." : "Sua barbearia ainda não possui atendimentos registrados no período."}
          actionLabel={search ? undefined : "Novo Atendimento"}
          onAction={search ? undefined : () => setIsDialogOpen(true)}
        />
      ) : (
        <Tabs value={selectedBarberTab} onValueChange={setSelectedBarberTab} className="w-full">
          <div className="overflow-x-auto pb-4 mb-6">
            <TabsList className="bg-black/20 border border-white/5 p-1 rounded-2xl h-auto">
              <TabsTrigger
                value="all"
                className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gold-500 data-[state=active]:text-black transition-all"
              >
                Todos <span className="ml-2 opacity-60 text-xs font-bold leading-none align-middle">{appointments.length}</span>
              </TabsTrigger>
              {barbers.filter(b => appointments.some(a => a.barber.id === b.id)).map((barber) => {
                const count = appointments.filter(a => a.barber.id === barber.id).length;
                return (
                  <TabsTrigger
                    key={barber.id}
                    value={barber.id}
                    className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gold-500 data-[state=active]:text-black transition-all"
                  >
                    {barber.name} <span className="ml-2 opacity-60 text-xs font-bold leading-none align-middle">{count}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0 outline-none">
            <div className="grid gap-6">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="glass-panel p-6 rounded-3xl group hover:border-gold-500/30 transition-all duration-500 relative cursor-pointer"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <div className="absolute -inset-0.5 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity pointer-events-none" />

                  <div className="relative">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                          <User className="w-6 h-6 text-gold-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-gold-500 transition-all">
                            {appointment.client.name}
                          </h3>
                          <p className="text-xs font-black uppercase tracking-widest text-gold-500/60 mt-0.5">
                            {appointment.barber.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex flex-col items-end mr-4">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Valor Total</span>
                          <span className="text-2xl font-serif font-bold text-gold-500 leading-none">
                            {formatCurrency(appointment.totalAmount)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(appointment.id);
                          }}
                          className="w-10 h-10 p-0 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <CalendarIcon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Data e Hora</span>
                          <span className="text-sm font-bold text-white">
                            {format(toManausTime(new Date(appointment.date)), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Badge variant="outline" className="border-gold-500/30 text-gold-500 p-0 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold">
                            {appointment.services.length}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Serviços</span>
                          <span className="text-sm font-bold text-white">
                            {appointment.services.length} {appointment.services.length === 1 ? 'Procedimento' : 'Procedimentos'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Pagamento</span>
                          <span className="text-sm font-bold text-white">
                            {paymentMethodLabels[appointment.paymentMethod]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Individual Barber Tabs Content */}
          {barbers.filter(b => appointments.some(a => a.barber.id === b.id)).map((barber) => {
            const barberAppointments = appointments.filter(a => a.barber.id === barber.id);
            return (
              <TabsContent key={barber.id} value={barber.id} className="mt-0 outline-none">
                <div className="grid gap-6">
                  {barberAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="glass-panel p-6 rounded-3xl group hover:border-gold-500/30 transition-all duration-500 relative cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <div className="absolute -inset-0.5 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity pointer-events-none" />

                      <div className="relative">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                              <User className="w-6 h-6 text-gold-500" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-gold-500 transition-all">
                                {appointment.client.name}
                              </h3>
                              <p className="text-xs font-black uppercase tracking-widest text-gold-500/60 mt-0.5">
                                {appointment.barber.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex flex-col items-end mr-4">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Valor Total</span>
                              <span className="text-2xl font-serif font-bold text-gold-500 leading-none">
                                {formatCurrency(appointment.totalAmount)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(appointment.id);
                              }}
                              className="w-10 h-10 p-0 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                              <CalendarIcon className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Data e Hora</span>
                              <span className="text-sm font-bold text-white">
                                {format(toManausTime(new Date(appointment.date)), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                              <Badge variant="outline" className="border-gold-500/30 text-gold-500 p-0 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold">
                                {appointment.services.length}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Serviços</span>
                              <span className="text-sm font-bold text-white">
                                {appointment.services.length} {appointment.services.length === 1 ? 'Procedimento' : 'Procedimentos'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block">Pagamento</span>
                              <span className="text-sm font-bold text-white">
                                {paymentMethodLabels[appointment.paymentMethod]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Atendimento</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            clients={clients}
            barbers={barbers}
            services={services}
            onSuccess={() => {
              setIsDialogOpen(false);
              fetchAppointments();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog - Enhanced */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 text-xl font-serif text-white">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <CalendarIcon className="w-4 h-4 text-gold-500" />
                </div>
                Detalhes do Atendimento
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Cliente e Barbeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gold-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Cliente</span>
                  </div>
                  <p className="text-white font-bold text-lg">{selectedAppointment.client.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-gold-500/70" />
                    <p className="text-sm text-gray-400 font-medium">{selectedAppointment.client.phone}</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gold-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Barbeiro</span>
                  </div>
                  <p className="text-white font-bold text-lg">{selectedAppointment.barber.name}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="border-gold-500/30 text-gold-500 bg-gold-500/5">
                      Comissão: {selectedAppointment.barber.commissionRate}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Data/Hora e Status */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gold-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Data e Hora</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white font-bold text-lg">
                    {format(toManausTime(new Date(selectedAppointment.date)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <Badge
                    className={cn(
                      "px-3 py-1",
                      selectedAppointment.status === 'COMPLETED'
                        ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50"
                        : "bg-white/10 text-white"
                    )}
                  >
                    {selectedAppointment.status === 'COMPLETED' ? '✓ Concluído' : selectedAppointment.status}
                  </Badge>
                </div>
              </div>

              {/* Serviços */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Serviços Realizados</span>
                <div className="space-y-2">
                  {selectedAppointment.services.map((s) => (
                    <div
                      key={s.service.id}
                      className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5"
                    >
                      <span className="text-white font-medium">{s.service.name}</span>
                      <span className="font-bold text-gold-500">{formatCurrency(s.service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamento */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gold-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Forma de Pagamento</span>
                </div>
                <Badge variant="outline" className="text-base py-1 px-4 border-white/20 text-white bg-white/5">
                  {paymentMethodLabels[selectedAppointment.paymentMethod]}
                </Badge>
              </div>

              {/* Totais */}
              <div className="bg-gold-500/5 border border-gold-500/20 p-6 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Valor Total:</span>
                  <span className="font-serif font-bold text-gold-500 text-3xl">
                    {formatCurrency(selectedAppointment.totalAmount)}
                  </span>
                </div>
                <div className="border-t border-gold-500/10 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 text-xs uppercase tracking-widest font-bold">Comissão do Barbeiro:</span>
                    <span className="font-bold text-white/50">
                      {formatCurrency(selectedAppointment.commissionAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedAppointment.notes && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Observações</span>
                  <p className="text-white text-sm italic opacity-80 leading-relaxed">"{selectedAppointment.notes}"</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>      </Dialog>
    </div>
  );
}
