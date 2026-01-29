'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckboxSimple as Checkbox } from '@/components/ui/checkbox-simple';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, Scissors, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  reason: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  servicesIncluded?: string;
  usageLimit?: number;
}

// Mapeamento de fotos dos barbeiros
const getBarberPhoto = (barberName: string): string | null => {
  const name = barberName.toLowerCase().trim();

  if (name.includes('jhon')) return '/barbers/jhonjhon.jpeg';
  if (name.includes('maikon') || name.includes('maykon')) return '/barbers/maykon.jpeg';
  if (name.includes('eduardo')) return '/barbers/eduardo.jpeg';

  return null;
};


export default function AgendamentoPage() {
  const [mounted, setMounted] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [maxDate, setMaxDate] = useState<string>('');

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    isSubscriber: false,
    serviceIds: [] as string[], // Modificado para array de IDs
    barberId: '',
    scheduledDate: '',
    scheduledTime: '',
    observations: '',
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mode, setMode] = useState<'booking' | 'subscription'>('booking');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [displayDate, setDisplayDate] = useState(''); // Data no formato dd/mm/aaaa para exibição
  const [calendarOpen, setCalendarOpen] = useState(false); // Controla abertura do calendário
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // Data selecionada no calendário
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    fetchBarbers();
    fetchPlans();
    calculateMaxDate();
    setMounted(true);
  }, []);

  // Auto-seleciona o primeiro barbeiro quando a lista carregar
  // Auto-seleciona o primeiro barbeiro quando a lista carregar
  // useEffect(() => {
  //   if (barbers.length > 0) {
  //     setFormData(prev => {
  //       if (!prev.barberId) {
  //         return { ...prev, barberId: barbers[0].id };
  //       }
  //       return prev;
  //     });
  //   }
  // }, [barbers]);

  const calculateMaxDate = () => {
    // Padrão: 30 dias no futuro (será atualizado pela API se houver configurações)
    const today = new Date();
    const maxDateCalc = new Date(today);
    maxDateCalc.setDate(maxDateCalc.getDate() + 30);
    setMaxDate(maxDateCalc.toISOString().split('T')[0]);
  };

  // Formatar data enquanto o usuário digita
  const handleDateChange = (value: string) => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');

    // Limita a 8 dígitos (ddmmaaaa)
    if (numbers.length > 8) {
      numbers = numbers.slice(0, 8);
    }

    // Formata conforme o usuário digita
    let formatted = '';
    if (numbers.length > 0) {
      formatted = numbers.slice(0, 2); // dd
      if (numbers.length >= 3) {
        formatted += '/' + numbers.slice(2, 4); // mm
      }
      if (numbers.length >= 5) {
        formatted += '/' + numbers.slice(4, 8); // aaaa
      }
    }

    setDisplayDate(formatted);

    // Se a data está completa (8 dígitos), valida e converte para ISO
    if (numbers.length === 8) {
      const day = parseInt(numbers.slice(0, 2));
      const month = parseInt(numbers.slice(2, 4));
      const year = parseInt(numbers.slice(4, 8));

      // Validação básica
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
        const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Valida se a data é válida
        const testDate = new Date(isoDate);
        if (!isNaN(testDate.getTime())) {
          setFormData(prev => ({ ...prev, scheduledDate: isoDate, scheduledTime: '' }));
          setSelectedDate(testDate);
        }
      }
    } else if (formatted.length === 0) {
      setFormData(prev => ({ ...prev, scheduledDate: '', scheduledTime: '' }));
      setSelectedDate(undefined);
    }
  };

  // Lidar com seleção de data no calendário
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const isoDate = format(date, 'yyyy-MM-dd');
      const brDate = format(date, 'dd/MM/yyyy', { locale: ptBR });
      setDisplayDate(brDate);
      setFormData(prev => ({ ...prev, scheduledDate: isoDate, scheduledTime: '' }));
      setCalendarOpen(false); // Fecha o calendário após seleção
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/public/services');
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/public/barbers');
      if (!response.ok) throw new Error('Erro ao carregar barbeiros');
      const data = await response.json();
      setBarbers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/public/subscription-plans');
      if (!response.ok) throw new Error('Erro ao carregar planos');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar planos de assinatura');
    }
  };

  const fetchAvailableSlots = useCallback(async (date: string, barberId?: string) => {
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams({ date });
      if (barberId) {
        params.append('barberId', barberId);
      }

      const response = await fetch(`/api/public/available-slots?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao carregar horários');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);

      // Limpar horário selecionado se não estiver mais disponível
      // (Verifica no estado atual, não na dependencia do useCallback para evitar loops)
      setFormData(prev => {
        if (prev.scheduledTime) {
          const selectedSlot = (data.slots || []).find((slot: TimeSlot) => slot.time === prev.scheduledTime);
          if (!selectedSlot || !selectedSlot.available) {
            return { ...prev, scheduledTime: '' };
          }
        }
        return prev;
      });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []); // Dependências vazias, pois usamos setStates funcionais

  // Buscar horários disponíveis quando a data for selecionada
  useEffect(() => {
    if (formData.scheduledDate) {
      fetchAvailableSlots(formData.scheduledDate, formData.barberId);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.scheduledDate, formData.barberId, fetchAvailableSlots]);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const currentIds = [...prev.serviceIds];
      const index = currentIds.indexOf(serviceId);

      if (index >= 0) {
        currentIds.splice(index, 1);
      } else {
        currentIds.push(serviceId);
      }

      return { ...prev, serviceIds: currentIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validações
      if (!formData.clientName || !formData.clientPhone || formData.serviceIds.length === 0 || !formData.scheduledDate || !formData.scheduledTime) {
        toast.error('Preencha todos os campos obrigatórios (incluindo pelo menos um serviço)');
        setSubmitting(false);
        return;
      }

      // Validar se o horário ainda está disponível
      const selectedSlot = availableSlots.find(slot => slot.time === formData.scheduledTime);
      if (!selectedSlot || !selectedSlot.available) {
        toast.error('Este horário não está mais disponível. Por favor, escolha outro horário.');
        setSubmitting(false);
        return;
      }

      // Combinar data e hora no formato ISO sem conversão de timezone
      const scheduledDateString = `${formData.scheduledDate}T${formData.scheduledTime}:00`;

      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          clientEmail: formData.clientEmail,
          isSubscriber: formData.isSubscriber,
          serviceIds: formData.serviceIds,
          barberId: formData.barberId || null,
          scheduledDate: scheduledDateString,
          observations: formData.observations,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        // Se for erro 409 (conflito de horário), recarregar horários disponíveis
        if (response.status === 409) {
          toast.error('Ops! Este horário acabou de ser reservado por outra pessoa. Por favor, escolha outro horário.');
          if (formData.scheduledDate) {
            await fetchAvailableSlots(formData.scheduledDate, formData.barberId);
          }
          setFormData(prev => ({ ...prev, scheduledTime: '' }));
          setSubmitting(false);
          return;
        }

        throw new Error(error.error || 'Erro ao criar agendamento');
      }

      setSuccess(true);
      toast.success('Agendamento realizado com sucesso!');

      // Reset completo do formulário
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        isSubscriber: false,
        serviceIds: [],
        barberId: '',
        scheduledDate: '',
        scheduledTime: '',
        observations: '',
      });
      setDisplayDate('');
      setSelectedDate(undefined);
      setAvailableSlots([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!selectedPlanId) {
        toast.error('Selecione um plano de assinatura');
        return;
      }

      if (!formData.clientName || !formData.clientPhone) {
        toast.error('Nome e telefone são obrigatórios');
        return;
      }

      const response = await fetch('/api/public/contract-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          clientEmail: formData.clientEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao contratar assinatura');
      }

      const data = await response.json();

      setSuccess(true);
      toast.success('Assinatura realizada com sucesso!');

      if (data.paymentLink) {
        setPaymentLink(data.paymentLink);
        // Redirecionar na mesma aba para evitar bloqueio de popup
        toast.info('Redirecionando para pagamento...');
        setTimeout(() => {
          window.location.href = data.paymentLink;
        }, 1500);
      }

      // Reset
      setFormData(prev => ({ ...prev, clientName: '', clientPhone: '', clientEmail: '' }));
      setSelectedPlanId('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedServicesTotal = services
    .filter(s => formData.serviceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const selectedServicesDuration = services
    .filter(s => formData.serviceIds.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0);

  // Só renderiza o conteúdo principal após a montagem no cliente para evitar erros de hidratação
  if (!mounted) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-gold mb-2">
                {mode === 'booking' ? 'Agendamento Confirmado!' : 'Assinatura Confirmada!'}
              </h2>
              <p className="text-muted-foreground">
                {mode === 'booking'
                  ? 'Seu agendamento foi realizado com sucesso. Em breve entraremos em contato para confirmar.'
                  : paymentLink
                    ? 'Sua assinatura foi iniciada! Clique no botão abaixo para finalizar o pagamento.'
                    : 'Sua assinatura foi realizada com sucesso! Aproveite seus benefícios.'}
              </p>
            </div>

            {paymentLink && mode === 'subscription' && (
              <Button
                onClick={() => window.open(paymentLink, '_blank')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg mb-4"
              >
                Finalizar Pagamento
              </Button>
            )}
            <Button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                  isSubscriber: false,
                  serviceIds: [],
                  barberId: '',
                  scheduledDate: '',
                  scheduledTime: '',
                  observations: '',
                });
                setDisplayDate('');
                setSelectedDate(undefined);
                setAvailableSlots([]);
                setAvailableSlots([]);
                setSelectedPlanId('');
                setPaymentLink(null);
              }}
              className="bg-gold text-white hover:bg-gold/90"
            >
              Fazer Novo Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="border-b border-gold/20 bg-black/80 backdrop-blur-md sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-14">
              <Image
                src="/logo.png"
                alt="Jhon Jhon Barbearia"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Título */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-gold drop-shadow-lg">
              Agende seu Horário
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Escolha os serviços, profissional e horário ideal para você
            </p>
          </div>

          {/* Formulário */}
          <Card className="bg-black/70 border-gold/30 backdrop-blur-sm shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-gold/10 to-transparent border-b border-gold/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-2xl md:text-3xl font-serif text-gold flex items-center gap-3">
                  {mode === 'booking' ? (
                    <>
                      <Scissors className="h-6 w-6" />
                      Dados do Agendamento
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-6 w-6" />
                      Contratar Plano
                    </>
                  )}
                </CardTitle>

                <div className="flex p-1 bg-gray-900 rounded-lg border border-gold/30">
                  <button
                    onClick={() => setMode('booking')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'booking'
                      ? 'bg-gold text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Agendar Horário
                  </button>
                  <button
                    onClick={() => setMode('subscription')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'subscription'
                      ? 'bg-gold text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Assinar Plano
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              {loading ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                    <p className="text-muted-foreground">Carregando informações...</p>
                  </div>
                </div>
              ) : services.length === 0 || barbers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {services.length === 0 && barbers.length === 0
                      ? 'No momento não há serviços ou profissionais disponíveis para agendamento online. Por favor, entre em contato conosco diretamente.'
                      : services.length === 0
                        ? 'No momento não há serviços disponíveis para agendamento online.'
                        : 'No momento não há profissionais disponíveis para agendamento online.'}
                  </AlertDescription>
                </Alert>
              ) : mode === 'booking' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Informações Pessoais */}
                  <div className="space-y-6 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 rounded-lg border border-gold/10">
                    <h3 className="text-xl font-semibold text-gold flex items-center gap-3">
                      <User className="h-6 w-6" />
                      Suas Informações
                    </h3>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="clientName" className="text-gray-300 font-medium">
                          Nome Completo *
                        </Label>
                        <Input
                          id="clientName"
                          value={formData.clientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                          placeholder="Digite seu nome"
                          required
                          className="bg-gray-900/70 border-gold/30 focus:border-gold text-white placeholder:text-gray-500 h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientPhone" className="text-gray-300 font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone (com DDD) *
                        </Label>
                        <Input
                          id="clientPhone"
                          value={formData.clientPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                          required
                          className="bg-gray-900/70 border-gold/30 focus:border-gold text-white placeholder:text-gray-500 h-12"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="clientEmail" className="text-gray-300 font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mail (opcional)
                        </Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={formData.clientEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                          placeholder="seu@email.com"
                          className="bg-gray-900/70 border-gold/30 focus:border-gold text-white placeholder:text-gray-500 h-12"
                        />
                      </div>

                      <div className="md:col-span-2 mt-2">
                        <div className="flex items-start space-x-3 p-4 rounded-lg bg-gold/5 border border-gold/20 hover:bg-gold/10 transition-colors">
                          <Checkbox
                            id="isSubscriber"
                            checked={formData.isSubscriber}
                            onCheckedChange={(checked) =>
                              setFormData(prev => ({ ...prev, isSubscriber: checked === true }))
                            }
                            className="mt-1 border-gold/40 data-[state=checked]:bg-gold data-[state=checked]:border-gold h-5 w-5"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="isSubscriber"
                              className="text-base font-medium text-gray-200 cursor-pointer block mb-1"
                            >
                              ✨ Sou assinante da Jhon Jhon Barbearia
                            </Label>
                            <p className="text-sm text-gray-400">
                              Assinantes têm prioridade no agendamento e descontos exclusivos
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Serviços */}
                  <div className="space-y-6 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 rounded-lg border border-gold/10">
                    <h3 className="text-xl font-semibold text-gold flex items-center gap-3">
                      <Scissors className="h-6 w-6" />
                      Serviços Desejados
                    </h3>

                    <div className="space-y-4">
                      <Label className="text-gray-300 font-medium">Escolha os Serviços *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className={`
                              flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all
                              ${formData.serviceIds.includes(service.id)
                                ? 'bg-gold/20 border-gold/60'
                                : 'bg-gray-900/70 border-gold/20 hover:bg-gold/10'}
                            `}
                            onClick={() => handleServiceToggle(service.id)}
                          >
                            <Checkbox
                              checked={formData.serviceIds.includes(service.id)}
                              onCheckedChange={() => handleServiceToggle(service.id)}
                              className="mt-1 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className={`font-medium ${formData.serviceIds.includes(service.id) ? 'text-white' : 'text-gray-300'}`}>
                                  {service.name}
                                </span>
                                <span className="text-gold font-bold">R$ {service.price.toFixed(2)}</span>
                              </div>
                              <p className="text-sm text-gray-500">{service.duration} min</p>
                              {service.description && (
                                <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumo da seleção */}
                      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gold/20 flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-400">Selecionados:</p>
                          <p className="text-white font-medium">{formData.serviceIds.length} serviço(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Duração estimada:</p>
                          <p className="text-white font-medium">{selectedServicesDuration} min</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Total estimado:</p>
                          <p className="text-gold font-bold text-xl">R$ {selectedServicesTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-gray-300 font-medium text-lg">Escolha seu Profissional *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {/* Cards dos barbeiros */}
                        {barbers.map((barber) => {
                          const photo = getBarberPhoto(barber.name);
                          const isSelected = formData.barberId === barber.id;

                          return (
                            <div
                              key={barber.id}
                              className={`
                                relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden group
                                ${isSelected
                                  ? 'border-gold shadow-lg shadow-gold/20'
                                  : 'border-gray-700 hover:border-gold/50'}
                              `}
                              onClick={() => setFormData(prev => ({ ...prev, barberId: barber.id }))}
                            >
                              <div className="aspect-square relative overflow-hidden">
                                {photo ? (
                                  <Image
                                    src={photo}
                                    alt={barber.name}
                                    fill
                                    className={`object-cover transition-all duration-300 ${isSelected ? 'grayscale-0 scale-105' : 'grayscale hover:grayscale-0'
                                      }`}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gold/20 to-gray-800 flex items-center justify-center">
                                    <User className="h-16 w-16 text-gold" />
                                  </div>
                                )}
                              </div>
                              <div className={`p-3 text-center ${isSelected ? 'bg-gold/20' : 'bg-gray-900/90'}`}>
                                <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                  {barber.name}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="absolute top-3 right-3 bg-gold rounded-full p-1">
                                  <CheckCircle2 className="h-5 w-5 text-black" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Data e Hora */}
                  <div className="space-y-6 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 rounded-lg border border-gold/10">
                    <h3 className="text-xl font-semibold text-gold flex items-center gap-3">
                      <CalendarIcon className="h-6 w-6" />
                      Data e Horário
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Escolha a Data *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="scheduledDate"
                            type="text"
                            value={displayDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            placeholder="dd/mm/aaaa"
                            maxLength={10}
                            required
                            className="bg-gray-900/50 border-gold/20 flex-1"
                          />
                          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-gray-900/50 border-gold/20 hover:bg-gold/20 px-4"
                              >
                                <CalendarIcon className="h-5 w-5 text-gold" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-gray-900 border-gold/20" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleCalendarSelect}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const dateToCheck = new Date(date);
                                  dateToCheck.setHours(0, 0, 0, 0);
                                  // Permite agendamentos de hoje até 60 dias no futuro
                                  const max = new Date(today);
                                  max.setDate(max.getDate() + 60);
                                  return dateToCheck < today || dateToCheck > max;
                                }}
                                initialFocus
                                locale={ptBR}
                                className="rounded-md"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Clique no ícone do calendário ou digite a data no formato dd/mm/aaaa
                        </p>
                      </div>

                      {formData.scheduledDate && (
                        <div className="space-y-2">
                          <Label>Horários Disponíveis *</Label>
                          {loadingSlots ? (
                            <div className="flex items-center gap-2 p-4 bg-gray-900/50 border border-gold/20 rounded-md">
                              <Loader2 className="h-4 w-4 animate-spin text-gold" />
                              <span className="text-sm text-muted-foreground">Carregando horários...</span>
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Não há horários disponíveis para esta data. Por favor, escolha outra data.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                              {availableSlots.map((slot) => (
                                <Button
                                  key={slot.time}
                                  type="button"
                                  variant={formData.scheduledTime === slot.time ? 'default' : 'outline'}
                                  disabled={!slot.available}
                                  className={
                                    formData.scheduledTime === slot.time
                                      ? 'bg-gold text-white hover:bg-gold/90'
                                      : !slot.available
                                        ? 'bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-900/30 cursor-not-allowed opacity-70'
                                        : 'bg-gray-900/50 border-gold/20 hover:bg-gold/20'
                                  }
                                  onClick={() => slot.available && setFormData(prev => ({ ...prev, scheduledTime: slot.time }))}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {slot.time}
                                </Button>
                              ))}
                            </div>
                          )}
                          {availableSlots.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {availableSlots.filter(s => s.available).length} horário(s) disponível(is) de {availableSlots.length}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações (opcional)</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      placeholder="Alguma preferência ou observação especial?"
                      rows={3}
                      className="bg-gray-900/50 border-gold/20"
                    />
                  </div>

                  {/* Botão de Envio */}
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={submitting || !formData.scheduledTime || loadingSlots}
                      className="w-full bg-gold text-white hover:bg-gold/90 h-12 text-lg disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </Button>

                    <p className="text-sm text-center text-muted-foreground">
                      * Campos obrigatórios
                    </p>

                    {!formData.scheduledTime && formData.scheduledDate && (
                      <p className="text-sm text-center text-amber-500">
                        Selecione um horário para continuar
                      </p>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubscriptionSubmit} className="space-y-6">
                  {/* Seleção de Plano */}
                  <div className="space-y-6 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 rounded-lg border border-gold/10">
                    <h3 className="text-xl font-semibold text-gold flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6" />
                      Escolha seu Plano
                    </h3>

                    <div className="space-y-4">
                      {plans.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum plano disponível no momento.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid gap-4">
                          {plans.map((plan) => (
                            <div
                              key={plan.id}
                              className={`
                                relative p-4 rounded-lg border cursor-pointer transition-all
                                ${selectedPlanId === plan.id
                                  ? 'bg-gold/20 border-gold/60 ring-1 ring-gold/40'
                                  : 'bg-gray-900/70 border-gold/20 hover:bg-gold/10'}
                              `}
                              onClick={() => setSelectedPlanId(plan.id)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-lg text-white">{plan.name}</h4>
                                  <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                                  {plan.servicesIncluded && (
                                    <p className="text-xs text-gold/80 mt-2 font-medium">
                                      Inclui: {plan.servicesIncluded}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-gold">
                                    R$ {plan.price.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    /{plan.durationDays} dias
                                  </p>
                                </div>
                              </div>
                              {selectedPlanId === plan.id && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle2 className="h-5 w-5 text-gold" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações Pessoais */}
                  <div className="space-y-6 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 rounded-lg border border-gold/10">
                    <h3 className="text-xl font-semibold text-gold flex items-center gap-3">
                      <User className="h-6 w-6" />
                      Seus Dados
                    </h3>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="subClientName" className="text-gray-300 font-medium">
                          Nome Completo *
                        </Label>
                        <Input
                          id="subClientName"
                          value={formData.clientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                          placeholder="Digite seu nome"
                          required
                          className="bg-gray-900/50 border-gold/20 focus:border-gold text-white placeholder:text-gray-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subClientPhone" className="text-gray-300 font-medium">
                          WhatsApp *
                        </Label>
                        <Input
                          id="subClientPhone"
                          value={formData.clientPhone}
                          onChange={(e) => {
                            // Mascara simples de telefone
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.slice(0, 11);
                            if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                            if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
                            setFormData(prev => ({ ...prev, clientPhone: v }));
                          }}
                          placeholder="(00) 00000-0000"
                          required
                          className="bg-gray-900/50 border-gold/20 focus:border-gold text-white placeholder:text-gray-600"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="subClientEmail" className="text-gray-300 font-medium">
                          Email (opcional)
                        </Label>
                        <Input
                          id="subClientEmail"
                          type="email"
                          value={formData.clientEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                          placeholder="seu@email.com"
                          className="bg-gray-900/50 border-gold/20 focus:border-gold text-white placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <Button
                    type="submit"
                    disabled={submitting || !selectedPlanId}
                    className="w-full bg-gold text-white hover:bg-gold/90 h-12 text-lg disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Contratar Assinatura'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gold/20 bg-black/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Jhon Jhon Barbearia. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
