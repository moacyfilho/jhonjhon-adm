'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { format, addDays, startOfWeek, addWeeks, subWeeks, parse, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Filter, Search, Clock, User, DollarSign, Phone, CheckCircle, XCircle, Edit, Edit2, Trash2, Globe, ShoppingCart, Plus, Minus, Award, Ban } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AppointmentEditDialog } from '@/components/appointment-edit-dialog';
import { toManausTime, getManausNow, getManausTimeString, isSameDayManaus, formatManausDateTime } from '@/lib/timezone';

interface Barber {
  id: string;
  name: string;
  commissionRate: number;
  hourlyRate: number;
}

interface ClientSubscription {
  id: string;
  planName: string;
  servicesIncluded: string | null; // JSON: {"services":["Corte","Barba"]} ou string CSV
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  isSubscriber?: boolean;
  subscriptions?: ClientSubscription[];
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
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
  isOnlineBooking?: boolean;
  isSubscriptionAppointment?: boolean;
  commission?: {
    amount: number;
  };
  products?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      name: string;
      price: number;
    };
  }>;
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
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
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

/**
 * Parseia o campo servicesIncluded da assinatura e retorna lista normalizada de serviços.
 * Suporta dois formatos:
 *   - JSON: {"services":["Corte","Barba"]}
 *   - CSV legado: "Corte, Barba, pezinho"
 * Retorna array em minúsculas para comparação case-insensitive.
 */
