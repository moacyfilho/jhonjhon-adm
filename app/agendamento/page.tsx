'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, Scissors, CheckCircle2, Loader2, AlertCircle, ChevronRight, MapPin, Instagram } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// Custom Components
import { ServiceCardSelection } from './components/service-selection';
import { BarberSelection } from './components/barber-selection';
import { PlanSelection } from './components/plan-selection'; // Added PlanSelection

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

interface Plan {
  id: string;
  name: string;
  price: number;
  paymentLink?: string | null;
  servicesIncluded?: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
  reason: string;
}

const steps = [
  { id: 'service', name: 'Serviço & Barbeiro' },
  { id: 'datetime', name: 'Data & Hora' },
  { id: 'details', name: 'Seus Dados' }
];

// Mapeamento de fotos dos barbeiros
const getBarberPhoto = (barberName: string): string | null => {
  const name = barberName.toLowerCase().trim();
  if (name.includes('jhon')) return '/barbers/jhonjhon.jpeg';
  if (name.includes('maikon') || name.includes('maykon')) return '/barbers/maykon.jpeg';
  if (name.includes('eduardo')) return '/barbers/eduardo.jpeg';
  return null;
};

export default function AgendamentoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); // Added plans state
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    isSubscriber: false,
    serviceId: '',
    barberId: '',
    scheduledDate: '',
    scheduledTime: '',
    observations: '',
  });

  const [displayDate, setDisplayDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchPlans(), fetchBarbers(), fetchSettings()]); // Fetch plans
      setLoading(false);
    };
    init();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/public/booking-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    if (formData.scheduledDate) {
      fetchAvailableSlots(formData.scheduledDate, formData.barberId);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.scheduledDate, formData.barberId]);

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

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/public/plans');
      if (!response.ok) throw new Error('Erro ao carregar planos');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error(error);
      // Optional: don't block if plans fail
    }
  };

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/public/barbers');
      if (!response.ok) throw new Error('Erro ao carregar barbeiros');
      const data = await response.json();
      setBarbers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar barbeiros');
    }
  };

  const fetchAvailableSlots = async (date: string, barberId?: string) => {
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams({ date });
      if (barberId) params.append('barberId', barberId);

      const response = await fetch(`/api/public/available-slots?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar horários');
      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const isoDate = format(date, 'yyyy-MM-dd');
      setDisplayDate(format(date, 'dd/MM/yyyy', { locale: ptBR }));
      setFormData({ ...formData, scheduledDate: isoDate, scheduledTime: '' });
      setCalendarOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const scheduledDateString = `${formData.scheduledDate}T${formData.scheduledTime}:00`;
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, scheduledDate: scheduledDateString }),
      });

      if (!response.ok) throw new Error('Erro ao criar agendamento');
      setSuccess(true);
      toast.success('Agendamento confirmado!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-panel max-w-lg w-full rounded-3xl p-12 text-center shadow-gold animate-in zoom-in duration-500">
          <div className="mx-auto w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-white mb-4">
            Horário <span className="text-gold-500">Garantido!</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Seu agendamento na <span className="text-white font-medium">Jhon Jhon Barbearia</span> foi concluído com sucesso. Te esperamos em breve para transformar seu visual.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-gold-gradient text-black font-bold h-14 rounded-2xl text-lg hover:scale-[1.02] transition-transform"
          >
            Fazer Novo Agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-gold-500 selection:text-black">
      {/* Premium Header */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative w-36 h-12">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <div className="hidden md:block h-8 w-px bg-white/10" />
            <div className="hidden md:flex items-center gap-2 text-gold-500/80 uppercase tracking-widest text-[10px] font-bold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Agendamento Online Ativo
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center gap-2 transition-all duration-500",
                  currentStep === idx ? "text-gold-500" : (currentStep > idx ? "text-white/60" : "text-white/20")
                )}>
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                    currentStep === idx ? "border-gold-500 bg-gold-500 text-black shadow-gold" : "border-current"
                  )}>
                    {idx + 1}
                  </span>
                  <span className="hidden sm:block text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 md:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* Left Content: Form Section */}
            <div className="lg:col-span-8 space-y-12">

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-2 border-gold-500/20 rounded-full" />
                    <div className="w-20 h-20 border-2 border-transparent border-t-gold-500 rounded-full animate-spin absolute inset-0" />
                    <Scissors className="w-8 h-8 text-gold-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-gold-500 font-serif italic text-xl">Preparando a cadeira para você...</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">

                  {/* Step 0: Service & Barber */}
                  {currentStep === 0 && (
                    <div className="space-y-16">
                      <section className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">Qual o <span className="text-gold-500">serviço</span> de hoje?</h2>
                          <p className="text-gray-500 text-lg">Selecione uma das opções abaixo para começar.</p>
                        </div>
                        <ServiceCardSelection
                          services={services}
                          selectedId={formData.serviceId}
                          onSelect={(id) => setFormData({ ...formData, serviceId: id })}
                        />

                        {/* Subscription Plans Section */}
                        {plans.length > 0 && (
                          <div className="pt-8 border-t border-white/5">
                            <PlanSelection plans={plans} />
                          </div>
                        )}
                      </section>

                      <section className={cn("space-y-8 transition-opacity duration-500", !formData.serviceId && "opacity-20 pointer-events-none")}>
                        <div className="space-y-2">
                          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">Com quem será a <span className="text-gold-500">experiência</span>?</h2>
                          <p className="text-gray-500 text-lg">Nossos profissionais estão prontos para te atender.</p>
                        </div>
                        <BarberSelection
                          barbers={barbers}
                          selectedId={formData.barberId}
                          onSelect={(id) => setFormData({ ...formData, barberId: id, scheduledTime: '' })}
                          getBarberPhoto={getBarberPhoto}
                        />
                      </section>
                    </div>
                  )}

                  {/* Step 1: Date & Time */}
                  {currentStep === 1 && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-right-6 duration-700">
                      <section className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">Quando devemos te <span className="text-gold-500">esperar</span>?</h2>
                          <p className="text-gray-500 text-lg">Selecione o melhor dia e horário na agenda real.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Calendar Card */}
                          <div className="glass-panel p-8 rounded-3xl border-white/10">
                            <Label className="text-gray-400 uppercase tracking-widest text-[10px] font-black mb-6 block">Selecione o Dia</Label>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleCalendarSelect}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const advanceDays = settings?.advanceBookingDays || 30;
                                const max = new Date();
                                max.setDate(max.getDate() + advanceDays);

                                if (date < today || date > max) return true;

                                if (settings?.schedule) {
                                  const dayMap: any = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
                                  const dayKey = dayMap[date.getDay()];
                                  return !settings.schedule[dayKey]?.enabled;
                                }

                                return date.getDay() === 0;
                              }}
                              locale={ptBR}
                              className="w-full bg-transparent"
                            />
                          </div>

                          {/* Time Slots Card */}
                          <div className={cn("glass-panel p-8 rounded-3xl border-white/10 transition-opacity", !formData.scheduledDate && "opacity-20")}>
                            <Label className="text-gray-400 uppercase tracking-widest text-[10px] font-black mb-6 block">Horários Disponíveis</Label>

                            {loadingSlots ? (
                              <div className="space-y-4">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                              </div>
                            ) : availableSlots.length > 0 ? (
                              <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                                {availableSlots.map((slot) => (
                                  <button
                                    key={slot.time}
                                    disabled={!slot.available}
                                    onClick={() => setFormData({ ...formData, scheduledTime: slot.time })}
                                    className={cn(
                                      "h-12 rounded-xl flex items-center justify-center gap-2 border transition-all text-sm font-bold",
                                      formData.scheduledTime === slot.time
                                        ? "bg-gold-500 border-gold-500 text-black shadow-gold"
                                        : (slot.available
                                          ? "bg-white/5 border-white/10 text-white hover:border-gold-500/50 hover:bg-gold-500/5"
                                          : "opacity-20 border-white/5 text-gray-600 line-through")
                                    )}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {slot.time}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-20 text-center space-y-4">
                                <AlertCircle className="w-10 h-10 text-gray-700 mx-auto" />
                                <p className="text-gray-500 italic">Selecione uma data para ver os horários.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* Step 2: Final Details */}
                  {currentStep === 2 && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-right-6 duration-700">
                      <section className="space-y-10">
                        <div className="space-y-2">
                          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">Prepare seu <span className="text-gold-500">perfil</span></h2>
                          <p className="text-gray-500 text-lg">Só precisamos de alguns dados para finalizar seu VIP.</p>
                        </div>

                        <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label htmlFor="name" className="text-gray-400 px-1 font-bold">Seu Nome *</Label>
                            <Input
                              id="name"
                              value={formData.clientName}
                              onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                              className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-gold-500 focus:border-gold-500"
                              placeholder="Como quer ser chamado?"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="phone" className="text-gray-400 px-1 font-bold">Telefone (WhatsApp) *</Label>
                            <Input
                              id="phone"
                              value={formData.clientPhone}
                              onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                              className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-gold-500 focus:border-gold-500"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-3">
                            <Label htmlFor="obs" className="text-gray-400 px-1 font-bold">Observações (opcional)</Label>
                            <Textarea
                              id="obs"
                              value={formData.observations}
                              onChange={e => setFormData({ ...formData, observations: e.target.value })}
                              className="bg-white/5 border-white/10 rounded-2xl focus:ring-gold-500 focus:border-gold-500 min-h-[120px]"
                              placeholder="Alguma restrição ou pedido especial?"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label
                              htmlFor="sub"
                              className="glass-panel p-6 rounded-2xl border-white/5 flex items-center gap-4 hover:border-gold-500/20 transition-colors cursor-pointer group"
                            >
                              <Checkbox
                                id="sub"
                                checked={formData.isSubscriber}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSubscriber: checked === true }))}
                                className="w-6 h-6 rounded-lg border-white/20 data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
                              />
                              <div className="flex-1">
                                <span className="text-lg font-serif font-bold text-white group-hover:text-gold-500 transition-colors cursor-pointer">Plano Jhon Club VIP</span>
                                <p className="text-xs text-gray-500">Ative se você já possui uma assinatura ativa conosco.</p>
                              </div>
                            </label>
                          </div>
                        </form>
                      </section>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="mt-20 pt-10 border-t border-white/5 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="text-white hover:bg-white/5 h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-xs disabled:opacity-0"
                    >
                      Voltar
                    </Button>

                    {currentStep < steps.length - 1 ? (
                      <Button
                        disabled={
                          (currentStep === 0 && (!formData.serviceId || !formData.barberId)) ||
                          (currentStep === 1 && (!formData.scheduledDate || !formData.scheduledTime))
                        }
                        onClick={nextStep}
                        className="bg-gold-gradient text-black font-black h-14 px-12 rounded-2xl text-sm hover:scale-[1.02] shadow-gold transition-all"
                      >
                        Próximo <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        disabled={submitting || !formData.clientName || !formData.clientPhone}
                        onClick={handleSubmit}
                        className="bg-gold-gradient text-black font-black h-14 px-12 rounded-2xl text-sm hover:scale-[1.02] shadow-gold transition-all"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Experiência"}
                      </Button>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Right Sidebar: Review & Map */}
            <div className="lg:col-span-4 space-y-8">
              <Card className="glass-panel border-white/10 rounded-3xl overflow-hidden sticky top-32 shadow-2xl">
                <div className="bg-gold-gradient p-8 text-black">
                  <h3 className="text-2xl font-serif font-black uppercase italic tracking-tighter leading-none">Resumo do VIP</h3>
                </div>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                        <Scissors className="w-5 h-5 text-gold-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest leading-none mb-1">Serviço</p>
                        <p className="text-white font-bold">{services.find(s => s.id === formData.serviceId)?.name || 'A definir'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                        <User className="w-5 h-5 text-gold-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest leading-none mb-1">Barbeiro</p>
                        <p className="text-white font-bold">{barbers.find(b => b.id === formData.barberId)?.name || 'A definir'}</p>
                      </div>
                    </div>

                    {(formData.scheduledDate || formData.scheduledTime) && (
                      <div className="flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <CalendarIcon className="w-5 h-5 text-gold-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-black text-white/30 tracking-widest leading-none mb-1">Horário</p>
                          <p className="text-white font-bold">
                            {displayDate} {formData.scheduledTime ? `às ${formData.scheduledTime}` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <p className="text-gray-400 font-medium">Investimento</p>
                      <p className="text-3xl font-serif font-black text-white tracking-tighter">
                        R$ {services.find(s => s.id === formData.serviceId)?.price.toFixed(2) || '0,00'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      <MapPin className="w-3 h-3 text-gold-500" /> Localização
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">Rua Jeronimo Ribeiro, 58 - São Raimundo<br />CEP 69.027-100 Manaus - AM</p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Link */}
              <div className="flex justify-center gap-6">
                <a href="#" className="p-4 rounded-xl glass-panel text-white/40 hover:text-gold-500 hover:border-gold-500/20 transition-all">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-16">
        <div className="container mx-auto px-6">
          <div className="flex justify-center mb-8">
            <a
              href="https://wa.me/5592985950190"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/60 hover:text-green-500 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">WhatsApp: (92) 98595-0190</span>
            </a>
          </div>
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-24 h-8 opacity-40 grayscale">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.3em] text-center leading-loose">
              © {new Date().getFullYear()} Jhon Jhon Barbearia<br />
              High Standards for High Gentlemen
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
