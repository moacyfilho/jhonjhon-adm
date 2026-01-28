'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Clock, Calendar, Users, Briefcase, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [settings, setSettings] = useState<BookingSettings | null>(null);
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

  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');
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
      setSettings(data.settings);
      setAvailableServices(data.availableServices || []);
      setAvailableBarbers(data.availableBarbers || []);

      // Preencher formulário
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
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeStr);

      // Avança pelo slotDuration
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

    setTempStartTime('');
    setTempEndTime('');
    toast.success('Horários configurados!');
  };

  const handleToggleDay = (day: keyof Schedule) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
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

      // Validações
      if (serviceIds.length === 0) {
        toast.error('Selecione pelo menos um serviço');
        return;
      }

      if (barberIds.length === 0) {
        toast.error('Selecione pelo menos um barbeiro');
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
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gold">Configurações de Agendamento Online</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure horários, serviços e profissionais disponíveis para agendamento público
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-gold text-white hover:bg-gold/90">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Alert Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Estas configurações determinam o que os clientes poderão ver e agendar na página pública de agendamento.
        </AlertDescription>
      </Alert>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slotDuration">Duração do Intervalo (minutos)</Label>
              <Input
                id="slotDuration"
                type="number"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                min={15}
                max={120}
              />
              <p className="text-xs text-muted-foreground">
                Intervalo entre horários disponíveis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advanceBookingDays">Dias de Antecedência</Label>
              <Input
                id="advanceBookingDays"
                type="number"
                value={advanceBookingDays}
                onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                min={1}
                max={90}
              />
              <p className="text-xs text-muted-foreground">
                Até quantos dias no futuro podem agendar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumNotice">Aviso Mínimo (horas)</Label>
              <Input
                id="minimumNotice"
                type="number"
                value={minimumNotice}
                onChange={(e) => setMinimumNotice(Number(e.target.value))}
                min={0}
                max={48}
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo de antecedência para agendar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horários de Funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários de Funcionamento
          </CardTitle>
          <CardDescription>
            Configure os horários disponíveis para cada dia da semana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={schedule[day.key as keyof Schedule].enabled}
                    onCheckedChange={() => handleToggleDay(day.key as keyof Schedule)}
                  />
                  <Label className="text-base font-medium">{day.label}</Label>
                </div>

                {schedule[day.key as keyof Schedule].enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDay(day.key as keyof Schedule)}
                  >
                    Configurar Horários
                  </Button>
                )}
              </div>

              {schedule[day.key as keyof Schedule].enabled && schedule[day.key as keyof Schedule].slots.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>Horários:</strong>{' '}
                  {schedule[day.key as keyof Schedule].slots[0]} às{' '}
                  {schedule[day.key as keyof Schedule].slots[schedule[day.key as keyof Schedule].slots.length - 1]}
                  {' '}({schedule[day.key as keyof Schedule].slots.length} horários)
                </div>
              )}
            </div>
          ))}

          {/* Configurador de Horário */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">
              Configurar horários para: {daysOfWeek.find((d) => d.key === selectedDay)?.label}
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Horário de Início</Label>
                <Input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="time-input-red"
                />
              </div>

              <div className="space-y-2">
                <Label>Horário de Fim</Label>
                <Input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => setTempEndTime(e.target.value)}
                  className="time-input-red"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleAddTimeSlots} className="w-full">
                  Gerar Horários
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Serviços Disponíveis
          </CardTitle>
          <CardDescription>
            Selecione quais serviços poderão ser agendados online
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço ativo cadastrado</p>
          ) : (
            <div className="space-y-3">
              {availableServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={serviceIds.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <Label htmlFor={`service-${service.id}`} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {service.price.toFixed(2)} • {service.duration}min
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profissionais Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profissionais Disponíveis
          </CardTitle>
          <CardDescription>
            Selecione quais barbeiros estarão disponíveis para agendamento online
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableBarbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum barbeiro ativo cadastrado</p>
          ) : (
            <div className="space-y-3">
              {availableBarbers.map((barber) => (
                <div key={barber.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`barber-${barber.id}`}
                    checked={barberIds.includes(barber.id)}
                    onCheckedChange={() => handleBarberToggle(barber.id)}
                  />
                  <Label htmlFor={`barber-${barber.id}`} className="flex-1 cursor-pointer">
                    <p className="font-medium">{barber.name}</p>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de Salvar (fixo no rodapé) */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSave} disabled={saving} className="bg-gold text-white hover:bg-gold/90 shadow-lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
