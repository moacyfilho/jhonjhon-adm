'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Award, Plus, Minus, Edit2, Trash2, CheckCircle, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
}

interface ServiceItem {
  serviceId: string;
  price: number;
}

interface ProductItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface AppointmentData {
  id?: string;
  clientId?: string;
  barberId?: string;
  date: string;
  totalAmount?: number;
  client?: Client;
  barber?: Barber;
  services?: Array<{ service: Service }>;
  products?: Array<{ product: Product; quantity: number; unitPrice: number }>;
  paymentMethod?: string;
  observations?: string;
  status?: string;
  isOnlineBooking?: boolean;
  onlineBookingId?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'PIX',
};

export function AppointmentEditDialog({
  appointment,
  isNew = false,
  onClose,
  onSave,
}: {
  appointment?: AppointmentData;
  isNew?: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dados disponíveis
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Dados do atendimento
  const [clientId, setClientId] = useState(appointment?.clientId || appointment?.client?.id || '');
  const [barberId, setBarberId] = useState(appointment?.barberId || appointment?.barber?.id || '');
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>(
    appointment?.services?.map(s => ({ serviceId: s.service.id, price: s.service.price })) || []
  );
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>(
    appointment?.products?.map(p => ({
      productId: p.product.id,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
    })) || []
  );
  const [paymentMethod, setPaymentMethod] = useState(appointment?.paymentMethod || 'PIX');
  const [observations, setObservations] = useState(appointment?.observations || '');

  // UI States
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [clientSearch, setClientSearch] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, barbersRes, servicesRes, productsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/barbers'),
        fetch('/api/services'),
        fetch('/api/products'),
      ]);

      const [clientsData, barbersData, servicesData, productsData] = await Promise.all([
        clientsRes.json(),
        barbersRes.json(),
        servicesRes.json(),
        productsRes.json(),
      ]);

      // Verificar assinantes ativos
      const clientsWithSubscription = await Promise.all(
        clientsData.map(async (client: Client) => {
          try {
            const subRes = await fetch(`/api/subscriptions?clientId=${client.id}`);
            if (subRes.ok) {
              const subs = await subRes.json();
              const hasActiveSubscription = subs.some((s: any) => s.status === 'ACTIVE');
              return { ...client, isSubscriber: hasActiveSubscription };
            }
          } catch (e) {
            console.error('Error checking subscription:', e);
          }
          return { ...client, isSubscriber: false };
        })
      );

      setClients(clientsWithSubscription.sort((a: Client, b: Client) => a.name.localeCompare(b.name)));
      setBarbers(barbersData.filter((b: any) => b.isActive).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setServices(servicesData.filter((s: any) => s.isActive).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setProducts(productsData.filter((p: any) => p.isActive && p.stock > 0).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getClient = () => clients.find(c => c.id === clientId);
  const getBarber = () => barbers.find(b => b.id === barberId);

  const getService = (serviceId: string) => services.find(s => s.id === serviceId);
  const getProduct = (productId: string) => products.find(p => p.id === productId);

  // Adicionar serviço
  const addService = (serviceId: string) => {
    const service = getService(serviceId);
    if (!service) return;

    if (selectedServices.find(s => s.serviceId === serviceId)) {
      toast.error('Serviço já adicionado');
      return;
    }

    setSelectedServices([...selectedServices, { serviceId, price: service.price }]);
  };

  // Remover serviço
  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.serviceId !== serviceId));
  };

  // Editar preço do serviço
  const updateServicePrice = (serviceId: string, newPrice: number) => {
    setSelectedServices(
      selectedServices.map(s => (s.serviceId === serviceId ? { ...s, price: newPrice } : s))
    );
  };

  // Adicionar produto
  const addProduct = (productId: string) => {
    const product = getProduct(productId);
    if (!product) return;

    if (selectedProducts.find(p => p.productId === productId)) {
      toast.error('Produto já adicionado');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      { productId, quantity: 1, unitPrice: product.price },
    ]);
  };

  // Remover produto
  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  // Atualizar quantidade do produto
  const updateProductQuantity = (productId: string, delta: number) => {
    setSelectedProducts(
      selectedProducts.map(p => {
        if (p.productId === productId) {
          const newQuantity = Math.max(1, p.quantity + delta);
          const product = getProduct(productId);
          if (product && newQuantity > product.stock) {
            toast.error(`Estoque insuficiente (disponível: ${product.stock})`);
            return p;
          }
          return { ...p, quantity: newQuantity };
        }
        return p;
      })
    );
  };

  // Editar preço do produto
  const updateProductPrice = (productId: string, newPrice: number) => {
    setSelectedProducts(prev =>
      prev.map(p => (p.productId === productId ? { ...p, unitPrice: newPrice } : p))
    );
  };

  // Calcular totais
  const servicesTotal = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const productsTotal = selectedProducts.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  // Para assinantes, sugerir o cálculo com Corte isento
  const client = getClient();
  const isSubscriber = client?.isSubscriber || false;

  let suggestedGrandTotal = servicesTotal + productsTotal;
  if (isSubscriber) {
    const nonSubscriptionServicesTotal = selectedServices.reduce((sum, item) => {
      const service = getService(item.serviceId);
      const isIncluded = service?.name?.toLowerCase().includes('corte');
      return isIncluded ? sum : sum + item.price;
    }, 0);
    suggestedGrandTotal = nonSubscriptionServicesTotal + productsTotal;
  }

  const grandTotal = suggestedGrandTotal;
  const discountAmount = discountValue > 0
    ? (discountType === 'percent'
      ? Math.min(grandTotal * discountValue / 100, grandTotal)
      : Math.min(discountValue, grandTotal))
    : 0;
  const finalTotal = Math.max(0, grandTotal - discountAmount);

  const barber = getBarber();
  const commissionAmount = barber ? (servicesTotal * barber.commissionRate) / 100 : 0;

  // Salvar atendimento
  const handleSave = async () => {
    // Validações
    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!barberId) {
      toast.error('Selecione um barbeiro');
      return;
    }
    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      toast.error('Adicione pelo menos um serviço ou produto');
      return;
    }

    // Para assinantes, não exigir forma de pagamento (usar PIX como padrão)
    if (!isSubscriber && !paymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    setSaving(true);
    try {
      const data = {
        clientId,
        barberId,
        date: appointment?.date || new Date().toISOString(),
        serviceItems: selectedServices.map(s => ({
          serviceId: s.serviceId,
          price: s.price
        })),
        productItems: selectedProducts.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
        })),
        totalAmount: discountValue > 0 ? finalTotal : undefined,
        paymentMethod: isSubscriber && finalTotal === 0 ? 'PIX' : paymentMethod,
        notes: observations || null,
        onlineBookingId: appointment?.onlineBookingId || null,
      };

      let res;
      if (isNew || !appointment?.id) {
        // Criar novo atendimento
        res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        // Verificar se é agendamento online e extrair ID real
        const isOnlineBooking = appointment.id.startsWith('online-');
        const realId = isOnlineBooking ? appointment.id.replace('online-', '') : appointment.id;
        const endpoint = isOnlineBooking ? `/api/online-bookings/${realId}` : `/api/appointments/${realId}`;

        // Para agendamentos online, converter para Appointment ao finalizar
        if (isOnlineBooking) {
          // Primeiro, criar o appointment baseado no online booking
          res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              onlineBookingId: realId,
            }),
          });

          if (res.ok) {
            // Marcar o online booking como COMPLETED
            await fetch(`/api/online-bookings/${realId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'COMPLETED' }),
            });
          }
        } else {
          // Atualizar atendimento existente normal
          res = await fetch(`/api/appointments/${realId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        }
      }

      if (res.ok) {
        toast.success(isNew ? 'Atendimento criado com sucesso!' : 'Atendimento atualizado com sucesso!');
        onSave();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao salvar atendimento');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Erro ao salvar atendimento');
    } finally {
      setSaving(false);
    }
  };

  const isOnline = appointment?.isOnlineBooking;

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <div className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                {isNew ? 'Novo Atendimento' : 'Editar Atendimento'}
                {isOnline && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    ONLINE
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente e Barbeiro */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </Label>
                {client ? (
                  <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </p>
                      </div>
                      {client.isSubscriber && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <Award className="w-3 h-3 mr-1" />
                          Assinante
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar cliente..."
                        className="pl-8"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>
                    <Select value={clientId} onValueChange={setClientId} disabled={!isNew && isOnline}>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients
                          .filter(c =>
                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                            c.phone.includes(clientSearch)
                          )
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{c.name} - {c.phone}</span>
                                {c.isSubscriber && (
                                  <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] px-1 py-0 h-4 uppercase font-bold shrink-0">
                                    ASSINANTE
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="barber">Barbeiro</Label>
                <Select value={barberId} onValueChange={setBarberId} disabled={!isNew && isOnline}>
                  <SelectTrigger id="barber" className="mt-2">
                    <SelectValue placeholder="Selecione um barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.commissionRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Tabs: Serviços e Produtos */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'services' | 'products')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="products">Produtos</TabsTrigger>
              </TabsList>

              {/* Tab: Serviços */}
              <TabsContent value="services" className="space-y-4">
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => {
                      addService(value);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services
                        .filter(s => !selectedServices.find(ss => ss.serviceId === s.id))
                        .map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {formatCurrency(service.price)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" disabled>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Lista de serviços selecionados */}
                <div className="space-y-2">
                  {selectedServices.map(item => {
                    const service = getService(item.serviceId);
                    if (!service) return null;
                    return (
                      <div key={item.serviceId} className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(service.price)} • {service.duration} min
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) =>
                                updateServicePrice(item.serviceId, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 h-8 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                              disabled
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => removeService(item.serviceId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedServices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum serviço selecionado
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Produtos */}
              <TabsContent value="products" className="space-y-4">
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => {
                      addProduct(value);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter(p => !selectedProducts.find(sp => sp.productId === p.id))
                        .map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)} (Estoque: {product.stock})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" disabled>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Lista de produtos selecionados */}
                <div className="space-y-2">
                  {selectedProducts.map(item => {
                    const product = getProduct(item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Preço base: {formatCurrency(product.price)}/{product.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1">
                              <Label className="text-[10px] text-muted-foreground">Preço Unit.</Label>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateProductPrice(item.productId, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 h-7 text-xs"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Qtde</Label>
                              <div className="flex items-center gap-1 bg-white rounded border px-1 py-0.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => updateProductQuantity(item.productId, -1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-2 h-2" />
                                </Button>
                                <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => updateProductQuantity(item.productId, 1)}
                                >
                                  <Plus className="w-2 h-2" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Label className="text-[10px] text-muted-foreground">Subtotal</Label>
                              <span className="text-xs font-bold w-20 text-right text-teal-700">
                                {formatCurrency(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 mt-4"
                              onClick={() => removeProduct(item.productId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum produto selecionado
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Resumo de Pagamento */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-teal-900">Resumo de pagamento</h3>
                {client?.isSubscriber && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 uppercase font-bold text-[10px]">
                    Assinante
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal Serviços:</span>
                  <span className="font-medium">{formatCurrency(servicesTotal)}</span>
                </div>
                {productsTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Subtotal Produtos:</span>
                    <span className="font-medium">{formatCurrency(productsTotal)}</span>
                  </div>
                )}

                {/* Desconto */}
                <div className="flex items-center gap-2 pt-1">
                  <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-sm flex-1">Desconto:</span>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'amount')}>
                    <SelectTrigger className="w-20 h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="amount">R$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-sm text-right bg-white"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max={discountType === 'percent' ? 100 : grandTotal}
                  />
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Desconto{discountType === 'percent' ? ` (${discountValue}%)` : ''}:</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col">
                    <span className="font-semibold">Valor a Pagar</span>
                    {discountAmount > 0 && (
                      <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(grandTotal)}</span>
                    )}
                  </div>
                  <span className="font-bold text-lg text-teal-700">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              {client?.isSubscriber && grandTotal === 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                  <p className="text-sm text-yellow-700 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Atendimento incluído na assinatura.
                  </p>
                </div>
              )}

              {/* Forma de Pagamento - Mostrar se valor > 0 ou se o usuário editou o valor */}
              {finalTotal > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-sm">Forma de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod" className="bg-white">
                      <SelectValue placeholder="Escolha uma forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Dinheiro</SelectItem>
                      <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="observations">Observações (Opcional)</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Adicione observações sobre o atendimento..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (selectedServices.length === 0 && selectedProducts.length === 0)}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : (isNew ? 'Agendar' : 'Salvar Alterações')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
