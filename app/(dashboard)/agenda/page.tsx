'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { format, addDays, startOfWeek, addWeeks, subWeeks, parse, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Filter, Search, Clock, User, DollarSign, Phone, CheckCircle, XCircle, Edit, Trash2, Globe, ShoppingCart, Plus, Minus, Award, Ban, QrCode, Copy } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AppointmentEditDialog } from '@/components/appointment-edit-dialog';
import { toManausTime, getManausTimeString, getManausDateString } from '@/lib/timezone';
import { CardGridSkeleton } from '@/components/ui/table-skeleton';
import { cn, isServiceIncluded } from '@/lib/utils';

interface Barber {
  id: string;
  name: string;
  commissionRate: number;
  hourlyRate?: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  isSubscriber?: boolean;
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
  products?: Array<{
    product: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    unitPrice: number;
  }>;
  isOnlineBooking?: boolean;
}

interface ScheduleBlock {
  id: string;
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  barber?: {
    name: string;
  };
}

// Cores para cada barbeiro (paleta harmônica)
const BARBER_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-500' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-500' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-900', badge: 'bg-green-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900', badge: 'bg-pink-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-900', badge: 'bg-cyan-500' },
];

// Mapeamento de fotos dos barbeiros
const getBarberPhoto = (barberName: string): string | null => {
  const name = barberName.toLowerCase().trim();

  if (name.includes('jhon')) return '/barbers/jhonjhon.jpeg';
  if (name.includes('maikon') || name.includes('maykon')) return '/barbers/maykon.jpeg';
  if (name.includes('eduardo')) return '/barbers/eduardo.jpeg';

  return null;
};

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00'
];

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Componente: Dialog de Finalização de Atendimento com Venda de Produtos
function CompletionDialog({
  appointment,
  products,
  selectedProducts,
  onAddProduct,
  onRemoveProduct,
  onUpdateQuantity,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  onComplete,
  onClose,
}: {
  appointment: Appointment;
  products: any[];
  selectedProducts: Array<{ productId: string; quantity: number; unitPrice: number }>;
  onAddProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const servicesTotal = appointment.totalAmount;
  const productsTotal = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
  const grandTotal = servicesTotal + productsTotal;

  let commissionAmount = 0;
  if (appointment.client.isSubscriber && appointment.barber.hourlyRate) {
    // Calculando horas trabalhadas baseado nos serviços originais
    const totalMinutes = appointment.services.reduce((sum, s) => sum + s.service.duration, 0);
    const workedHours = totalMinutes / 60;
    commissionAmount = workedHours * (appointment.barber.hourlyRate || 0);
  } else {
    commissionAmount = grandTotal * (appointment.barber.commissionRate / 100);
  }

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              Finalizar Atendimento
            </div>
          </DialogTitle>
          <DialogDescription>
            Confirme os detalhes e registre a finalização do serviço.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-8">
          {/* Resumo do Atendimento */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-gold-500" />
              Resumo do Atendimento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-medium">Cliente</span>
                <p className="text-white font-bold text-lg">{appointment.client.name}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-xs text-gray-500 font-medium">Barbeiro</span>
                <p className="text-white font-bold text-lg">{appointment.barber.name}</p>
                <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest">{appointment.barber.commissionRate}% de comissão</p>
              </div>
              <div className="md:col-span-2 pt-4 border-t border-white/5">
                <span className="text-xs text-gray-500 font-medium block mb-2">Serviços Executados</span>
                <div className="space-y-2">
                  {appointment.services.map((s) => (
                    <div key={s.service.id} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl">
                      <span className="text-sm text-gray-300">{s.service.name}</span>
                      <span className="font-serif font-bold text-gold-500">{formatCurrency(s.service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Adicionar Produtos */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gold-500" />
              Produtos Adicionais
            </h3>

            <Select onValueChange={onAddProduct}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl h-14">
                <SelectValue placeholder="Selecione um produto para adicionar" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter(p => !selectedProducts.find(sp => sp.productId === p.id))
                  .map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedProducts.length > 0 && (
              <div className="space-y-3">
                {selectedProducts.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center border border-gold-500/20">
                      <Award className="w-6 h-6 text-gold-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">{getProductName(item.productId)}</p>
                      <p className="text-xs text-gold-500 font-medium">
                        {formatCurrency(item.unitPrice)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400"
                          onClick={() => onUpdateQuantity(item.productId, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-10 text-center font-bold text-white text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400"
                          onClick={() => onUpdateQuantity(item.productId, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-10 h-10 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500"
                        onClick={() => onRemoveProduct(item.productId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gold-500" />
                Pagamento
              </h3>
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl h-14">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="DEBIT">Débito</SelectItem>
                  <SelectItem value="CREDIT">Crédito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="PENDING">A Definir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold flex items-center gap-2">
                <Edit className="w-4 h-4 text-gold-500" />
                Observações
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Observações do atendimento..."
                rows={1}
                className="bg-white/5 border-white/10 text-white rounded-2xl focus:ring-gold-500/50 focus:border-gold-500 resize-none h-14 py-4"
              />
            </div>
          </div>

          {/* Resumo Financeiro Final */}
          <div className="bg-gold-500/10 border border-gold-500/20 p-8 rounded-[2rem] space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-medium">Subtotal Serviços:</span>
              <span className="text-white font-bold">{formatCurrency(servicesTotal)}</span>
            </div>
            {selectedProducts.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Subtotal Produtos:</span>
                <span className="text-white font-bold">{formatCurrency(productsTotal)}</span>
              </div>
            )}
            <div className="pt-4 border-t border-gold-500/20 flex justify-between items-end">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold-500/60 font-black block mb-1">Total Geral</span>
                <span className="text-4xl font-serif font-bold text-gold-500 leading-none">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-[0.2em] text-green-500/60 font-black block mb-1">Comissão Barbeiro</span>
                <span className="text-xl font-bold text-green-500 leading-none">{formatCurrency(commissionAmount)}</span>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl h-14 px-8 font-bold border-white/10 text-white hover:bg-white/5">
            Cancelar
          </Button>
          <Button
            onClick={onComplete}
            className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold h-14 px-10 rounded-xl transition-all shadow-gold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Finalizar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  // Visualização
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarber, setFilterBarber] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Drag & Drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);

  // Dialogs
  const [detailsDialog, setDetailsDialog] = useState<Appointment | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [completionDialog, setCompletionDialog] = useState<Appointment | null>(null);
  const [editDialog, setEditDialog] = useState<{ appointment?: Appointment; isNew?: boolean; date?: string; barberId?: string } | null>(null);

  // Bloqueios de horário
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [blockDialog, setBlockDialog] = useState<{ date?: string; barberId?: string } | null>(null);
  const [blockForm, setBlockForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    reason: '',
  });

  // Completion modal states
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState('PENDING');
  const [completionNotes, setCompletionNotes] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, [currentDate, viewMode]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?showInactive=false');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.filter((p: any) => p.isActive && p.stock > 0));
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar barbeiros
      const barbersRes = await fetch('/api/barbers');
      const barbersData = await barbersRes.json();
      setBarbers(Array.isArray(barbersData) ? barbersData : []);

      // Buscar agendamentos
      const startDate = viewMode === 'day'
        ? format(startOfDay(currentDate), 'yyyy-MM-dd')
        : format(startOfWeek(currentDate, { locale: ptBR }), 'yyyy-MM-dd');

      const endDate = viewMode === 'day'
        ? format(startOfDay(currentDate), 'yyyy-MM-dd')
        : format(addDays(startOfWeek(currentDate, { locale: ptBR }), 6), 'yyyy-MM-dd');

      // Buscar agendamentos do sistema administrativo
      const appointmentsRes = await fetch(
        `/api/appointments?startDate=${startDate}&endDate=${endDate}`
      );
      const appointmentsData = await appointmentsRes.json();

      // Buscar agendamentos online (da página pública)
      const onlineBookingsRes = await fetch(
        `/api/online-bookings?startDate=${startDate}&endDate=${endDate}`
      );
      const onlineBookingsData = await onlineBookingsRes.json();

      // Buscar assinaturas ativas para calcular comissões e preços
      const subscriptionsRes = await fetch('/api/subscriptions?status=ACTIVE');
      const subscriptionsData = await subscriptionsRes.json();
      const activeSubscriptionsMap = new Map(subscriptionsData.map((sub: any) => [sub.clientId, sub]));
      const activeSubscriberIds = new Set(subscriptionsData.map((sub: any) => sub.clientId));

      // Converter OnlineBookings para o formato de Appointment para exibição
      const convertedOnlineBookings = onlineBookingsData
        .filter((booking: any) => booking.barber) // Apenas bookings com barbeiro atribuído
        .map((booking: any) => {
          const barber = booking.barber;
          const service = booking.service;
          const clientId = booking.clientId || 'temp';
          const subscription = activeSubscriptionsMap.get(clientId);

          // Se encontrou assinatura ativa ou o booking foi marcado explicitamente como assinante
          const isSubscriber = !!subscription || booking.isSubscriber;

          // Calcular preço (0 se incluído na assinatura OU se marcado como assinante e o serviço for elegível)
          // Se não tiver detalhes da assinatura (ex: cliente não cadastrado mas marcado como assinante),
          // assumimos que o serviço principal é o coberto (Corte) se o nome bater, ou zeramos por confiança?
          // Melhor tentar inferir se é "Corte" ou similar.
          let price = service?.price || 0;

          if (isSubscriber) {
            if (subscription) {
              // Tem assinatura real, valida o serviço
              if (service && isServiceIncluded((subscription as any).servicesIncluded, service.name, service.id)) {
                price = 0;
              }
            } else if (booking.isSubscriber) {
              // Foi marcado como assinante manualmente (sem vínculo de cliente).
              // Assumimos que o serviço agendado é o coberto se contiver "Corte" ou se for o serviço principal
              // Para evitar erros, vamos zerar se o nome do servico parecer elegivel
              if (service && (service.name.toLowerCase().includes('corte') || service.name.toLowerCase().includes('barba'))) {
                price = 0;
              }
            }
          }

          // Calcular comissão
          let commissionAmount = 0;
          if (service) {
            if (isSubscriber && barber.hourlyRate) {
              // Cliente assinante: usa taxa horária
              const workedHours = service.duration / 60;
              commissionAmount = barber.hourlyRate * workedHours;
            } else {
              // Cliente normal: usa percentual sobre o valor do serviço
              commissionAmount = (price * (barber.commissionRate / 100));
            }
          }

          return {
            id: `online-${booking.id}`,
            clientId: clientId,
            barberId: booking.barberId,
            date: booking.scheduledDate,
            totalAmount: price,
            commissionAmount: commissionAmount,
            paymentMethod: 'A definir',
            notes: booking.observations,
            status: booking.status === 'CONFIRMED' ? 'SCHEDULED' : booking.status,
            client: {
              id: clientId,
              name: booking.clientName,
              phone: booking.clientPhone,
              isSubscriber: isSubscriber,
            },
            barber: barber,
            services: [{
              service: service,
            }],
            isOnlineBooking: true, // Flag para identificar agendamentos online
          };
        });

      // Combinar ambos os tipos de agendamento e verificar assinantes para os agendamentos normais
      const enhancedAppointments = appointmentsData.map((appt: any) => ({
        ...appt,
        commissionAmount: appt.commission?.amount || appt.commissionAmount || 0,
        client: {
          ...appt.client,
          isSubscriber: activeSubscriberIds.has(appt.client.id)
        }
      }));

      const allAppointments = [...enhancedAppointments, ...convertedOnlineBookings];
      setAppointments(allAppointments);

      // Buscar bloqueios de horário
      await fetchScheduleBlocks(startDate, endDate);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleBlocks = async (startDate: string, endDate: string) => {
    try {
      const res = await fetch(`/api/schedule-blocks?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const blocks = await res.json();
        setScheduleBlocks(blocks);
      }
    } catch (error) {
      console.error('Erro ao buscar bloqueios:', error);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    const appointment = appointments.find(a => a.id === event.active.id);
    setDraggedAppointment(appointment || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedAppointment(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const dropData = over.id as string;
    const [targetDate, targetTime, targetBarberId] = dropData.split('|');

    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      // Bloquear reagendamento de agendamentos online
      if (appointment.isOnlineBooking) {
        toast.error('Agendamentos online não podem ser reagendados por drag & drop. Use a página de Agendamentos Online.');
        return;
      }

      // Validar conflito com Bloqueios (ScheduleBlocks)
      const durationMatches = appointment.services.reduce((acc, s) => acc + s.service.duration, 0);
      const appointmentDuration = durationMatches || 30; // Fallback 30min

      const droppedDateTime = parse(`${targetDate} ${targetTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const droppedEndTime = new Date(droppedDateTime.getTime() + appointmentDuration * 60000);

      const hasBlockConflict = scheduleBlocks.some(block => {
        if (block.barberId !== targetBarberId) return false;

        // Verificar data
        const blockDateStr = format(new Date(block.date), 'yyyy-MM-dd');
        if (blockDateStr !== targetDate) return false;

        // Verificar horários
        const [startH, startM] = block.startTime.split(':').map(Number);
        const [endH, endM] = block.endTime.split(':').map(Number);

        const blockStart = parse(`${targetDate} ${block.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
        const blockEnd = parse(`${targetDate} ${block.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

        // (StartA < EndB) && (EndA > StartB)
        return droppedDateTime < blockEnd && droppedEndTime > blockStart;
      });

      if (hasBlockConflict) {
        toast.error('Este horário está bloqueado pelo administrador');
        return;
      }

      // Validar se não há conflito com outros agendamentos
      const hasConflict = appointments.some(
        a => {
          if (a.id === appointmentId) return false;
          if (a.barber.id !== targetBarberId) return false;
          // Converter de UTC para Manaus time para comparação
          const appointmentDate = getManausDateString(new Date(a.date));
          const appointmentTime = getManausTimeString(new Date(a.date));
          return appointmentDate === targetDate && appointmentTime === targetTime;
        }
      );

      if (hasConflict) {
        toast.error('Já existe um agendamento neste horário');
        return;
      }

      // Criar nova data/hora
      const newDateTime = parse(
        `${targetDate} ${targetTime}`,
        'yyyy-MM-dd HH:mm',
        new Date()
      );

      // Atualizar agendamento
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDateTime.toISOString(),
          barberId: targetBarberId,
        }),
      });

      if (!res.ok) throw new Error('Erro ao reagendar');

      toast.success('Agendamento reagendado com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao reagendar:', error);
      toast.error('Erro ao reagendar agendamento');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Detectar se é agendamento online
      const isOnline = id.startsWith('online-');
      const realId = isOnline ? id.replace('online-', '') : id;
      const endpoint = isOnline ? `/api/online-bookings/${realId}` : `/api/appointments/${realId}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao excluir');

      toast.success('Agendamento excluído com sucesso!');
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir agendamento');
    }
  };

  // Funções de bloqueio de horário
  const handleCreateBlock = async () => {
    try {
      if (!blockDialog?.barberId || !blockForm.date || !blockForm.startTime || !blockForm.endTime) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      if (blockForm.startTime >= blockForm.endTime) {
        toast.error('Horário de fim deve ser depois do início');
        return;
      }

      const res = await fetch('/api/schedule-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: blockDialog.barberId,
          date: blockForm.date,
          startTime: blockForm.startTime,
          endTime: blockForm.endTime,
          reason: blockForm.reason || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Erro ao criar bloqueio');
        return;
      }

      toast.success('Horário bloqueado com sucesso!');
      setBlockDialog(null);
      setBlockForm({ date: '', startTime: '09:00', endTime: '10:00', reason: '' });
      fetchData();
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error);
      toast.error('Erro ao criar bloqueio');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/schedule-blocks?id=${blockId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao remover bloqueio');

      toast.success('Bloqueio removido com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      toast.error('Erro ao remover bloqueio');
    }
  };

  const handleMarkAsCompleted = (appointmentId: string) => {
    // Encontrar o agendamento completo
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
      toast.error('Agendamento não encontrado');
      return;
    }

    // Abrir modal de conclusão
    setCompletionDialog(appointment);
    setDetailsDialog(null);
    setSelectedProducts([]);
    setPaymentMethod('CASH');
    setCompletionNotes('');
  };

  const handleCompleteAppointment = async () => {
    if (!completionDialog) return;

    try {
      const isOnline = completionDialog.id.startsWith('online-');
      const realId = isOnline ? completionDialog.id.replace('online-', '') : completionDialog.id;

      // 1. Marcar agendamento como concluído
      const endpoint = isOnline ? `/api/online-bookings/${realId}` : `/api/appointments/${realId}`;
      const updateRes = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          paymentMethod,
          notes: completionNotes
        }),
      });

      if (!updateRes.ok) throw new Error('Erro ao finalizar agendamento');

      // 2. Registrar vendas de produtos (se houver)
      for (const product of selectedProducts) {
        await fetch('/api/product-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.productId,
            quantity: product.quantity,
            paymentMethod,
            soldBy: completionDialog.barber.name,
            observations: `Venda durante atendimento - Cliente: ${completionDialog.client.name}`,
          }),
        });
      }

      // A comissão agora é criada automaticamente pela API quando o status muda para COMPLETED
      toast.success('Atendimento finalizado com sucesso!');
      setCompletionDialog(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar atendimento');
    }
  };

  // Funções para gerenciar produtos no modal de conclusão
  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSelectedProducts([...selectedProducts, {
      productId: product.id,
      quantity: 1,
      unitPrice: product.price,
    }]);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleUpdateProductQuantity = (productId: string, delta: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.productId === productId) {
        const newQuantity = p.quantity + delta;
        const product = products.find(prod => prod.id === productId);
        if (newQuantity > 0 && (!product || newQuantity <= product.stock)) {
          return { ...p, quantity: newQuantity };
        }
      }
      return p;
    }));
  };

  // Funções de navegação
  const goToPreviousDay = () => setCurrentDate(addDays(currentDate, -1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Filtrar agendamentos
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBarber = filterBarber === 'all' || appointment.barber.id === filterBarber;
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesBarber && matchesStatus;
  });

  // Obter cor do barbeiro
  const getBarberColor = (barberId: string) => {
    const index = barbers.findIndex(b => b.id === barberId);
    return BARBER_COLORS[index % BARBER_COLORS.length];
  };

  // Renderizar dias da semana
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const renderAppointmentCard = (appointment: Appointment & { isOnlineBooking?: boolean }) => {
    const color = getBarberColor(appointment.barber.id);
    const isCompleted = appointment.status === 'COMPLETED';
    const isOnline = appointment.isOnlineBooking;
    const isSubscriber = appointment.client.isSubscriber;

    return (
      <div
        key={appointment.id}
        className={`
          relative p-3 rounded-2xl cursor-pointer transition-all duration-300 group
          ${isCompleted
            ? 'bg-white/[0.02] border border-white/5 opacity-50'
            : 'bg-white/5 border border-white/10 hover:border-gold-500/50 hover:bg-white/[0.08] shadow-lg hover:shadow-gold/20'
          }
          ${isSubscriber ? 'ring-1 ring-gold-500/30 shadow-gold/10' : ''}
          ${isOnline && !isCompleted ? 'ring-1 ring-blue-500/30' : ''}
        `}
        onClick={() => {
          setDetailsDialog(appointment);
        }}
        title=""
      >
        {/* Indicador lateral de cor do barbeiro */}
        <div className={`absolute top-3 bottom-3 left-0 w-1 rounded-full ${color.badge} opacity-70`} />

        < div className="pl-2 space-y-1" >
          <div className="flex items-center justify-between gap-1 overflow-hidden">
            <span className={`font-bold truncate text-[11px] ${isCompleted ? 'text-gray-500' : 'text-white'}`}>
              {appointment.client.name}
            </span>
            <div className="flex gap-1 shrink-0">
              {isSubscriber && (
                <Award className="w-3 h-3 text-gold-500" />
              )}
              {isOnline && (
                <Globe className="w-3 h-3 text-blue-400" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[9px] text-gray-500 truncate font-medium">
              {appointment.services.map(s => s.service.name).join(', ')}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className={`text-[10px] font-serif font-bold ${isCompleted ? 'text-gray-600' : 'text-gold-500'}`}>
              {formatCurrency(appointment.totalAmount)}
            </span>
            {isCompleted && (
              <CheckCircle className="w-3 h-3 text-green-500/50" />
            )}
          </div>
        </div >

        {/* Glow effect on hover (for non-completed) */}
        {
          !isCompleted && (
            <div className="absolute -inset-px bg-gold-gradient opacity-0 group-hover:opacity-5 rounded-2xl blur-sm transition-opacity pointer-events-none" />
          )
        }
      </div >
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-8 h-8 text-primary" />
              Agenda
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie os agendamentos em grade
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>
        </div>

        {/* Filtros e Controles */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Navegação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'day' ? goToPreviousDay : goToPreviousWeek}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-semibold text-center flex-1">
                {viewMode === 'day'
                  ? format(currentDate, "dd 'de' MMMM", { locale: ptBR })
                  : `${format(getWeekDays()[0], 'dd/MM')} - ${format(getWeekDays()[6], 'dd/MM')}`
                }
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'day' ? goToNextDay : goToNextWeek}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Modo de visualização */}
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de barbeiro */}
            <Select value={filterBarber} onValueChange={setFilterBarber}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os barbeiros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os barbeiros</SelectItem>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legenda de cores */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-3">
              <span className="text-xs text-muted-foreground font-semibold">Barbeiros:</span>
              {barbers.map((barber, index) => {
                const color = BARBER_COLORS[index % BARBER_COLORS.length];
                const photo = getBarberPhoto(barber.name);
                return (
                  <div key={barber.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${color.badge}`}></div>
                    {photo && (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-border">
                        <Image
                          src={photo}
                          alt={barber.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span className="text-xs text-foreground font-medium">{barber.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Grade de Agendamentos */}
        {loading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <Card className="p-4 overflow-x-auto">
            {viewMode === 'day' ? (
              <DayGridView
                date={currentDate}
                barbers={barbers}
                appointments={filteredAppointments}
                scheduleBlocks={scheduleBlocks}
                timeSlots={TIME_SLOTS}
                getBarberColor={getBarberColor}
                renderAppointmentCard={renderAppointmentCard}
                setEditDialog={setEditDialog}
                setBlockDialog={setBlockDialog}
                setBlockForm={setBlockForm}
                blockForm={blockForm}
                currentDate={currentDate}
                handleDeleteBlock={handleDeleteBlock}
              />
            ) : (
              <WeekGridView
                weekDays={getWeekDays()}
                barbers={barbers}
                appointments={filteredAppointments}
                timeSlots={TIME_SLOTS}
                getBarberColor={getBarberColor}
                renderAppointmentCard={renderAppointmentCard}
                setEditDialog={setEditDialog}
              />
            )}
          </Card>
        )}

        {/* Overlay de Drag */}
        <DragOverlay>
          {activeId && draggedAppointment ? (
            <div className="bg-white shadow-lg rounded p-2 text-xs border-2 border-primary">
              <div className="font-semibold">{draggedAppointment.client.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {formatCurrency(draggedAppointment.totalAmount)}
              </div>
            </div>
          ) : null}
        </DragOverlay>

        {/* Dialog de Detalhes */}
        {detailsDialog && (
          <AppointmentDetailsDialog
            appointment={detailsDialog}
            onClose={() => setDetailsDialog(null)}
            onMarkCompleted={handleMarkAsCompleted}
            onDelete={(id) => {
              setDetailsDialog(null);
              setDeleteDialog(id);
            }}
            onUpdate={() => {
              fetchData();
            }}
          />
        )}

        {/* Dialog de Finalização */}
        {completionDialog && (
          <CompletionDialog
            appointment={completionDialog}
            products={products}
            selectedProducts={selectedProducts}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
            onUpdateQuantity={handleUpdateProductQuantity}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            notes={completionNotes}
            onNotesChange={setCompletionNotes}
            onComplete={handleCompleteAppointment}
            onClose={() => setCompletionDialog(null)}
          />
        )}

        {/* Dialog de Edição/Criação */}
        {editDialog && (
          <AppointmentEditDialog
            appointment={editDialog.appointment ? {
              ...editDialog.appointment,
              date: editDialog.date || editDialog.appointment.date,
              barberId: editDialog.barberId || editDialog.appointment.barber.id,
            } : {
              date: editDialog.date!,
              barberId: editDialog.barberId!,
            } as any}
            isNew={editDialog.isNew}
            onClose={() => setEditDialog(null)}
            onSave={() => {
              setEditDialog(null);
              fetchData();
            }}
          />
        )}

        {/* Dialog de Bloqueio de Horário */}
        {blockDialog && (
          <BlockScheduleDialog
            open={!!blockDialog}
            barber={barbers.find(b => b.id === blockDialog.barberId)}
            initialDate={blockDialog.date}
            onClose={() => {
              setBlockDialog(null);
              setBlockForm({ date: '', startTime: '09:00', endTime: '10:00', reason: '' });
            }}
            onSubmit={handleCreateBlock}
            form={blockForm}
            setForm={setBlockForm}
          />
        )}

        {/* Dialog de Exclusão */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndContext>
  );
}

// Componente: Visualização por Dia
function DayGridView({
  date,
  barbers,
  appointments,
  scheduleBlocks,
  timeSlots,
  getBarberColor,
  renderAppointmentCard,
  setEditDialog,
  setBlockDialog,
  setBlockForm,
  blockForm,
  currentDate,
  handleDeleteBlock,
}: any) {
  const { useDraggable, useDroppable } = require('@dnd-kit/core');

  return (
    <div className="min-w-[800px]">
      {/* Header com barbeiros */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `80px repeat(${barbers.length}, 1fr)` }}>
        <div className="text-xs font-semibold text-muted-foreground p-2">Horário</div>
        {barbers.map((barber: Barber, index: number) => {
          const color = getBarberColor(barber.id);
          const photo = getBarberPhoto(barber.name);
          return (
            <div
              key={barber.id}
              className={`${color.bg} ${color.border} border-2 rounded p-2 text-center`}
            >
              <div className="flex flex-col items-center gap-1">
                {photo && (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <Image
                      src={photo}
                      alt={barber.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className={`text-xs font-semibold ${color.text}`}>{barber.name}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    setBlockDialog({ date: format(currentDate, 'yyyy-MM-dd'), barberId: barber.id });
                    setBlockForm({ ...blockForm, date: format(currentDate, 'yyyy-MM-dd') });
                  }}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Bloquear
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de horários */}
      <div className="space-y-1">
        {timeSlots.map((time: string) => (
          <div
            key={time}
            className="grid gap-2"
            style={{ gridTemplateColumns: `80px repeat(${barbers.length}, 1fr)` }}
          >
            {/* Coluna de horário */}
            <div className="text-xs font-medium text-muted-foreground p-2 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {time}
            </div>

            {/* Células para cada barbeiro */}
            {barbers.map((barber: Barber) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dropId = `${dateStr}|${time}|${barber.id}`;

              // Encontrar agendamento neste horário
              const appointment = appointments.find((a: Appointment) => {
                // Converter de UTC para Manaus time para exibição
                const appointmentDate = getManausDateString(new Date(a.date));
                const appointmentTime = getManausTimeString(new Date(a.date));
                return appointmentDate === dateStr && appointmentTime === time && a.barber.id === barber.id;
              });

              // Verificar se há bloqueio neste horário
              const block = scheduleBlocks.find((b: ScheduleBlock) => {
                const blockDate = format(new Date(b.date), 'yyyy-MM-dd');
                return blockDate === dateStr && b.barberId === barber.id && time >= b.startTime && time < b.endTime;
              });

              return (
                <TimeSlotCell
                  key={dropId}
                  id={dropId}
                  appointment={appointment}
                  block={block}
                  renderAppointmentCard={renderAppointmentCard}
                  onEmptySlotClick={() => {
                    const datetime = `${dateStr}T${time}:00`;
                    setEditDialog({ isNew: true, date: datetime, barberId: barber.id });
                  }}
                  onDeleteBlock={handleDeleteBlock}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente: Visualização por Semana
function WeekGridView({
  weekDays,
  barbers,
  appointments,
  timeSlots,
  getBarberColor,
  renderAppointmentCard,
  setEditDialog,
}: any) {
  return (
    <div className="min-w-[1200px]">
      {/* Header com dias da semana */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
        <div className="text-xs font-semibold text-muted-foreground p-2">Horário</div>
        {weekDays.map((day: Date) => (
          <div key={day.toISOString()} className="bg-secondary rounded p-2 text-center">
            <div className="text-xs font-semibold text-foreground">
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className="text-lg font-bold text-primary">
              {format(day, 'dd')}
            </div>
          </div>
        ))}
      </div>

      {/* Grid de horários */}
      <div className="space-y-1">
        {timeSlots.map((time: string) => (
          <div
            key={time}
            className="grid gap-2"
            style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
          >
            {/* Coluna de horário */}
            <div className="text-xs font-medium text-muted-foreground p-2 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {time}
            </div>

            {/* Células para cada dia */}
            {weekDays.map((day: Date) => {
              const dateStr = format(day, 'yyyy-MM-dd');

              // Agrupar agendamentos deste horário/dia por barbeiro
              const dayTimeAppointments = appointments.filter((a: Appointment) => {
                // Converter de UTC para Manaus time para exibição
                const appointmentDate = getManausDateString(new Date(a.date));
                const appointmentTime = getManausTimeString(new Date(a.date));
                return appointmentDate === dateStr && appointmentTime === time;
              });

              return (
                <div key={`${dateStr}-${time}`} className="border border-border rounded p-1 min-h-[60px] space-y-1">
                  {dayTimeAppointments.map((appointment: Appointment) => (
                    <div key={appointment.id}>
                      {renderAppointmentCard(appointment)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente: Célula de Horário (Droppable + Draggable)
function TimeSlotCell({ id, appointment, block, renderAppointmentCard, onEmptySlotClick, onDeleteBlock }: any) {
  const { useDraggable, useDroppable } = require('@dnd-kit/core');

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  const draggableId = appointment?.id;
  const isOnlineBooking = appointment?.isOnlineBooking;
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: draggableId || 'none',
    disabled: !appointment || !!block, // Desabilitar drag apenas para bloqueios
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setDroppableRef}
      className={`
        border border-border rounded p-1 min-h-[60px] transition-colors
        ${isOver && !block ? 'bg-primary/10 border-primary' : 'bg-background'}
        ${!appointment && !block ? 'cursor-pointer hover:bg-primary/5 hover:border-primary/40' : ''}
        ${block ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''}
      `}
      onClick={() => {
        if (!appointment && !block && onEmptySlotClick) {
          onEmptySlotClick();
        }
      }}
      title={!appointment && !block ? 'Clique para criar novo atendimento' : block ? 'Horário bloqueado' : ''}
    >
      {block ? (
        <div className="relative h-full p-2 rounded border-l-4 border-red-500 bg-red-50 text-xs group flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-1">
            <Ban className="w-3 h-3 text-red-600" />
            <span className="text-[10px] font-bold text-red-700">BLOQUEADO</span>
          </div>
          {block.reason && (
            <div className="text-[10px] text-gray-600 truncate" title={block.reason}>
              {block.reason}
            </div>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm('Remover este bloqueio?')) {
                onDeleteBlock(block.id);
              }
            }}
            className="absolute top-1 right-1 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 cursor-pointer shadow-md transition-transform hover:scale-110"
            title="Remover bloqueio"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : appointment ? (
        <div
          ref={setDraggableRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`${isDragging ? 'opacity-50' : ''} cursor-grab`}
          title="Arrastar para reagendar"
        >
          {renderAppointmentCard(appointment)}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Componente: Wrapper do Dialog de Finalização com estados próprios
function CompletionDialogWrapper({
  appointment,
  onClose,
  onComplete,
}: {
  appointment: Appointment;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState(appointment.paymentMethod);
  const [completionNotes, setCompletionNotes] = useState(appointment.notes || '');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.filter((p: any) => p.isActive && p.stock > 0));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProducts(prev => [...prev, {
        productId,
        quantity: 1,
        unitPrice: product.price,
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(prev => prev.map(p =>
      p.productId === productId
        ? { ...p, quantity: Math.max(1, p.quantity + delta) }
        : p
    ));
  };

  const handleComplete = async () => {
    try {
      // Atualizar forma de pagamento se mudou
      if (paymentMethod !== appointment.paymentMethod) {
        await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod }),
        });
      }

      // Registrar vendas de produtos se houver
      for (const item of selectedProducts) {
        await fetch('/api/product-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            paymentMethod,
            observations: completionNotes,
          }),
        });
      }

      // Marcar como concluído
      await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      toast.success('Atendimento finalizado com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Erro ao finalizar atendimento');
    }
  };

  return (
    <CompletionDialog
      appointment={appointment}
      products={products}
      selectedProducts={selectedProducts}
      onAddProduct={handleAddProduct}
      onRemoveProduct={handleRemoveProduct}
      onUpdateQuantity={handleUpdateQuantity}
      paymentMethod={paymentMethod}
      onPaymentMethodChange={setPaymentMethod}
      notes={completionNotes}
      onNotesChange={setCompletionNotes}
      onComplete={handleComplete}
      onClose={onClose}
    />
  );
}

// Componente: Dialog de Detalhes do Agendamento (com edição completa)
function AppointmentDetailsDialog({
  appointment,
  onClose,
  onMarkCompleted,
  onDelete,
  onUpdate,
}: {
  appointment: Appointment;
  onClose: () => void;
  onMarkCompleted: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}) {
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [isEditingProducts, setIsEditingProducts] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    appointment.services.map(s => s.service.id)
  );
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>(
    appointment.products?.map((p: any) => ({
      productId: p.product.id,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
    })) || []
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(appointment.paymentMethod);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pix Logic
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [pixData, setPixData] = useState({
    clientId: "",
    amount: "",
    description: "",
    cpfCnpj: "",
  });
  const [generatedPix, setGeneratedPix] = useState<{
    id: string;
    qrCode: { encodedImage: string; payload: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenPixDialog = () => {
    setPixData({
      clientId: appointment.client.id,
      amount: appointment.totalAmount.toString(),
      description: `Atendimento - ${format(new Date(appointment.date), "dd/MM")}`,
    });
    setGeneratedPix(null);
    setIsPixDialogOpen(true);
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixData.clientId || !pixData.amount) {
      toast.error("Erro nos dados do Pix");
      return;
    }

    try {
      const res = await fetch("/api/payments/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pixData)
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedPix(data);
        toast.success("Pix gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar Pix");
      }
    } catch (error) {
      toast.error("Erro na comunicação");
    }
  };

  const copyToClipboard = () => {
    if (generatedPix?.qrCode?.payload) {
      navigator.clipboard.writeText(generatedPix.qrCode.payload);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCompleted = appointment.status === 'COMPLETED';
  const isOnline = appointment.isOnlineBooking;

  useEffect(() => {
    if (isEditingServices || isEditingProducts) {
      fetchServices();
      fetchProducts();
    }
  }, [isEditingServices, isEditingProducts]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.filter((s: any) => s.isActive));
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.filter((p: any) => p.isActive && p.stock > 0));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSaveServices = async () => {
    if (selectedServiceIds.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }

    setIsUpdating(true);
    try {
      if (isOnline) {
        // Para agendamentos online, converter para appointment regular
        const realId = appointment.id.replace('online-', '');

        const requestData = {
          onlineBookingId: realId,
          serviceIds: selectedServiceIds,
          products: selectedProducts,
          paymentMethod: appointment.paymentMethod,
          notes: appointment.notes || '',
        };

        console.log('🔵 [AGENDA] Enviando dados para conversão:', {
          ...requestData,
          selectedProductsCount: selectedProducts.length,
          selectedServicesCount: selectedServiceIds.length,
        });

        const convertRes = await fetch('/api/appointments/convert-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        const responseData = await convertRes.json();
        console.log('🟣 [AGENDA] Resposta recebida:', {
          ok: convertRes.ok,
          status: convertRes.status,
          data: responseData,
        });

        if (convertRes.ok) {
          toast.success('Agendamento convertido com sucesso!');
          setIsEditingServices(false);
          setIsEditingProducts(false);
          onUpdate();
          onClose();
        } else {
          toast.error(responseData.error || 'Erro ao converter agendamento');
        }
      } else {
        // Atualização normal de appointment
        const res = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceIds: selectedServiceIds,
            productItems: selectedProducts
          }),
        });

        if (res.ok) {
          toast.success('Serviços e produtos atualizados com sucesso!');
          setIsEditingServices(false);
          setIsEditingProducts(false);
          onUpdate();
          onClose();
        } else {
          toast.error('Erro ao atualizar serviços');
        }
      }
    } catch (error) {
      console.error('Error updating services:', error);
      toast.error('Erro ao atualizar serviços');
    } finally {
      setIsUpdating(false);
    }
  };

  const addProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find(p => p.productId === productId);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p => p.productId === productId
          ? { ...p, quantity: p.quantity + 1 }
          : p
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        { productId, quantity: 1, unitPrice: product.price }
      ]);
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(p => p.productId === productId ? { ...p, quantity } : p)
    );
  };

  const handleSavePaymentMethod = async () => {
    setIsUpdating(true);
    try {
      // Para agendamentos online, usar o ID real sem o prefixo "online-"
      const appointmentId = isOnline ? appointment.id.replace('online-', '') : appointment.id;
      const apiEndpoint = isOnline ? `/api/online-bookings/${appointmentId}` : `/api/appointments/${appointmentId}`;

      const res = await fetch(apiEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: selectedPaymentMethod }),
      });

      if (res.ok) {
        toast.success('Forma de pagamento atualizada!');
        setIsEditingPayment(false);
        onUpdate();
        onClose();
      } else {
        toast.error('Erro ao atualizar forma de pagamento');
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Erro ao atualizar forma de pagamento');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    const servicesTotal = selectedServiceIds.reduce((sum, id) => {
      const service = services.find(s => s.id === id);
      return sum + (service?.price || 0);
    }, 0);

    const productsTotal = selectedProducts.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    return servicesTotal + productsTotal;
  };

  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 font-serif text-white text-xl">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <Calendar className="w-4 h-4 text-gold-500" />
                </div>
                Detalhes do Agendamento
                {isOnline && (
                  <Badge variant="outline" className="ml-2 border-blue-500/30 text-blue-400 bg-blue-500/10">
                    <Globe className="w-3 h-3 mr-1" />
                    ONLINE
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cliente */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gold-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Cliente</span>
              </div>
              <p className="text-white font-bold text-lg">{appointment.client.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-3 h-3 text-gold-500/70" />
                <p className="text-sm text-gray-400 font-medium">{appointment.client.phone}</p>
              </div>
            </div>

            {/* Barbeiro e Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Barbeiro</span>
                <p className="text-white font-bold mt-1 text-lg">{appointment.barber.name}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Data e Hora</span>
                <p className="text-white font-bold mt-1 text-lg leading-tight">
                  {format(new Date(appointment.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Serviços */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Serviços</span>
                {!isCompleted && !isEditingServices && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingServices(true)}
                    className="h-8 px-3 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg text-xs font-bold"
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Editar
                  </Button>
                )}
              </div>

              {isEditingServices ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-xl p-3 bg-black/20 custom-scrollbar">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all",
                          selectedServiceIds.includes(service.id)
                            ? "bg-gold-500/10 border-gold-500/30"
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="w-4 h-4 rounded border-white/20 bg-black/50 text-gold-500 focus:ring-gold-500/50"
                        />
                        <div className="flex-1">
                          <p className={cn("font-bold text-sm", selectedServiceIds.includes(service.id) ? "text-white" : "text-gray-300")}>{service.name}</p>
                          <p className="text-xs text-gray-500 font-medium italic">
                            {formatCurrency(service.price)} • {service.duration} min
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedServiceIds.length > 0 && (
                    <div className="bg-gold-500/5 p-4 rounded-xl border border-gold-500/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-gold-500">Novo Total</span>
                        <span className="font-serif font-bold text-gold-500 text-xl">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingServices(false);
                        setSelectedServiceIds(appointment.services.map(s => s.service.id));
                      }}
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveServices}
                      disabled={isUpdating || selectedServiceIds.length === 0}
                      className="flex-1 bg-gold-gradient text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointment.services.map((s) => (
                    <div key={s.service.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                      <span className="text-white font-medium">{s.service.name}</span>
                      <span className="font-bold text-gold-500 text-sm">
                        {formatCurrency(s.service.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Produtos */}
            {isEditingServices && (
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Produtos (Opcional)</span>
                </div>

                <div className="space-y-4">
                  {/* Adicionar Produto */}
                  <div className="flex gap-2">
                    <Select onValueChange={(value) => addProduct(value)}>
                      <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white rounded-xl h-12">
                        <SelectValue placeholder="Adicionar produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => !selectedProducts.find(sp => sp.productId === p.id))
                          .map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.price)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lista de Produtos Selecionados */}
                  {selectedProducts.length > 0 && (
                    <div className="space-y-2">
                      {selectedProducts.map(item => {
                        const product = getProduct(item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.productId} className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(item.unitPrice)} × {item.quantity} = <span className="text-gold-500 font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateProductQuantity(item.productId, parseInt(e.target.value) || 0)
                                }
                                className="w-14 h-8 text-sm bg-black/20 border-white/10 text-white text-center p-1 rounded-lg"
                                min="1"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                onClick={() => removeProduct(item.productId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Totais */}
            <div className="bg-gold-500/5 border border-gold-500/20 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Valor Total:</span>
                <span className="font-serif font-bold text-gold-500 text-3xl">
                  {isEditingServices ? formatCurrency(calculateTotal()) : formatCurrency(appointment.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-3 border-t border-gold-500/10">
                <span className="text-gray-500 text-xs uppercase tracking-widest font-bold">Comissão do Barbeiro:</span>
                <span className="font-bold text-white/50">
                  {formatCurrency(appointment.commissionAmount || 0)}
                </span>
              </div>
            </div>

            {/* Status e Pagamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Status</span>
                <Badge
                  className={cn(
                    "px-3 py-1 text-sm",
                    isCompleted
                      ? "bg-green-500/20 text-green-500 border-green-500/30"
                      : "bg-white/10 text-white border-white/10"
                  )}
                >
                  {isCompleted ? '✓ Concluído' : 'Agendado'}
                </Badge>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Pagamento</span>
                  {!isCompleted && !isEditingPayment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingPayment(true)}
                      className="h-6 w-6 p-0 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {isEditingPayment ? (
                  <div className="space-y-3 animate-in fade-in">
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingPayment(false);
                          setSelectedPaymentMethod(appointment.paymentMethod);
                        }}
                        className="flex-1 h-8 text-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        X
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePaymentMethod}
                        disabled={isUpdating}
                        className="flex-1 h-8 text-xs bg-gold-gradient text-black font-bold"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-sm py-1 px-3 border-white/20 text-white bg-white/5 font-medium">
                    {paymentMethodLabels[appointment.paymentMethod]}
                  </Badge>
                )}
              </div>
            </div>

            {/* Observações */}
            {appointment.notes && (
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Observações</span>
                <p className="text-gray-300 text-sm italic leading-relaxed">"{appointment.notes}"</p>
              </div>
            )}

            {/* Alerta para agendamentos online */}
            {isOnline && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-200/80">
                    <p className="font-bold text-blue-400 mb-1">Agendamento Online</p>
                    <p>Este agendamento foi criado através da página pública. Gerencie com cuidado.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/5 pt-6 mt-6 flex gap-3">
            <div className="flex gap-3 w-full justify-end flex-wrap">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border-white/10 h-12 px-6"
              >
                Fechar
              </Button>
              {!isCompleted && (
                <>
                  <Button
                    onClick={handleOpenPixDialog}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl border border-blue-500/20 h-12 px-6"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar Pix
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onMarkCompleted(appointment.id);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg border border-green-400/20 h-12 px-6"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Concluir
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                onClick={() => onDelete(appointment.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/20 h-12 px-6"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pix Dialog */}
      <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 border-gold-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Gerar Cobrança Pix</DialogTitle>
          </DialogHeader>
          {!generatedPix ? (
            <form onSubmit={handleGeneratePix} className="space-y-4">
              <div>
                <Label className="text-white">CPF do Cliente (Obrigatório para Pix)</Label>
                <Input
                  value={pixData.cpfCnpj}
                  onChange={(e) => {
                    // Mascara simples de CPF
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                    else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, "$1.$2");
                    setPixData({ ...pixData, cpfCnpj: v });
                  }}
                  className="bg-white/5 text-white border-white/10"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div>
                <Label className="text-white">Descrição</Label>
                <Input
                  value={pixData.description}
                  onChange={(e) => setPixData({ ...pixData, description: e.target.value })}
                  className="bg-white/5 text-white border-white/10"
                />
              </div>
              <div>
                <Label className="text-white">Valor (R$)</Label>
                <Input
                  value={pixData.amount}
                  readOnly
                  className="bg-white/5 text-white border-white/10 font-bold text-lg"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-white">
                Gerar QR Code
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-white p-2 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${generatedPix.qrCode.encodedImage}`}
                  alt="QR Code Pix"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-white font-bold text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pixData.amount))}
              </p>
              <div className="w-full space-y-2">
                <Label className="text-gray-400 text-xs uppercase">Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedPix.qrCode.payload}
                    readOnly
                    className="bg-black/50 border-white/10 text-gray-300 font-mono text-xs"
                  />
                  <Button size="icon" onClick={copyToClipboard} variant="outline" className="border-white/10 hover:bg-white/10">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setIsPixDialogOpen(false)} className="text-gray-400 hover:text-white">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

}

// Dialog de Bloqueio de Horário
function BlockScheduleDialog({
  open,
  barber,
  initialDate,
  onClose,
  onSubmit,
  form,
  setForm,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Bloquear Horário - {barber?.name}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="block-date">Data *</Label>
            <Input
              id="block-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="block-start-time">Hora Início *</Label>
              <select
                id="block-start-time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md time-select-red"
              >
                {TIME_SLOTS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="block-end-time">Hora Fim *</Label>
              <select
                id="block-end-time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md time-select-red"
              >
                {TIME_SLOTS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="block-reason">Motivo (Opcional)</Label>
            <Textarea
              id="block-reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ex: Almoço, Folga, Compromisso pessoal..."
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Ban className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>Atenção:</strong> Não é possível bloquear horários que já têm agendamentos confirmados.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} className="bg-red-600 hover:bg-red-700 text-white">
            <Ban className="w-4 h-4 mr-2" />
            Bloquear Horário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