function getSubscriptionIncludedServices(client: Client): string[] {
  const sub = client.subscriptions?.[0];
  if (!sub?.servicesIncluded) return [];

  const raw = sub.servicesIncluded.trim();
  try {
    // Tenta parsear como JSON: {"services":["Corte","Barba"]}
    const parsed = JSON.parse(raw);
    if (parsed.services && Array.isArray(parsed.services)) {
      return parsed.services.map((s: string) => s.trim().toLowerCase());
    }
  } catch {
    // Fallback: CSV "Corte, Barba, pezinho"
    return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

/**
 * Verifica se um serviço específico está incluído na assinatura do cliente.
 * Compara o nome do serviço com os serviços incluídos na assinatura.
 */
function isServiceIncludedInSubscription(serviceName: string, includedServices: string[]): boolean {
  if (includedServices.length === 0) return false;
  const lower = serviceName.toLowerCase();
  return includedServices.some(inc => lower.includes(inc) || inc.includes(lower));
}

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
  onComplete: (manualTotal?: number) => void;
  onClose: () => void;
}) {
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [isEditingTotal, setIsEditingTotal] = useState(false);

  const isSubscriber = appointment.isSubscriptionAppointment || appointment.client.isSubscriber;

  // Serviços incluídos na assinatura do cliente (ex: ["corte", "barba"])
  const includedServices = isSubscriber ? getSubscriptionIncludedServices(appointment.client) : [];

  // isSub = true se assinante E tem algum serviço coberto pela assinatura
  const isSub = isSubscriber &&
    appointment.services.some(s => isServiceIncludedInSubscription(s.service.name, includedServices));

  // Calcular total de serviços:
  // - Para assinantes: somente serviços que NÃO estão incluídos na assinatura
  // - Para não-assinantes: totalAmount salvo menos produtos anteriores
  const originalProductsTotal = appointment.products?.reduce((sum, p) => sum + (p.totalPrice || 0), 0) || 0;
  const servicesTotal = isSubscriber
    ? appointment.services.reduce((sum, s) => {
      const isIncluded = isServiceIncludedInSubscription(s.service.name, includedServices);
      return sum + (isIncluded ? 0 : (s.service.price || 0));
    }, 0)
    : Math.max(0, (appointment.totalAmount || 0) - originalProductsTotal);

  const productsTotal = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
  const grandTotal = servicesTotal + productsTotal;

  // Final total display (with potential override)
  const finalTotalToPay = manualTotal !== null ? manualTotal : grandTotal;

  // Base de cálculo para comissão (Apenas Serviços)
  // Se houver valor manual, tentamos isolar a parte dos serviços subtraindo os produtos
  const commissionBase = manualTotal !== null
    ? Math.max(0, manualTotal - productsTotal)
    : servicesTotal;

  const commissionAmount = isSubscriber
    ? (() => {
      // Para assinantes: mantém lógica de valor por hora apenas sobre o tempo de serviço
      const totalMinutes = appointment.services.reduce((sum, s) => sum + (s.service.duration || 0), 0);
      const serviceCommission = (totalMinutes / 60) * (appointment.barber.hourlyRate || 0);
      return serviceCommission;
    })()
    : (commissionBase * (appointment.barber.commissionRate / 100));

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Finalizar Atendimento
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Atendimento */}
          <div className="bg-secondary/30 p-4 rounded-lg border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações do Atendimento
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <div className="font-medium flex items-center gap-2">
                  {appointment.client.name}
                  {(appointment.isSubscriptionAppointment || appointment.client.isSubscriber) && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1 py-0 h-4 uppercase font-bold shrink-0">
                      ASSINANTE
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Barbeiro:</span>
                <p className="font-medium">{appointment.barber.name} ({appointment.barber.commissionRate}%)</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Serviços:</span>
                <ul className="mt-1">
                  {appointment.services.map((s) => {
                    const isExempt = isSubscriber && isServiceIncludedInSubscription(s.service.name, includedServices);
                    return (
                      <li key={s.service.id} className="flex justify-between">
                        <div className="flex flex-col">
                          <span>{s.service.name}</span>
                          {isExempt && <span className="text-[8px] text-amber-600 font-bold uppercase -mt-1">Incluso na Assinatura</span>}
                        </div>
                        <span className={`font-medium ${isExempt ? 'text-amber-600' : ''}`}>
                          {formatCurrency(isExempt ? 0 : s.service.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Adicionar Produtos */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Produtos Vendidos (Opcional)
            </h3>

            {/* Seletor de produto */}
            <div className="flex gap-2 mb-4">
              <Select onValueChange={onAddProduct}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um produto para adicionar" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter(p => !selectedProducts.find(sp => sp.productId === p.id))
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)} (Estoque: {product.stock})
                      </SelectItem>
                    ))}
                  {products.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      {products.length === 0 ? 'Nenhum produto disponível' : 'Todos os produtos já foram adicionados'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de produtos selecionados */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                {selectedProducts.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 bg-secondary/50 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{getProductName(item.productId)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity} = {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.productId, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.productId, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRemoveProduct(item.productId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Forma de Pagamento */}
          <div>
            <Label htmlFor="paymentMethod" className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Forma de Pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger id="paymentMethod">
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

          {/* Observações */}
          <div>
            <Label htmlFor="notes" className="font-semibold mb-2 block">
              Observações (Opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Adicione observações sobre o atendimento..."
              rows={3}
            />
          </div>

          <Separator />

          {/* Resumo Financeiro */}
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-3">Resumo Financeiro</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Serviços:</span>
                <span className="font-medium">{formatCurrency(servicesTotal)}</span>
              </div>
              {selectedProducts.length > 0 && (
                <div className="flex justify-between">
                  <span>Produtos ({selectedProducts.length}):</span>
                  <span className="font-medium">{formatCurrency(productsTotal)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center py-1">
                <div className="flex flex-col">
                  <span className="font-semibold text-base">Valor Total</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Original: {formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {manualTotal === null ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl text-primary">{formatCurrency(grandTotal)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => {
                          setManualTotal(grandTotal);
                          setIsEditingTotal(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <Input
                          type="number"
                          value={manualTotal}
                          onChange={(e) => setManualTotal(parseFloat(e.target.value) || 0)}
                          className="w-32 h-9 text-right font-bold pr-8 border-primary/30 focus-visible:ring-primary"
                          step="0.01"
                          autoFocus
                        />
                        <span className="absolute left-2 top-2 text-xs text-muted-foreground">R$</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setManualTotal(null)}
                        title="Restaurar valor original"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-border mt-2">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px]">
                    {isSubscriber ? 'Comissão (Valor Fixo por Hora)' : `Comissão (${appointment.barber.commissionRate}%)`}
                  </span>
                  {isSubscriber && (
                    <span className="text-[9px] text-muted-foreground leading-none">
                      Ref: {appointment.barber.hourlyRate || 0}/hora
                    </span>
                  )}
                </div>
                <span className="font-semibold text-green-600">{formatCurrency(commissionAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onComplete(manualTotal !== null ? manualTotal : undefined)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default function AgendaPage() {
  console.log('--- AGENDA LOADED [VERSION 2.3] ---');
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
    console.log('--- AGENDA LOADED [VERSION 3.0 STABLE PATCHED] ---');
  }, []);

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
      setBarbers(barbersData);

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

      // Converter OnlineBookings para o formato de Appointment para exibição
      const convertedOnlineBookings = onlineBookingsData
        .filter((booking: any) => booking.barber) // Apenas bookings com barbeiro atribuído
        .map((booking: any) => {
          // Lidar com múltiplos serviços ou o serviço único legado
          const bookingServices = booking.services && booking.services.length > 0
            ? booking.services.map((s: any) => ({ service: s.service }))
            : (booking.service ? [{ service: booking.service }] : []);

          const totalAmount = booking.services && booking.services.length > 0
            ? booking.services.reduce((sum: number, s: any) => sum + (s.service?.price || 0), 0)
            : (booking.service?.price || 0);

          let billingTotal = totalAmount;
          if (booking.isSubscriber) {
            const subServices = bookingServices.filter((s: any) =>
              !(s.service?.name?.toLowerCase().trim().includes('corte'))
            );
            billingTotal = subServices.reduce((sum: number, s: any) => sum + (Number(s.service?.price) || 0), 0);
          }

          return {
            id: `online-${booking.id}`,
            clientId: booking.clientId || 'temp',
            barberId: booking.barberId,
            date: booking.scheduledDate,
            totalAmount: billingTotal,
            commissionAmount: 0,
            paymentMethod: 'A definir',
            notes: booking.observations,
            status: booking.status === 'CONFIRMED' ? 'SCHEDULED' : booking.status,
            client: {
              id: booking.clientId || 'temp',
              name: booking.clientName,
              phone: booking.clientPhone,
              isSubscriber: booking.isSubscriber,
            },
            barber: booking.barber,
            services: bookingServices,
            isOnlineBooking: true,
          };
        });

      console.log('[Agenda] Agendamentos carregados:', {
        admin: appointmentsData.length,
        online: convertedOnlineBookings.length,
        total: appointmentsData.length + convertedOnlineBookings.length
      });

      // Combinar ambos os tipos de agendamento
      const allAppointments = [...appointmentsData, ...convertedOnlineBookings];
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

      // Validar se não há conflito
      const hasConflict = appointments.some(
        a => {
          if (a.id === appointmentId) return false;
          if (a.barber.id !== targetBarberId) return false;
          // Converter de UTC para Manaus time para comparação
          const manausDate = toManausTime(new Date(a.date));
          return format(manausDate, 'yyyy-MM-dd') === targetDate &&
            format(manausDate, 'HH:mm') === targetTime;
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

    // Carregar produtos já existentes no agendamento, se houver
    if (appointment.products && appointment.products.length > 0) {
      setSelectedProducts(appointment.products.map((p: any) => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.unitPrice || p.product?.price || 0,
        name: p.product?.name // Opcional, para exibição se necessário
      })));
    } else {
      setSelectedProducts([]);
    }

    setPaymentMethod(appointment.paymentMethod || 'CASH');
    setCompletionNotes(appointment.notes || '');
  };

  const handleReopenAppointment = async (id: string) => {
    try {
      if (id.startsWith('online-')) {
        toast.error('Agendamentos online devem ser gerenciados pelo painel administrativo após conversão.');
        return;
      }

      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED' }),
      });

      if (!res.ok) throw new Error('Erro ao reabrir agendamento');

      toast.success('Agendamento reaberto! Agora você pode editá-lo e finalizá-lo novamente.');
      setDetailsDialog(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao reabrir:', error);
      toast.error('Erro ao reabrir agendamento.');
    }
  };

  const handleCompleteAppointment = async (manualGrandTotal?: number) => {
    if (!completionDialog) return;

    // Calcular totais ANTES de salvar
    // Para assinantes: zerar serviços incluídos na assinatura (corte, barba, ou ambos)
    const isSub = completionDialog.isSubscriptionAppointment || completionDialog.client.isSubscriber;
    const includedInSub = isSub ? getSubscriptionIncludedServices(completionDialog.client) : [];
    const servicesTotal = isSub
      ? completionDialog.services.reduce((sum, s) => {
        const isIncluded = isServiceIncludedInSubscription(s.service.name, includedInSub);
        return sum + (isIncluded ? 0 : (s.service.price || 0));
      }, 0)
      : completionDialog.totalAmount;

    const productsTotal = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
    const grandTotalCalculation = servicesTotal + productsTotal;
    const finalTotalToSave = manualGrandTotal !== undefined ? manualGrandTotal : grandTotalCalculation;

    // Preparar itens de produto para envio
    const productItems = selectedProducts.map(p => ({
      productId: p.productId,
      quantity: p.quantity,
      unitPrice: p.unitPrice
    }));

    try {
      const isOnline = completionDialog.id.startsWith('online-');
      const realId = isOnline ? completionDialog.id.replace('online-', '') : completionDialog.id;
      let finalAppointmentId = realId;

      if (isOnline) {
        // 1. Criar o atendimento administrativo real a partir do agendamento online
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: completionDialog.client.id,
            barberId: completionDialog.barber.id,
            serviceIds: completionDialog.services.map(s => s.service.id),
            date: completionDialog.date,
            paymentMethod,
            notes: completionNotes,
            onlineBookingId: realId,
            productItems, // Envia produtos para vincular
            totalAmount: finalTotalToSave, // Usar o total calculado (incluindo produtos)
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao criar atendimento administrativo');
        }
        const newAppointment = await res.json();
        finalAppointmentId = newAppointment.id;

        // 2. Marcar o atendimento administrativo como concluído
        await fetch(`/api/appointments/${newAppointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        });

        // 3. Marcar o agendamento online como CONFIRMED (para indicar que virou um atendimento)
        await fetch(`/api/online-bookings/${realId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CONFIRMED' }),
        });
      } else {
        // Para agendamentos administrativos já existentes:
        // 1. Atualizar status, pagamento e notas + PRODUTOS
        const updateRes = await fetch(`/api/appointments/${realId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            paymentMethod,
            notes: completionNotes,
            productItems, // Envia produtos para vincular e atualizar
            totalAmount: finalTotalToSave // Usar o total calculado (incluindo produtos)
          }),
        });
        if (!updateRes.ok) throw new Error('Erro ao finalizar atendimento');
      }

      // 4. Registrar vendas de produtos (se houver)
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
            skipStockUpdate: true // Evitar dupla baixa de estoque
          }),
        });
      }

      // 5. Comissão já é calculada e salva automaticamente pelo endpoint PATCH /api/appointments
      // mantemos o cálculo aqui apenas para exibir no toast

      const commissionAmount = isSub
        ? (() => {
          const totalMinutes = completionDialog.services.reduce((sum, s) => sum + (s.service.duration || 0), 0);
          const serviceCommission = (totalMinutes / 60) * (completionDialog.barber.hourlyRate || 0);
          const productCommission = productsTotal * (completionDialog.barber.commissionRate / 100);
          return serviceCommission + productCommission;
        })()
        : (finalTotalToSave * (completionDialog.barber.commissionRate / 100));

      // Removido POST /api/commissions explicito pois gera conflito com o backend


      toast.success(`Atendimento finalizado! Comissão de ${formatCurrency(commissionAmount)} registrada.`);
      setCompletionDialog(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar atendimento. Verifique o console para mais detalhes.');
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
    const isSubscriber = appointment.isSubscriptionAppointment || appointment.client.isSubscriber;

    return (
      <div
        key={appointment.id}
        className={`
          ${color.bg} ${color.border} ${color.text}
          border-l-4 rounded p-2 text-xs cursor-pointer
          hover:shadow-md transition-shadow relative
          ${isCompleted ? 'opacity-60' : ''}
          ${isOnline ? 'ring-2 ring-blue-400' : ''}
          ${isSubscriber ? 'ring-2 ring-amber-400 shadow-lg' : ''}
        `}
        onClick={() => {
          setDetailsDialog(appointment);
        }}
      >
        {/* Badge de Assinante (canto superior direito) */}
        {isSubscriber && (
          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-md" title="Assinante VIP">
            <Award className="w-3 h-3 text-white" />
          </div>
        )}

        {isOnline && (
          <div className="flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3 text-blue-600" />
            <span className="text-[9px] font-bold text-blue-600">ONLINE</span>
          </div>
        )}

        <div className="font-semibold truncate flex items-center gap-1">
          {appointment.client.name}
          {isSubscriber && <span className="text-[9px] font-bold text-amber-600">⭐</span>}
        </div>

        <div className="text-[10px] opacity-80 truncate">
          {appointment.services.map(s => s.service.name).join(', ')}
        </div>

        <div className="text-[10px] font-medium mt-1">
          {formatCurrency(
            (isSubscriber && appointment.status !== 'COMPLETED')
              ? appointment.services.reduce((sum, s) => s.service.name.toLowerCase().includes('corte') ? sum : sum + s.service.price, 0)
              : appointment.totalAmount
          )}
        </div>

        {isCompleted && (
          <div className="text-[10px] text-green-600 font-semibold mt-1">
            ✓ Concluído
          </div>
        )}
      </div>
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
              Agenda <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-mono ml-2 shadow-sm">v3.0 (STABLE) - PATCHED</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              [v3.0] Controle total dos agendamentos e assinaturas
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
          <Card className="p-8">
            <div className="text-center text-muted-foreground">Carregando...</div>
          </Card>
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
                scheduleBlocks={scheduleBlocks}
                timeSlots={TIME_SLOTS}
                getBarberColor={getBarberColor}
                renderAppointmentCard={renderAppointmentCard}
                setEditDialog={setEditDialog}
                handleDeleteBlock={handleDeleteBlock}
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
            onReopen={handleReopenAppointment}
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

  const getAppointmentDuration = (appointment: any) => {
    if (!appointment.services || appointment.services.length === 0) return 30;
    return appointment.services.reduce((sum: number, s: any) => sum + (Number(s.service?.duration) || 30), 0);
  };

  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

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
              const dateStr = format(currentDate, 'yyyy-MM-dd');
              const dropId = `${dateStr}|${time}|${barber.id}`;
              const currentMinutes = getMinutes(time);

              // Encontrar agendamento neste horário utilizando comparação robusta (Start Time)
              const appointment = appointments.find((a: Appointment) => {
                const aDate = new Date(a.date);
                try {
                  const appointmentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(aDate);
                  const appointmentTime = getManausTimeString(aDate);
                  return appointmentDate === dateStr && appointmentTime === time && a.barber?.id === barber.id;
                } catch (e) {
                  return false;
                }
              });

              // Verificar se é continuação de um agendamento anterior
              let continuationAppointment = null;
              if (!appointment) {
                continuationAppointment = appointments.find((a: Appointment) => {
                  const aDate = new Date(a.date);
                  try {
                    const appointmentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(aDate);
                    // Deve ser do mesmo dia e mesmo barbeiro
                    if (appointmentDate !== dateStr || a.barber?.id !== barber.id) return false;

                    const startTimeStr = getManausTimeString(aDate);
                    const startMinutes = getMinutes(startTimeStr);
                    const duration = getAppointmentDuration(a);
                    const endMinutes = startMinutes + duration;

                    // Verifica se o horário atual está dentro do intervalo (excluindo o início exato, que é o appointment principal)
                    return currentMinutes > startMinutes && currentMinutes < endMinutes;
                  } catch (e) {
                    return false;
                  }
                });
              }

              // Verificar se há bloqueio neste horário (usando fuso de Manaus para comparar a data)
              const block = scheduleBlocks.find((b: ScheduleBlock) => {
                const blockDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date(b.date));
                return blockDate === dateStr && b.barberId === barber.id && time >= b.startTime && time < b.endTime;
              });

              return (
                <TimeSlotCell
                  key={dropId}
                  id={dropId}
                  appointment={appointment}
                  continuationAppointment={continuationAppointment}
                  block={block}
                  renderAppointmentCard={renderAppointmentCard}
                  getBarberColor={getBarberColor}
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
  scheduleBlocks,
  timeSlots,
  getBarberColor,
  renderAppointmentCard,
  setEditDialog,
  handleDeleteBlock,
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

              // Agendamentos deste horário/dia
              const dayTimeAppointments = appointments.filter((a: Appointment) => {
                const aDate = new Date(a.date);
                try {
                  const appointmentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(aDate);
                  const appointmentTime = getManausTimeString(aDate);
                  return appointmentDate === dateStr && appointmentTime === time;
                } catch (e) {
                  return false;
                }
              });

              // Bloqueios deste horário/dia (usando fuso de Manaus para comparar a data)
              const dayTimeBlocks = (scheduleBlocks || []).filter((b: ScheduleBlock) => {
                const blockDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date(b.date));
                return blockDate === dateStr && time >= b.startTime && time < b.endTime;
              });

              return (
                <div key={`${dateStr}-${time}`} className="border border-border rounded p-1 min-h-[60px] space-y-1">
                  {dayTimeBlocks.map((block: ScheduleBlock) => (
                    <div key={block.id} className="relative p-1 rounded border-l-4 border-red-500 bg-red-50 text-xs group">
                      <div className="flex items-center gap-1">
                        <Ban className="w-3 h-3 text-red-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-red-700 truncate">
                          {block.barber?.name || 'Bloqueado'}
                        </span>
                      </div>
                      {block.reason && (
                        <div className="text-[10px] text-gray-600 truncate" title={block.reason}>
                          {block.reason}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Remover este bloqueio?')) {
                            handleDeleteBlock(block.id);
                          }
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5"
                        title="Remover bloqueio"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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
function TimeSlotCell({
  id,
  appointment,
  continuationAppointment,
  block,
  renderAppointmentCard,
  getBarberColor,
  onEmptySlotClick,
  onDeleteBlock
}: any) {
  const { useDraggable, useDroppable } = require('@dnd-kit/core');

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  const draggableId = appointment?.id;
  const isOnlineBooking = appointment?.isOnlineBooking;
  // Desabilitar drag para continuação, agendamentos online e bloqueios
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: draggableId || 'none',
    disabled: !appointment || isOnlineBooking || !!block,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Determine se a célula está ocupada (por start, continuação ou bloqueio)
  const isOccupied = appointment || continuationAppointment || block;

  // Cor para continuação
  const continuationColor = continuationAppointment && getBarberColor ? getBarberColor(continuationAppointment.barber.id) : null;

  return (
    <div
      ref={setDroppableRef}
      className={`
        border border-border rounded p-1 min-h-[60px] transition-colors
        ${isOver && !isOccupied ? 'bg-primary/10 border-primary' : ''}
        ${!isOccupied ? 'bg-background cursor-pointer hover:bg-primary/5 hover:border-primary/40' : ''}
        ${block ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''}
        ${continuationAppointment ? `${continuationColor?.bg || 'bg-secondary/30'} border-l-4 ${continuationColor?.border || 'border-primary/30'} opacity-70` : ''}
      `}
      onClick={() => {
        if (!isOccupied && onEmptySlotClick) {
          onEmptySlotClick();
        }
      }}
      title={
        !isOccupied ? 'Clique para criar novo atendimento' :
          block ? 'Horário bloqueado' :
            continuationAppointment ? `Em atendimento: ${continuationAppointment.client.name}` : ''
      }
    >
      {block ? (
        <div className="relative p-2 rounded border-l-4 border-red-500 bg-red-50 text-xs group h-full">
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
              e.stopPropagation();
              if (window.confirm('Remover este bloqueio?')) {
                onDeleteBlock(block.id);
              }
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5"
            title="Remover bloqueio"
          >
            <XCircle className="w-3 h-3" />
          </button>
        </div>
      ) : appointment ? (
        <div
          ref={setDraggableRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`${isDragging ? 'opacity-50' : ''} ${isOnlineBooking ? 'cursor-not-allowed' : 'cursor-grab'}`}
          title={isOnlineBooking ? 'Agendamento online - não pode ser arrastado' : 'Arrastar para reagendar'}
        >
          {renderAppointmentCard(appointment)}
        </div>
      ) : continuationAppointment ? (
        <div className="h-full w-full flex flex-col justify-center items-center text-muted-foreground/50">
          {/* Visual indicativo de continuação */}
          <div className="w-1 h-3 bg-current rounded-full opacity-20 mb-1"></div>
          <p className="text-[9px] font-medium opacity-50 truncate w-full text-center px-1">
            (cont. {continuationAppointment.client.name})
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}


// Componente: Dialog de Detalhes do Agendamento (com edição completa)
function AppointmentDetailsDialog({
  appointment,
  onClose,
  onMarkCompleted,
  onDelete,
  onUpdate,
  onReopen,
}: {
  appointment: Appointment;
  onClose: () => void;
  onMarkCompleted: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  onReopen?: (id: string) => void;
}) {
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    appointment.services.map(s => s.service.id)
  );
  const [selectedProductItems, setSelectedProductItems] = useState<any[]>(
    appointment.products?.map(p => ({
      productId: p.productId,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      product: p.product
    })) || []
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(appointment.paymentMethod);
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = appointment.status === 'COMPLETED';
  const isOnline = appointment.isOnlineBooking;

  useEffect(() => {
    if (isEditingServices) {
      fetchServices();
      fetchProducts();
    }
  }, [isEditingServices]);

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
      const isOnline = appointment.id.startsWith('online-');
      const realId = isOnline ? appointment.id.replace('online-', '') : appointment.id;
      const endpoint = isOnline ? `/api/online-bookings/${realId}` : `/api/appointments/${appointment.id}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          productItems: selectedProductItems.map(p => ({
            productId: p.productId,
            quantity: p.quantity
          }))
        }),
      });

      if (res.ok) {
        toast.success('Serviços atualizados com sucesso!');
        setIsEditingServices(false);
        onUpdate();
        onClose();
      } else {
        toast.error('Erro ao atualizar serviços');
      }
    } catch (error) {
      console.error('Error updating services:', error);
      toast.error('Erro ao atualizar serviços');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePaymentMethod = async () => {
    setIsUpdating(true);
    try {
      const isOnline = appointment.id.startsWith('online-');
      if (isOnline) {
        // Apenas atualiza o estado local para agendamentos online, 
        // já que a tabela OnlineBooking não tem paymentMethod.
        // O valor será salvo ao finalizar (converter em appointment).
        toast.success('Forma de pagamento selecionada para finalização.');
        setIsEditingPayment(false);
        setIsUpdating(false);
        return;
      }

      const res = await fetch(`/api/appointments/${appointment.id}`, {
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

  const addProduct = (product: any) => {
    if (selectedProductItems.find(p => p.productId === product.id)) {
      toast.error('Produto já adicionado');
      return;
    }
    setSelectedProductItems(prev => [
      ...prev,
      {
        productId: product.id,
        quantity: 1,
        unitPrice: product.price,
        product: product
      }
    ]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProductItems(prev => prev.filter(p => p.productId !== productId));
  };

  const updateProductQuantity = (productId: string, delta: number) => {
    setSelectedProductItems(prev => prev.map(p => {
      if (p.productId === productId) {
        return { ...p, quantity: Math.max(1, p.quantity + delta) };
      }
      return p;
    }));
  };

  const calculateTotal = () => {
    const servicesTotal = selectedServiceIds.reduce((sum, id) => {
      const service = services.find(s => s.id === id) || appointment.services.find(s => s.service.id === id)?.service;
      return sum + (service?.price || 0);
    }, 0);

    const productsTotal = selectedProductItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    return servicesTotal + productsTotal;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Detalhes do Agendamento
              {isOnline && (
                <Badge variant="outline" className="ml-2 border-blue-500 text-blue-600">
                  <Globe className="w-3 h-3 mr-1" />
                  ONLINE
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Cliente</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-foreground font-medium">{appointment.client.name}</p>
              {(appointment.isSubscriptionAppointment || appointment.client.isSubscriber) && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1 py-0 h-4 uppercase font-bold shrink-0">
                  <Award className="w-3 h-3 mr-1" />
                  ASSINANTE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{appointment.client.phone}</p>
            </div>
          </div>

          {/* Barbeiro e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <span className="text-sm font-semibold">Barbeiro</span>
              <p className="text-foreground font-medium mt-1">{appointment.barber.name}</p>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <span className="text-sm font-semibold">Data e Hora</span>
              <p className="text-foreground font-medium mt-1">
                {format(new Date(appointment.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Serviços */}
          <div className="bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Serviços</span>
              {(!isCompleted || onReopen) && !isEditingServices && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingServices(true)}
                  disabled={isCompleted && !onReopen} // Se estiver completo e não puder reabrir (ou se a intenção for editar direto, mas melhor reabrir primeiro)
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              )}
            </div>

            {isEditingServices ? (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 p-2 bg-background rounded cursor-pointer hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(service.price)} • {service.duration} min
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 mb-2">
                  <h4 className="text-sm font-semibold">Produtos</h4>
                </div>

                {/* Add Product Selector */}
                <div className="flex gap-2 mb-2">
                  <Select onValueChange={(val) => {
                    const product = products.find(p => p.id === val);
                    if (product) addProduct(product);
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Adicionar Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter(p => !selectedProductItems.find(sp => sp.productId === p.id))
                        .map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Products List */}
                <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                  {selectedProductItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2 bg-background rounded border border-secondary">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateProductQuantity(item.productId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateProductQuantity(item.productId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeProduct(item.productId)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {selectedProductItems.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum produto selecionado</p>
                  )}
                </div>
                {selectedServiceIds.length > 0 && (
                  <div className="bg-primary/10 p-3 rounded border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Novo Total:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingServices(false);
                      setSelectedServiceIds(appointment.services.map(s => s.service.id));
                      setSelectedProductItems(
                        appointment.products?.map(p => ({
                          productId: p.productId,
                          quantity: p.quantity,
                          unitPrice: p.unitPrice,
                          product: p.product
                        })) || []
                      );
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveServices}
                    disabled={isUpdating || selectedServiceIds.length === 0}
                    className="flex-1"
                  >
                    {isUpdating ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const isSubscriber = appointment.isSubscriptionAppointment || appointment.client.isSubscriber;
                  let calculatedServicesTotal = 0;

                  return (
                    <>
                      {appointment.services.map((s) => {
                        const sName = (s.service?.name || '').toLowerCase().trim();
                        const isIncluded = isSubscriber && (sName.includes('corte') || sName === 'corte');
                        const price = Number(s.service?.price) || 0;
                        const displayPrice = isIncluded ? 0 : price;
                        calculatedServicesTotal += displayPrice;

                        return (
                          <div key={s.service.id} className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-foreground">{s.service?.name || 'Serviço'}</span>
                              {isIncluded && <span className="text-[9px] text-amber-600 font-bold uppercase">Incluso na Assinatura</span>}
                            </div>
                            <span className={`font-semibold ${isIncluded ? 'text-amber-600' : 'text-primary'}`}>
                              {formatCurrency(Number(displayPrice) || 0)}
                            </span>
                          </div>
                        );
                      })}

                      {appointment.products?.map((p) => (
                        <div key={p.productId} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">{p.product.name} <span className="text-xs text-muted-foreground">(x{p.quantity})</span></span>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(p.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Totais */}
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <div className="flex justify-between items-center text-gold">
              <span className="font-medium text-lg">Valor Total:</span>
              <span className="font-bold text-2xl">
                {formatCurrency(
                  (() => {
                    const isSubscriber = appointment.isSubscriptionAppointment || appointment.client.isSubscriber;
                    // FIX: Se estiver concluído, usar o valor total salvo (que inclui descontos manuais)
                    if (appointment.status === 'COMPLETED') return Number(appointment.totalAmount) || 0;

                    if (!isSubscriber) return Number(appointment.totalAmount) || 0;

                    const servicesTotal = appointment.services.reduce((sum, s) => {
                      const sName = (s.service?.name || '').toLowerCase().trim();
                      const isIncluded = sName.includes('corte') || sName === 'corte';
                      return isIncluded ? sum : sum + (Number(s.service?.price) || 0);
                    }, 0);
                    const productsTotal = appointment.products?.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0) || 0;
                    return servicesTotal + productsTotal;
                  })()
                )}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-primary/20">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Comissão do Barbeiro</span>
                <span className="text-[10px] text-muted-foreground">
                  {appointment.isSubscriptionAppointment || appointment.client.isSubscriber
                    ? `Base: ${appointment.barber.hourlyRate || 0}/hora`
                    : `Base: ${appointment.barber.commissionRate || 0}% sobre serviços`}
                </span>
              </div>
              <span className="font-bold text-lg text-white">
                {formatCurrency(
                  (() => {
                    const isSub = (appointment.isSubscriptionAppointment || appointment.client.isSubscriber);
                    const amount = appointment.commission?.amount ?? appointment.commissionAmount;
                    if (amount !== undefined && amount !== null && !isNaN(Number(amount))) return Number(amount);

                    if (isSub) {
                      const totalMinutes = appointment.services?.reduce((sum, s) => sum + (Number(s.service?.duration) || 0), 0) || 0;
                      const rate = Number(appointment.barber?.hourlyRate) || 0;
                      return (totalMinutes / 60) * rate;
                    } else {
                      const sTotal = appointment.services?.reduce((sum, s) => sum + (Number(s.service?.price) || 0), 0) || 0;
                      const rate = Number(appointment.barber?.commissionRate) || 0;
                      return (sTotal * rate) / 100;
                    }
                  })() || 0
                )}
              </span>
            </div>
          </div>

          {/* Status e Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <span className="text-sm font-semibold">Status</span>
              <div className="mt-2">
                <Badge variant={isCompleted ? 'default' : 'secondary'}>
                  {isCompleted ? '✓ Concluído' : 'Agendado'}
                </Badge>
              </div>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Pagamento</span>
                {(!isCompleted || onReopen) && !isOnline && !isEditingPayment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPayment(true)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                )}
              </div>

              {isEditingPayment ? (
                <div className="space-y-3">
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
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
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePaymentMethod}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      {isUpdating ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <Badge variant="outline" className="text-base">
                    {paymentMethodLabels[appointment.paymentMethod]}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <span className="text-sm font-semibold">Observações</span>
              <p className="text-foreground text-sm mt-1 italic">{appointment.notes}</p>
            </div>
          )}

          {/* Alerta para agendamentos online */}
          {isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Agendamento feito pelo site público</p>
                  <p>Este agendamento foi criado através da página pública. Você pode gerenciá-lo normalmente aqui.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-end flex-wrap">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {isCompleted && onReopen && (
              <Button
                variant="outline"
                onClick={() => onReopen(appointment.id)}
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Reabrir / Corrigir
              </Button>
            )}
            {!isCompleted && (
              <>
                <Button
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkCompleted(appointment.id);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Finalizar Atendimento
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              onClick={() => onDelete(appointment.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

    </Dialog>
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
