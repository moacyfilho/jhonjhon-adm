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

interface Client {
  id: string;
  name: string;
  phone: string;
  isSubscriber?: boolean;
}

interface Barber {
  id: string;
  name: string;
  commissionRate: number;
  hourlyRate?: number;
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
  commission?: {
    amount: number;
  };
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBarberTab, setSelectedBarberTab] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState({
    clientId: "",
    barberId: "",
    serviceIds: [] as string[],
    date: "",
    time: "",
    paymentMethod: "",
    notes: "",
  });

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchBarbers();
    fetchServices();
  }, [search, filterBarber, filterPayment]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterBarber) params.append("barberId", filterBarber);
      if (filterPayment) params.append("paymentMethod", filterPayment);

      const res = await fetch(`/api/appointments?${params}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.barberId || formData.serviceIds.length === 0 ||
      !formData.date || !formData.time || !formData.paymentMethod) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: dateTime.toISOString(),
        }),
      });

      if (res.ok) {
        toast.success("Atendimento registrado com sucesso!");
        setIsDialogOpen(false);
        resetForm();
        fetchAppointments();
      } else {
        toast.error("Erro ao registrar atendimento");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Erro ao registrar atendimento");
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

  const resetForm = () => {
    setFormData({
      clientId: "",
      barberId: "",
      serviceIds: [],
      date: "",
      time: "",
      paymentMethod: "",
      notes: "",
    });
    setSelectedDate(undefined);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId]
    }));
  };

  const calculateTotal = () => {
    return formData.serviceIds.reduce((sum, id) => {
      const service = services.find(s => s.id === id);
      return sum + (service?.price || 0);
    }, 0);
  };

  const calculateCommission = () => {
    const total = calculateTotal();
    const barber = barbers.find(b => b.id === formData.barberId);
    return barber ? (total * barber.commissionRate) / 100 : 0;
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
          <p className="text-muted-foreground">
            Registre e gerencie os atendimentos da barbearia
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Atendimento
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por cliente ou barbeiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBarber || undefined} onValueChange={(value) => setFilterBarber(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os barbeiros" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map((barber) => (
              <SelectItem key={barber.id} value={barber.id}>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPayment || undefined} onValueChange={(value) => setFilterPayment(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as formas" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List by Barber */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            Nenhum atendimento encontrado
          </p>
          <p className="text-muted-foreground">
            Registre o primeiro atendimento clicando no botão acima
          </p>
        </div>
      ) : (
        <Tabs value={selectedBarberTab} onValueChange={setSelectedBarberTab} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-6">
            <TabsTrigger value="all" onClick={() => setSelectedBarberTab("all")}>
              Todos ({appointments.length})
            </TabsTrigger>
            {barbers.filter(b => appointments.some(a => a.barber.id === b.id)).map((barber) => {
              const barberAppointments = appointments.filter(a => a.barber.id === barber.id);
              return (
                <TabsTrigger key={barber.id} value={barber.id} onClick={() => setSelectedBarberTab(barber.id)}>
                  {barber.name} ({barberAppointments.length})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {appointment.client.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Barbeiro: {appointment.barber.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(appointment.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium text-foreground">
                        {format(toManausTime(new Date(appointment.date)), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Serviços</p>
                      <p className="font-medium text-foreground">
                        {appointment.services.length} serviço(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pagamento</p>
                      <p className="font-medium text-foreground">
                        {paymentMethodLabels[appointment.paymentMethod]}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Total</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(appointment.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tabs individuais para cada barbeiro */}
          {barbers.filter(b => appointments.some(a => a.barber.id === b.id)).map((barber) => {
            const barberAppointments = appointments.filter(a => a.barber.id === barber.id);
            return (
              <TabsContent key={barber.id} value={barber.id} className="mt-0">
                <div className="grid gap-4">
                  {barberAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {appointment.client.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Barbeiro: {appointment.barber.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(appointment.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Data</p>
                          <p className="font-medium text-foreground">
                            {format(toManausTime(new Date(appointment.date)), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Serviços</p>
                          <p className="font-medium text-foreground">
                            {appointment.services.length} serviço(s)
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pagamento</p>
                          <p className="font-medium text-foreground">
                            {paymentMethodLabels[appointment.paymentMethod]}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor Total</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(appointment.totalAmount)}
                          </p>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="barberId">Barbeiro *</Label>
                <Select value={formData.barberId} onValueChange={(value) => setFormData({ ...formData, barberId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Serviços *</Label>
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto border border-border rounded-lg p-4">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80"
                  >
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(service.price)} • {service.duration} min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          setFormData({ ...formData, date: format(date, "yyyy-MM-dd") });
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="time">Hora *</Label>
                <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações opcionais sobre o atendimento"
                rows={3}
              />
            </div>

            {formData.serviceIds.length > 0 && (
              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-foreground">Valor Total:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                {formData.barberId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Comissão do Barbeiro:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(calculateCommission())}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Registrar Atendimento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Enhanced */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 text-xl">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Detalhes do Atendimento
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Cliente e Barbeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold">Cliente</Label>
                  </div>
                  <p className="text-foreground font-medium">{selectedAppointment.client.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{selectedAppointment.client.phone}</p>
                  </div>
                </div>

                <div className="bg-secondary/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold">Barbeiro</Label>
                  </div>
                  <p className="text-foreground font-medium">{selectedAppointment.barber.name}</p>
                  <Badge variant="outline" className="mt-2">
                    Comissão: {selectedAppointment.barber.commissionRate}%
                  </Badge>
                </div>
              </div>

              {/* Data/Hora e Status */}
              <div className="bg-secondary/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Data e Hora</Label>
                </div>
                <p className="text-foreground font-medium">
                  {format(toManausTime(new Date(selectedAppointment.date)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <Badge
                  variant={selectedAppointment.status === 'COMPLETED' ? 'default' : 'secondary'}
                  className="mt-2"
                >
                  {selectedAppointment.status === 'COMPLETED' ? '✓ Concluído' : selectedAppointment.status}
                </Badge>
              </div>

              {/* Serviços */}
              <div className="bg-secondary/50 p-4 rounded-lg">
                <Label className="text-sm font-semibold mb-3 block">Serviços Realizados</Label>
                <div className="space-y-2">
                  {selectedAppointment.services.map((s) => (
                    <div
                      key={s.service.id}
                      className="flex justify-between items-center p-2 bg-background rounded border border-border"
                    >
                      <span className="text-foreground">{s.service.name}</span>
                      <span className="font-semibold text-primary">{formatCurrency(s.service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamento */}
              <div className="bg-secondary/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Forma de Pagamento</Label>
                </div>
                <Badge variant="outline" className="text-base">
                  {paymentMethodLabels[selectedAppointment.paymentMethod]}
                </Badge>
              </div>

              {/* Totais */}
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center text-primary">
                  <span className="font-medium text-lg">Valor Total:</span>
                  <span className="font-bold text-2xl">
                    {formatCurrency(selectedAppointment.totalAmount)}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Comissão do Barbeiro</span>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedAppointment.client.isSubscriber
                          ? `Base: ${selectedAppointment.barber.hourlyRate || 0}/hora`
                          : `Base: ${selectedAppointment.barber.commissionRate || 0}% sobre serviços`}
                      </span>
                    </div>
                    <span className="font-bold text-lg">
                      {formatCurrency(
                        selectedAppointment.commission?.amount ??
                        selectedAppointment.commissionAmount ??
                        (() => {
                          const isSub = selectedAppointment.client.isSubscriber;
                          if (isSub) {
                            const totalMinutes = selectedAppointment.services.reduce((sum, s) => sum + (s.service.duration || 0), 0);
                            return (totalMinutes / 60) * (selectedAppointment.barber.hourlyRate || 0);
                          } else {
                            const servicesTotal = selectedAppointment.services.reduce((sum, s) => sum + (s.service.price || 0), 0);
                            return (servicesTotal * (selectedAppointment.barber.commissionRate || 0)) / 100;
                          }
                        })()
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedAppointment.notes && (
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <Label className="text-sm font-semibold mb-2 block">Observações</Label>
                  <p className="text-foreground text-sm italic">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
