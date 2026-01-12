'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Link as LinkIcon,
  MessageSquare,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  RefreshCw,
  MoreVertical,
  Scissors,
  DollarSign,
  BarChart3,
  Users,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils'; // Assuming this exists or I'll implement local

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Subscription {
  id: string;
  clientId: string;
  planId?: string;
  planName: string;
  amount: number;
  billingDay: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  servicesIncluded?: string;
  usageLimit?: number;
  observations?: string;
  client: Client;
  plan?: Plan;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  paymentLink?: string;
  servicesIncluded: string | null;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface PaymentLink {
  id: string;
  linkUrl: string;
  status: string;
  createdAt: string;
}

export default function AssinaturasPage() {
  const [activeTab, setActiveTab] = useState('assinaturas');

  // Data States
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Dialog States
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Selection States
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'subscription' | 'plan', id: string } | null>(null);
  const [generatedLink, setGeneratedLink] = useState<PaymentLink | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  const [subFormData, setSubFormData] = useState({
    clientId: '',
    planId: 'custom', // 'custom' or plan ID
    planName: '',
    amount: '',
    billingDay: '',
    servicesIncluded: '',
    usageLimit: '',
    observations: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
  });

  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: '',
    paymentLink: '',
    servicesIncluded: [] as { serviceId: string, unlimited: boolean, quantity: number }[],
  });

  // Load Data
  useEffect(() => {
    fetchClients();
    fetchServices();
    fetchPlans();
    fetchSubscriptions();
  }, []); // Reload when needed

  useEffect(() => {
    fetchSubscriptions();
  }, [searchTerm, statusFilter]);

  // Fetch Functions
  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/subscriptions?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar assinaturas');
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      if (!response.ok) throw new Error('Erro ao carregar planos');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Erro ao carregar clientes');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Handlers for Subscription ---

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedSubscription
        ? `/api/subscriptions/${selectedSubscription.id}`
        : '/api/subscriptions';
      const method = selectedSubscription ? 'PATCH' : 'POST';

      const payload = {
        ...subFormData,
        amount: parseFloat(subFormData.amount),
        billingDay: parseInt(subFormData.billingDay),
        usageLimit: subFormData.usageLimit ? parseInt(subFormData.usageLimit) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erro ao salvar assinatura');

      toast.success(selectedSubscription ? 'Assinatura atualizada!' : 'Assinatura criada!');
      setIsSubDialogOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Handlers for Plans ---

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = selectedPlan
        ? `/api/plans/${selectedPlan.id}`
        : '/api/plans';
      const method = selectedPlan ? 'PATCH' : 'POST';

      // Format servicesIncluded to JSON string
      const servicesJSON = JSON.stringify(
        planFormData.servicesIncluded.reduce((acc, curr) => {
          acc[curr.serviceId] = { unlimited: curr.unlimited, quantity: curr.quantity };
          return acc;
        }, {} as Record<string, any>)
      );

      const payload = {
        name: planFormData.name,
        price: parseFloat(planFormData.price),
        paymentLink: planFormData.paymentLink,
        servicesIncluded: servicesJSON,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erro ao salvar plano');

      toast.success(selectedPlan ? 'Plano atualizado!' : 'Plano criado!');
      setIsPlanDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      setPlanFormData(prev => ({
        ...prev,
        servicesIncluded: [...prev.servicesIncluded, { serviceId, unlimited: false, quantity: 1 }]
      }));
    } else {
      setPlanFormData(prev => ({
        ...prev,
        servicesIncluded: prev.servicesIncluded.filter(s => s.serviceId !== serviceId)
      }));
    }
  };

  const updateServiceDetail = (serviceId: string, field: 'unlimited' | 'quantity', value: any) => {
    setPlanFormData(prev => ({
      ...prev,
      servicesIncluded: prev.servicesIncluded.map(s =>
        s.serviceId === serviceId ? { ...s, [field]: value } : s
      )
    }));
  };

  // --- Common Handlers ---

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const endpoint = itemToDelete.type === 'subscription'
        ? `/api/subscriptions/${itemToDelete.id}`
        : `/api/plans/${itemToDelete.id}`;

      await fetch(endpoint, { method: 'DELETE' });

      toast.success('Excluído com sucesso!');
      if (itemToDelete.type === 'subscription') fetchSubscriptions();
      else fetchPlans();

      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  // --- Helpers ---

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: { label: 'Ativa', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
      SUSPENDED: { label: 'Suspensa', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      CANCELLED: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    };
    const config = variants[status] || variants.ACTIVE;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.phone.includes(clientSearchTerm)
  );

  // Metrics Calculation (Placeholder for now, can be improved)
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
  const revenue = activeSubs.reduce((sum, s) => sum + s.amount, 0);
  const totalSubs = activeSubs.length;
  // Placeholder "Valor/Hora" (needs real hours data). 
  // For now, let's display Average Plan Value.
  const avgValue = totalSubs > 0 ? revenue / totalSubs : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Gestão de <span className="text-gold-500">Planos & Assinaturas</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Gerencie planos recorrentes e assinaturas de clientes
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'assinaturas' ? (
            <Button onClick={() => {
              setSubFormData({
                clientId: '',
                planId: 'custom',
                planName: '',
                amount: '',
                billingDay: '',
                servicesIncluded: '',
                usageLimit: '',
                observations: '',
                status: 'ACTIVE'
              });
              setSelectedSubscription(null);
              setIsSubDialogOpen(true);
            }} className="bg-gold-gradient text-black font-bold h-12 px-6 rounded-2xl">
              <Plus className="mr-2 h-5 w-5" /> Nova Assinatura
            </Button>
          ) : (
            <Button onClick={() => {
              setPlanFormData({
                name: '',
                price: '',
                paymentLink: '',
                servicesIncluded: []
              });
              setSelectedPlan(null);
              setIsPlanDialogOpen(true);
            }} className="bg-gold-gradient text-black font-bold h-12 px-6 rounded-2xl">
              <Plus className="mr-2 h-5 w-5" /> Novo Plano
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Receita Estimada</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                </h3>
              </div>
              <div className="h-10 w-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Assinaturas Ativas</p>
                <h3 className="text-2xl font-bold text-white mt-1">{totalSubs}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Médio</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgValue)}
                </h3>
              </div>
              <div className="h-10 w-10 bg-gold-500/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-gold-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Planos Disponíveis</p>
                <h3 className="text-2xl font-bold text-white mt-1">{plans.length}</h3>
              </div>
              <div className="h-10 w-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Scissors className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-between items-center">
          <TabsList className="bg-black/40 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="assinaturas" className="rounded-lg data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="planos" className="rounded-lg data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              Pacotes/Planos
            </TabsTrigger>
          </TabsList>

          {activeTab === 'assinaturas' && (
            <div className="flex gap-2 w-full max-w-sm">
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl"
              />
            </div>
          )}
        </div>

        <TabsContent value="assinaturas" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map(sub => (
              <div key={sub.id} className="glass-panel p-6 rounded-3xl group relative overflow-hidden border border-white/5 hover:border-gold-500/30 transition-all">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{sub.client.name}</h3>
                      <p className="text-sm text-gray-400">{sub.client.phone}</p>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gold-500 font-medium tracking-wide uppercase">{sub.planName}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif font-bold text-white">R$ {sub.amount.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">/mês</span>
                    </div>
                    <p className="text-xs text-gray-500">Vence dia {sub.billingDay}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl border-white/10 hover:bg-white/5"
                      onClick={() => {
                        setSelectedSubscription(sub);
                        setSubFormData({
                          clientId: sub.clientId,
                          planId: sub.planId || 'custom',
                          planName: sub.planName,
                          amount: sub.amount.toString(),
                          billingDay: sub.billingDay.toString(),
                          usageLimit: sub.usageLimit?.toString() || '',
                          servicesIncluded: sub.servicesIncluded || '',
                          observations: sub.observations || '',
                          status: sub.status
                        });
                        setIsSubDialogOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl text-red-500 hover:bg-red-500/10"
                      onClick={() => { setItemToDelete({ type: 'subscription', id: sub.id }); setIsDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-gold-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'} className={plan.isActive ? 'bg-green-500/10 text-green-500' : ''}>
                    {plan.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-serif font-bold text-gold-500">R$ {plan.price.toFixed(2)}</span>
                </div>
                <div className="space-y-2 mb-6">
                  {plan.servicesIncluded && (() => {
                    try {
                      const parsed = JSON.parse(plan.servicesIncluded);
                      return Object.entries(parsed).slice(0, 3).map(([svcId, details]: [string, any]) => {
                        const svcName = services.find(s => s.id === svcId)?.name || 'Serviço';
                        return (
                          <div key={svcId} className="flex items-center text-sm text-gray-400">
                            <CheckCircle2 className="h-3 w-3 mr-2 text-gold-500" />
                            {svcName}: {details.unlimited ? 'Ilimitado' : `${details.quantity}x`}
                          </div>
                        )
                      });
                    } catch (e) { return <span className="text-sm text-gray-500">Detalhes indisponíveis</span> }
                  })()}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 rounded-xl bg-white/5 hover:bg-white/10" variant="outline"
                    onClick={() => {
                      const parsed = plan.servicesIncluded ? JSON.parse(plan.servicesIncluded) : {};
                      const formattedServices = Object.entries(parsed).map(([id, det]: [string, any]) => ({
                        serviceId: id,
                        unlimited: det.unlimited,
                        quantity: det.quantity || 1
                      }));
                      setPlanFormData({
                        name: plan.name,
                        price: plan.price.toString(),
                        paymentLink: plan.paymentLink || '',
                        servicesIncluded: formattedServices
                      });
                      setSelectedPlan(plan);
                      setIsPlanDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-xl text-red-500 hover:bg-red-500/10"
                    onClick={() => { setItemToDelete({ type: 'plan', id: plan.id }); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Create/Edit Plan */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-xl bg-black/95 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? 'Editar Plano' : 'Cadastrar novo Pacote/Plano'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePlanSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do plano</Label>
                <Input
                  placeholder="Ex: Combo Cabelo + Barba"
                  value={planFormData.name}
                  onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do plano</Label>
                <Input
                  type="number" step="0.01"
                  value={planFormData.price}
                  onChange={e => setPlanFormData({ ...planFormData, price: e.target.value })}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link de cobrança</Label>
              <Input
                placeholder="Link para pagamento recorrente"
                value={planFormData.paymentLink}
                onChange={e => setPlanFormData({ ...planFormData, paymentLink: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase">
                <div className="col-span-6">Serviços</div>
                <div className="col-span-3 text-center">Ilimitado</div>
                <div className="col-span-3 text-center">Quantidade</div>
              </div>
              {services.filter(s => true /* active */).map(service => {
                const included = planFormData.servicesIncluded.find(i => i.serviceId === service.id);
                return (
                  <div key={service.id} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-6 flex items-center gap-2">
                      <Checkbox
                        checked={!!included}
                        onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                      />
                      <span className="text-sm">{service.name}</span>
                    </div>
                    <div className="col-span-3 flex justify-center">
                      {included && (
                        <Checkbox
                          checked={included.unlimited}
                          onCheckedChange={(c) => updateServiceDetail(service.id, 'unlimited', c)}
                        />
                      )}
                    </div>
                    <div className="col-span-3">
                      {included && !included.unlimited && (
                        <Input
                          type="number" min="1"
                          className="h-8 bg-white/5 border-white/10 text-center"
                          value={included.quantity}
                          onChange={(e) => updateServiceDetail(service.id, 'quantity', parseInt(e.target.value))}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-gold-gradient text-black font-bold">
                {submitting ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create/Edit Subscription */}
      <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
        <DialogContent className="max-w-lg bg-black/95 border-white/10 text-white">
          <DialogHeader><DialogTitle>{selectedSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubSubmit} className="space-y-4">
            {/* Similar fields to previous implementation but simplified */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={subFormData.clientId} onValueChange={v => setSubFormData({ ...subFormData, clientId: v })} disabled={!!selectedSubscription}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plano Base (Modelo)</Label>
              <Select value={subFormData.planId} onValueChange={(v) => {
                const selected = plans.find(p => p.id === v);
                if (selected) {
                  setSubFormData(prev => ({
                    ...prev,
                    planId: selected.id,
                    planName: selected.name,
                    amount: selected.price.toString(),
                    servicesIncluded: selected.servicesIncluded || '', // Raw JSON
                  }));
                } else {
                  setSubFormData(prev => ({ ...prev, planId: 'custom' }));
                }
              }}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Personalizado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado / Nenhum</SelectItem>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Plano (Exibição)</Label>
                <Input value={subFormData.planName} onChange={e => setSubFormData({ ...subFormData, planName: e.target.value })} className="bg-white/5 border-white/10" required />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={subFormData.amount} onChange={e => setSubFormData({ ...subFormData, amount: e.target.value })} className="bg-white/5 border-white/10" required type="number" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Cobrança</Label>
                <Input value={subFormData.billingDay} onChange={e => setSubFormData({ ...subFormData, billingDay: e.target.value })} className="bg-white/5 border-white/10" type="number" min="1" max="31" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={subFormData.status} onValueChange={(v: any) => setSubFormData({ ...subFormData, status: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativa</SelectItem>
                    <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Serviços Incluídos (JSON ou Texto)</Label>
              <Textarea value={subFormData.servicesIncluded} onChange={e => setSubFormData({ ...subFormData, servicesIncluded: e.target.value })} className="bg-white/5 border-white/10" rows={3} />
              <p className="text-xs text-gray-500">Para planos modelo, isso é preenchido automaticamente.</p>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsSubDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-gold-gradient text-black font-bold">
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-black/95 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
