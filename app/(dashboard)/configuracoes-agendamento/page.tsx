'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings,
  Clock,
  Calendar,
  Users,
  Briefcase,
  Save,
  AlertCircle,
  ChevronRight,
  Plus,
  Timer,
  Info,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: string[];
}

interface Schedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BookingSettings {
  id: string;
  schedule: Schedule;
  serviceIds: string[];
  barberIds: string[];
  slotDuration: number;
  advanceBookingDays: number;
  minimumNotice: number;
}

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function ConfiguracoesAgendamentoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [availableBarbers, setAvailableBarbers] = useState<Barber[]>([]);

  const [schedule, setSchedule] = useState<Schedule>({
    monday: { enabled: true, slots: [] },
    tuesday: { enabled: true, slots: [] },
    wednesday: { enabled: true, slots: [] },
    thursday: { enabled: true, slots: [] },
    friday: { enabled: true, slots: [] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
  });

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberIds, setBarberIds] = useState<string[]>([]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [minimumNotice, setMinimumNotice] = useState(2);

  const [tempStartTime, setTempStartTime] = useState('09:00');
  const [tempEndTime, setTempEndTime] = useState('18:00');
  const [selectedDay, setSelectedDay] = useState<keyof Schedule>('monday');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/booking-settings');
      if (!response.ok) throw new Error('Erro ao carregar configurações');

      const data = await response.json();
      setAvailableServices(data.availableServices || []);
      setAvailableBarbers(data.availableBarbers || []);

      if (data.settings) {
        setSchedule(data.settings.schedule as Schedule);
        setServiceIds(data.settings.serviceIds || []);
        setBarberIds(data.settings.barberIds || []);
        setSlotDuration(data.settings.slotDuration || 30);
        setAdvanceBookingDays(data.settings.advanceBookingDays || 30);
        setMinimumNotice(data.settings.minimumNotice || 2);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (startTime: string, endTime: string) => {
    const slots: string[] = [];
    let [startHour, startMin] = startTime.split(':').map(Number);
    let [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeStr);

      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    return slots;
  };

  const handleAddTimeSlots = () => {
    if (!tempStartTime || !tempEndTime) {
      toast.error('Preencha horário de início e fim');
      return;
    }

    const slots = generateTimeSlots(tempStartTime, tempEndTime);
    setSchedule((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        slots,
      },
    }));

    toast.success(`Horários gerados para ${daysOfWeek.find(d => d.key === selectedDay)?.label}`);
  };

  const handleToggleDay = (day: keyof Schedule) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: prev[day].enabled ? [] : prev[day].slots
      },
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleBarberToggle = (barberId: string) => {
    setBarberIds((prev) =>
      prev.includes(barberId)
        ? prev.filter((id) => id !== barberId)
        : [...prev, barberId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (serviceIds.length === 0) {
        toast.error('Selecione pelo menos um serviço');
        setSaving(false);
        return;
      }

      if (barberIds.length === 0) {
        toast.error('Selecione pelo menos um barbeiro');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/booking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule,
          serviceIds,
          barberIds,
          slotDuration,
          advanceBookingDays,
          minimumNotice,
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar configurações');

      toast.success('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Sincronizando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gold-500/10 border border-gold-500/20">
              <Settings className="w-6 h-6 text-gold-500" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
              Agendamento <span className="text-gold-500">Online</span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm max-w-xl">
            Configure seu link público. Defina horários, profissionais e serviços disponíveis para seus clientes.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold-gradient text-black font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-gold hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Processando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Salvar Alterações
            </div>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Horários */}
        <div className="xl:col-span-8 space-y-8">
          <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-3xl overflow-hidden border-t-gold-500/30 border-t-2">
            <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <div className="space-y-1">
                <CardTitle className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gold-500" />
                  Horários Disponíveis
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Gerencie a grade de horários para cada dia da semana.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Lista de Dias */}
                <div className="md:col-span-4 border-r border-white/5 bg-black/20">
                  <div className="p-4 space-y-1">
                    {daysOfWeek.map((day) => {
                      const isActive = selectedDay === day.key;
                      const isEnabled = schedule[day.key as keyof Schedule].enabled;
                      return (
                        <div
                          key={day.key}
                          onClick={() => setSelectedDay(day.key as keyof Schedule)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all group border",
                            isActive
                              ? "bg-gold-500/10 border-gold-500/20 text-gold-500"
                              : "hover:bg-white/5 text-gray-400 border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full transition-all shadow-lg",
                              isEnabled ? "bg-green-500 shadow-green-500/50" : "bg-gray-600"
                            )} />
                            <span className="font-bold text-sm">{day.label}</span>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-all opacity-0 -translate-x-2",
                            isActive ? "opacity-100 translate-x-0" : "group-hover:opacity-50 group-hover:translate-x-0"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalhes do Dia */}
                <div className="md:col-span-8 p-8 space-y-8 bg-black/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                        <Calendar className="w-5 h-5 text-gold-500" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-white tracking-tight">
                        {daysOfWeek.find(d => d.key === selectedDay)?.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-2 px-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] uppercase font-black text-gray-500">Agendamento Ativo?</span>
                      <Switch
                        checked={schedule[selectedDay].enabled}
                        onCheckedChange={() => handleToggleDay(selectedDay)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>

                  {schedule[selectedDay].enabled ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                      {/* Gerador */}
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-6">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-gold-500" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Gerar Slots Automaticamente</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Início</Label>
                            <Input
                              type="time"
                              value={tempStartTime}
                              onChange={(e) => setTempStartTime(e.target.value)}
                              className="bg-black/40 border-white/10 text-white rounded-xl h-12 focus:border-gold-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Fim</Label>
                            <Input
                              type="time"
                              value={tempEndTime}
                              onChange={(e) => setTempEndTime(e.target.value)}
                              className="bg-black/40 border-white/10 text-white rounded-xl h-12 focus:border-gold-500/50"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={handleAddTimeSlots}
                              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-gold-500 hover:text-black transition-all"
                            >
                              Gerar Grade
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Display Slots */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Horários Configurados</span>
                          <Badge variant="outline" className="text-[10px] border-gold-500/20 text-gold-500 bg-gold-500/5">
                            {schedule[selectedDay].slots.length} Horários
                          </Badge>
                        </div>

                        {schedule[selectedDay].slots.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {schedule[selectedDay].slots.map((slot, idx) => (
                              <div
                                key={idx}
                                className="bg-white/5 border border-white/5 py-2.5 rounded-xl text-center text-xs font-black text-gray-300 hover:border-gold-500/30 transition-all"
                              >
                                {slot}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/5">
                            <Info className="w-8 h-8 text-gray-700 mb-3" />
                            <p className="text-gray-500 text-sm font-medium italic">Nenhum horário definido para este dia</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 bg-red-500/[0.02] border border-red-500/10 rounded-3xl">
                      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <AlertCircle className="w-6 h-6 text-red-500/60" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">Este dia está desativado para agendamentos online.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Escolha de Serviços */}
            <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-3xl backdrop-blur-sm">
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-gold-500" />
                  Serviços Live
                </CardTitle>
                <CardDescription className="text-gray-500">Selecione o menu de serviços disponíveis no site.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                  {availableServices.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceToggle(service.id)}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                        serviceIds.includes(service.id)
                          ? "bg-gold-500/10 border-gold-500/30"
                          : "bg-white/5 border-transparent hover:bg-white/[0.08]"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                        serviceIds.includes(service.id) ? "bg-gold-500 border-gold-500" : "border-white/10"
                      )}>
                        {serviceIds.includes(service.id) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "font-bold text-sm transition-colors",
                          serviceIds.includes(service.id) ? "text-white" : "text-gray-400"
                        )}>{service.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">R$ {service.price.toFixed(2)} • {service.duration} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Escolha de Barbeiros */}
            <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-3xl backdrop-blur-sm">
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-500" />
                  Barbeiros Ativos
                </CardTitle>
                <CardDescription className="text-gray-500">Quais barbeiros poderão ser selecionados online.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                  {availableBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => handleBarberToggle(barber.id)}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                        barberIds.includes(barber.id)
                          ? "bg-gold-500/10 border-gold-500/30"
                          : "bg-white/5 border-transparent hover:bg-white/[0.08]"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                        barberIds.includes(barber.id) ? "bg-gold-500 border-gold-500" : "border-white/10"
                      )}>
                        {barberIds.includes(barber.id) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "font-bold text-sm transition-colors",
                          barberIds.includes(barber.id) ? "text-white" : "text-gray-400"
                        )}>{barber.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase border-white/5 text-gray-600 mt-0.5">Disponível</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Coluna Direita: Regras */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="bg-white/[0.02] border-white/5 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="bg-gold-gradient p-8 text-black">
              <h2 className="text-2xl font-serif font-black uppercase italic tracking-tighter leading-none mb-1">Regras VIP</h2>
              <p className="text-[10px] text-black/60 font-black uppercase tracking-widest text-center">Controles de Disponibilidade</p>
            </div>

            <CardContent className="p-8 space-y-12">
              {/* Slot Duration */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                    <Timer className="w-4 h-4 text-gold-500" />
                  </div>
                  <Label className="text-xs uppercase font-black text-gray-400 tracking-widest">Intervalo de Agenda</Label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((val) => (
                    <div
                      key={val}
                      onClick={() => setSlotDuration(val)}
                      className={cn(
                        "py-3 rounded-xl text-center text-xs font-black border transition-all cursor-pointer",
                        slotDuration === val
                          ? "bg-gold-500 text-black border-gold-500 shadow-gold"
                          : "bg-white/5 border-white/5 text-gray-600 hover:text-white"
                      )}
                    >
                      {val}m
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/5" />

              {/* Advance Days */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                    <Calendar className="w-4 h-4 text-gold-500" />
                  </div>
                  <Label className="text-xs uppercase font-black text-gray-400 tracking-widest">Limite de Reserva</Label>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Janela Futura</span>
                    <span className="text-gold-500 font-black text-lg">{advanceBookingDays} <span className="text-[10px] text-gray-500 uppercase ml-1">Dias</span></span>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="90"
                    step="1"
                    value={advanceBookingDays}
                    onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                    className="h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
                  <p className="text-[10px] text-gray-600 font-medium italic">Define até quando o cliente pode ver sua agenda.</p>
                </div>
              </div>

              <Separator className="bg-white/5" />

              {/* Notice Time */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                    <AlertCircle className="w-4 h-4 text-gold-500" />
                  </div>
                  <Label className="text-xs uppercase font-black text-gray-400 tracking-widest">Aviso Mínimo</Label>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 4, 12].map((h) => (
                    <div
                      key={h}
                      onClick={() => setMinimumNotice(h)}
                      className={cn(
                        "py-3 rounded-lg text-center text-[10px] font-black border transition-all cursor-pointer",
                        minimumNotice === h
                          ? "bg-gold-500/10 border-gold-500/40 text-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                          : "bg-white/5 border-transparent text-gray-600 hover:text-white"
                      )}
                    >
                      {h}h
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 font-medium leading-relaxed">Tempo de antecedência mínima que o cliente precisa para reservar um horário hoje.</p>
              </div>
            </CardContent>
          </Card>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-gold-500/10 mt-1">
                <Info className="w-4 h-4 text-gold-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white tracking-tight">Dica de Performance</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Mantenha o aviso mínimo em pelo menos 2h para evitar surpresas no seu fluxo de trabalho diário.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
