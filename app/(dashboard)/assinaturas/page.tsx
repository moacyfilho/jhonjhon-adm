'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Package,
  User,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getBarberPhoto = (name: string) => {
  const normalized = name.toLowerCase();
  // Placeholder logic - replace with actual image paths if available
  if (normalized.includes('moacy')) return null;
  return null;
};

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Subscription {
  id: string;
  clientId: string;
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
  usageHistory?: Array<{
    id: string;
    usedDate: string;
    serviceDetails?: string;
  }>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  servicesIncluded?: string;
  usageLimit?: number;
  isActive: boolean;
}

interface PaymentLink {
  id: string;
  linkUrl: string;
  status: string;
  createdAt: string;
}

interface SubscriptionReport {
  metrics: {
    received: number;
    pending: number;
    total: number;
    totalHours: number;
    hourlyRate: number;
    frequency: number;
  };
  table: {
    serviceNames: string[];
    barbers: Array<{
      name: string;
      services: Record<string, { count: number; minutes: number }>;
      totalHours: number;
      totalValue: number;
      commission: number;
      house: number;
    }>;
  };
  subscribers: Array<{
    id: string;
    clientName: string;
    clientPhone: string;
    amount: number;
    billingDay: number;
    isPaid: boolean;
    usageCount: number;
    usageMinutes: number;
  }>;
}

export default function AssinaturasPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<PaymentLink | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dashboard State
  const [reportData, setReportData] = useState<SubscriptionReport | null>(null);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [loadingReport, setLoadingReport] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  // Resource States
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    clientId: '',
    planId: '',
    planName: '',
    amount: '',
    billingDay: '',
    servicesIncluded: '',
    usageLimit: '',
    observations: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
  });

  // Structured Selection State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string, quantity: number }>>([]);
  const [inclusionMode, setInclusionMode] = useState<'text' | 'structured'>('structured');

  useEffect(() => {
    fetchSubscriptions();
    fetchClients();
    fetchPlans();
    fetchReport();
    fetchResources();
  }, [searchTerm, statusFilter]);

  // Recarregar relatório quando a data mudar
  useEffect(() => {
    fetchReport();
  }, [reportDate]);

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      const dateStr = format(reportDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/reports/subscriptions?date=${dateStr}`);
      if (!response.ok) throw new Error('Erro ao carregar relatório');
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/subscriptions?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar assinaturas');
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      if (!response.ok) throw new Error('Erro ao carregar planos');
      const data = await response.json();
      setPlans(data.filter((p: SubscriptionPlan) => p.isActive));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar planos');
    }
  };

  const [clientSearchTerm, setClientSearchTerm] = useState('');

  const [subscriberSearch, setSubscriberSearch] = useState('');

  // Filter subscribers for the report table
  const filteredSubscribers = reportData?.subscribers.filter(sub =>
    sub.clientName.toLowerCase().includes(subscriberSearch.toLowerCase()) ||
    sub.clientPhone.includes(subscriberSearch)
  ) || [];

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

  const fetchResources = async () => {
    try {
      const [servicesRes, productsRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/products')
      ]);
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setAvailableServices(data.filter((s: any) => s.isActive));
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setAvailableProducts(data.filter((p: any) => p.isActive));
      }
    } catch (error) {
      console.error("Error fetching resources", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedSubscription
        ? `/api/subscriptions/${selectedSubscription.id}`
        : '/api/subscriptions';

      const method = selectedSubscription ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        billingDay: parseInt(formData.billingDay),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        servicesIncluded: inclusionMode === 'structured'
          ? JSON.stringify({
            services: selectedServices,
            products: selectedProducts
          })
          : formData.servicesIncluded,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar assinatura');
      }

      toast.success(
        selectedSubscription
          ? 'Assinatura atualizada com sucesso!'
          : 'Assinatura criada com sucesso!'
      );
      setIsDialogOpen(false);
      resetForm();
      fetchSubscriptions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!subscriptionToDelete) return;

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir assinatura');

      toast.success('Assinatura excluída com sucesso!');
      setIsDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir assinatura');
    }
  }


  const handleMonthChange = (direction: 'prev' | 'next') => {
    setReportDate(curr => direction === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1));
  };


  const handleGeneratePaymentLink = async (subscription: Subscription) => {
    try {
      // Primeiro, criar uma conta a receber para esta assinatura
      const dueDate = new Date();
      dueDate.setDate(subscription.billingDay);
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      const accountResponse = await fetch('/api/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Assinatura - ${subscription.planName} - ${subscription.client.name}`,
          category: 'SUBSCRIPTION',
          payer: subscription.client.name,
          clientId: subscription.clientId,
          phone: subscription.client.phone,
          amount: subscription.amount,
          dueDate: dueDate.toISOString(),
        }),
      });

      if (!accountResponse.ok) {
        throw new Error('Erro ao criar conta a receber');
      }

      const account = await accountResponse.json();

      // Agora gerar o link de pagamento
      const linkResponse = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountReceivableId: account.id,
          expiryDays: 7, // Link expira em 7 dias
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('Erro ao gerar link de pagamento');
      }

      const link = await linkResponse.json();
      setGeneratedLink(link);
      setSelectedSubscription(subscription);
      setIsLinkDialogOpen(true);
      toast.success('Link de pagamento gerado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.linkUrl);
      toast.success('Link copiado para área de transferência!');
    }
  };

  const handleSendWhatsApp = () => {
    if (!generatedLink || !selectedSubscription) return;

    const phone = selectedSubscription.client.phone.replace(/\D/g, '');
    const message = `Olá, ${selectedSubscription.client.name}! Segue o link para pagamento da sua assinatura (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}): ${generatedLink.linkUrl}`;
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;

    // Marcar link como enviado
    fetch(`/api/payment-links/${generatedLink.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent', sentAt: new Date().toISOString() }),
    });

    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp Web...');
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedSubscription(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    // Try parsing servicesIncluded
    let parsedServices: string[] = [];
    let parsedProducts: Array<{ id: string, quantity: number }> = [];
    let mode: 'text' | 'structured' = 'text';

    if (subscription.servicesIncluded) {
      try {
        const parsed = JSON.parse(subscription.servicesIncluded);
        if (parsed.services || parsed.products) {
          parsedServices = parsed.services || [];
          parsedProducts = parsed.products || [];
          mode = 'structured';
        }
      } catch (e) {
        // Not JSON, simple text
        mode = 'text';
      }
    }

    setFormData({
      clientId: subscription.clientId,
      planId: '',
      planName: subscription.planName,
      amount: subscription.amount.toString(),
      billingDay: subscription.billingDay.toString(),
      servicesIncluded: subscription.servicesIncluded || '',
      usageLimit: subscription.usageLimit?.toString() || '',
      observations: subscription.observations || '',
      status: subscription.status,
    });

    setSelectedServices(parsedServices);
    setSelectedProducts(parsedProducts);
    setInclusionMode(mode);

    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      planId: '',
      planName: '',
      amount: '',
      billingDay: '',
      servicesIncluded: '',
      usageLimit: '',
      observations: '',
      status: 'ACTIVE',
    });
    setSelectedServices([]);
    setSelectedProducts([]);
    setInclusionMode('structured');
    setClientSearchTerm('');
  };

  // Filtrar clientes baseado na pesquisa
  const filteredClients = clients.filter((client) => {
    if (!clientSearchTerm) return true;
    const searchLower = clientSearchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      ACTIVE: {
        label: 'Ativa',
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
        icon: CheckCircle2,
      },
      SUSPENDED: {
        label: 'Suspensa',
        className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        icon: Clock,
      },
      CANCELLED: {
        label: 'Cancelada',
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: XCircle,
      },
    };

    const config = variants[status] || variants.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h${mins.toString().padStart(2, '0')}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os clientes assinantes e gere links de cobrança
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-[#1a1a1a] hover:bg-[#333] text-white border border-[#333]">
            <Package className="mr-2 h-4 w-4" />
            Planos
          </Button>
          <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Assinatura
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal com Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-8 bg-[#1a1a1a]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gold data-[state=active]:text-black">Visão Geral</TabsTrigger>
          <TabsTrigger value="management" className="data-[state=active]:bg-gold data-[state=active]:text-black">Gerenciar</TabsTrigger>
        </TabsList>

        {/* TAB: VISÃO GERAL (Dashboard) */}
        <TabsContent value="overview" className="space-y-6">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-4 bg-[#1a1a1a] p-2 rounded-md border border-[#333] w-fit mb-4">
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')} className="h-8 w-8 text-white hover:bg-white/10">
              <span className="text-lg">←</span>
            </Button>
            <div className="text-center min-w-[150px]">
              <h2 className="text-sm font-semibold capitalize text-white">
                {format(reportDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')} className="h-8 w-8 text-white hover:bg-white/10">
              <span className="text-lg">→</span>
            </Button>
          </div>

          {loadingReport ? (
            <div className="text-center py-12">Carregando relatório...</div>
          ) : reportData ? (
            <>
              {/* Cards Metrics - Grid 2 colunas como na foto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Linha 1 */}
                <Card className="bg-[#78e068] border-none text-black">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm opacity-80 mb-1">Recebidas</p>
                    <h3 className="text-2xl font-bold">R$ {reportData.metrics.received.toFixed(2).replace('.', ',')}</h3>
                  </CardContent>
                </Card>

                <Card className="bg-[#dca5a5] border-none text-black bg-opacity-90" style={{ backgroundColor: '#c76e78' }}>
                  <CardContent className="p-4">
                    <p className="font-bold text-sm text-black/70 mb-1">A receber</p>
                    <h3 className="text-2xl font-bold text-black/90">R$ {reportData.metrics.pending.toFixed(2).replace('.', ',')}</h3>
                  </CardContent>
                </Card>

                {/* Linha 2 */}
                <Card className="bg-[#888888] border-none text-white">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm opacity-80 mb-1">Total</p>
                    <h3 className="text-2xl font-bold">R$ {reportData.metrics.total.toFixed(2).replace('.', ',')}</h3>
                  </CardContent>
                </Card>

                <Card className="bg-[#e6d845] border-none text-black">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm opacity-80 mb-1">Valor/Hora</p>
                    <h3 className="text-2xl font-bold">R$ {reportData.metrics.hourlyRate.toFixed(2).replace('.', ',')}</h3>
                  </CardContent>
                </Card>

                {/* Linha 3 */}
                <Card className="bg-[#56a7c4] border-none text-white">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm opacity-80 mb-1">Frequência</p>
                    <h3 className="text-2xl font-bold">{reportData.metrics.frequency.toFixed(1).replace('.', ',')} vezes</h3>
                  </CardContent>
                </Card>

                <Card className="bg-[#93bdcf] border-none text-black">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm opacity-80 mb-1">Atendimento</p>
                    <h3 className="text-2xl font-bold">{formatMinutesToHours(reportData.metrics.totalHours * 60)}</h3>
                  </CardContent>
                </Card>

              </div>

              {/* Lista de Assinantes - Tabela Detalhada */}
              <Card className="bg-[#1a1a1a] border-[#333] text-[#ddd] mt-6">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex gap-4">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">Todos ({reportData.subscribers.length})</Button>
                    <div className="flex gap-2 text-xs text-muted-foreground items-center">
                      <span>Rec: ({reportData.subscribers.filter(s => s.isPaid).length})</span>
                      <span>A rec: ({reportData.subscribers.filter(s => !s.isPaid).length})</span>
                    </div>
                  </div>
                  <div className="w-[200px]">
                    <Input
                      placeholder="Pesquisar Assinante"
                      className="h-8 bg-[#111] border-[#333] text-xs"
                      value={subscriberSearch}
                      onChange={(e) => setSubscriberSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-[#333] hover:bg-transparent">
                        <TableHead className="text-xs font-bold text-muted-foreground w-[50px]">Pgto</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Cliente</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Número</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Valor</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground">Data venc.</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground text-right">Frequência/Mês</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((sub) => (
                        <TableRow key={sub.id} className="border-b-[#333] hover:bg-white/5">
                          <TableCell>
                            <div className={`w-4 h-4 rounded-sm ${sub.isPaid ? 'bg-green-500' : 'bg-red-500/50'}`}></div>
                          </TableCell>
                          <TableCell className="font-medium text-sm text-gray-300">{sub.clientName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{sub.clientPhone}</TableCell>
                          <TableCell className="text-xs text-gray-400">R$ {sub.amount.toFixed(2).replace('.', ',')}</TableCell>
                          <TableCell className="text-xs text-gray-400 max-w-[50px]">{sub.billingDay}</TableCell>
                          <TableCell className="text-xs text-right text-gray-400">
                            {formatMinutesToHours(sub.usageMinutes)} / {sub.usageCount} vezes
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSubscribers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum assinante encontrado com atividade neste período.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333] text-[#ddd]">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-white">Resumo por Profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-[#222] hover:bg-[#222] border-b-[#444]">
                          <TableHead className="w-[200px] font-bold text-white relative h-24">
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gold/10 p-2 rounded-tl-lg">
                              <span className="text-xs font-bold uppercase tracking-wider text-gold">Assinaturas</span>
                              <div className="mt-1 flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground uppercase">Valor da hora</span>
                                <span className="text-sm font-bold text-white">R$ {reportData.metrics.hourlyRate.toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          </TableHead>
                          {reportData.table.barbers.map((barber) => {
                            const photo = getBarberPhoto(barber.name);
                            return (
                              <TableHead key={barber.name} className="text-center font-bold text-white border-x border-[#333] h-24">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gold/30">
                                    {photo ? (
                                      <Image src={photo} alt={barber.name} fill className="object-cover" />
                                    ) : (
                                      <div className="bg-muted w-full h-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs">{barber.name.split(' ')[0]}</span>
                                </div>
                              </TableHead>
                            );
                          })}
                          <TableHead className="text-center font-bold bg-[#111] text-white border-l border-[#444]">
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gold bg-[#000] flex items-center justify-center">
                                <Image src="/logo.png" alt="Logo" width={32} height={32} className="opacity-80" />
                              </div>
                              <span className="text-xs">Casa</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.table.serviceNames.map((serviceName, sIdx) => (
                          <TableRow key={serviceName} className={`border-b-[#333] ${sIdx % 2 === 0 ? 'bg-white/5' : ''}`}>
                            <TableCell className="font-bold text-[11px] uppercase text-white/70 bg-[#222]/50 border-r border-[#333]">
                              {serviceName}
                            </TableCell>
                            {reportData.table.barbers.map((barber, idx) => {
                              const svc = barber.services[serviceName];
                              return (
                                <TableCell key={idx} className="text-center border-x border-[#333]">
                                  {svc ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-sm font-medium text-white">{svc.count}</span>
                                      <span className="text-[10px] text-white/50">
                                        ({formatMinutesToHours(svc.minutes)})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-white/20 text-xs">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center bg-[#111]/80 font-semibold border-l border-[#444]">
                              {(() => {
                                let totalCount = 0;
                                let totalMinutes = 0;
                                reportData.table.barbers.forEach(b => {
                                  const s = b.services[serviceName];
                                  if (s) {
                                    totalCount += s.count;
                                    totalMinutes += s.minutes;
                                  }
                                });
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-bold text-white">{totalCount}</span>
                                    <span className="text-[10px] text-white/50">({formatMinutesToHours(totalMinutes)})</span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Totais Gerais */}
                        <TableRow className="bg-[#2a2a2a] font-medium border-t-2 border-t-[#444]">
                          <TableCell className="text-xs font-bold text-white uppercase">Horas em atendimentos</TableCell>
                          {reportData.table.barbers.map((barber, idx) => (
                            <TableCell key={idx} className="text-center text-white border-x border-[#333] py-4">
                              <span className="text-sm font-bold">{formatMinutesToHours(barber.totalHours * 60)}</span>
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-[#111] font-bold text-white border-l border-[#444]">
                            {formatMinutesToHours(reportData.metrics.totalHours * 60)}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-[#333]">
                          <TableCell className="text-xs font-bold text-white/80 uppercase">Total</TableCell>
                          {reportData.table.barbers.map((barber, idx) => (
                            <TableCell key={idx} className="text-center text-white/90 border-x border-[#444]">
                              <span className="text-sm">R${barber.totalValue.toFixed(2).replace('.', ',')}</span>
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-[#000] font-bold text-white border-l border-[#555]">
                            R${reportData.metrics.received.toFixed(2).replace('.', ',')}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-[#333]/80">
                          <TableCell className="text-xs font-bold text-white/80 uppercase">Comissão</TableCell>
                          {reportData.table.barbers.map((barber, idx) => (
                            <TableCell key={idx} className="text-center text-green-400 font-bold border-x border-[#444]">
                              R${barber.commission.toFixed(2).replace('.', ',')}
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-[#000] font-bold text-green-500 border-l border-[#555]">
                            R${reportData.table.barbers.reduce((acc, b) => acc + b.commission, 0).toFixed(2).replace('.', ',')}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-[#059669]/20">
                          <TableCell className="text-xs font-extrabold text-[#10b981] uppercase">Casa</TableCell>
                          {reportData.table.barbers.map((barber, idx) => (
                            <TableCell key={idx} className="text-center text-[#10b981] font-bold border-x border-[#10b981]/20">
                              R${barber.house.toFixed(2).replace('.', ',')}
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-[#059669] font-extrabold text-white">
                            R${reportData.table.barbers.reduce((acc, b) => acc + b.house, 0).toFixed(2).replace('.', ',')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* TAB: GERENCIAR ASSINATURAS (Antiga View) */}
        <TabsContent value="management" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone do cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || undefined)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativas</SelectItem>
                    <SelectItem value="SUSPENDED">Suspensas</SelectItem>
                    <SelectItem value="CANCELLED">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Assinaturas */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando assinaturas...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{subscription.client.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{subscription.client.phone}</p>
                      </div>
                      {getStatusBadge(subscription.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{subscription.planName}</p>
                      <p className="text-2xl font-bold text-gold">
                        R$ {subscription.amount.toFixed(2)}
                        <span className="text-sm text-muted-foreground font-normal">/mês</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vencimento: dia {subscription.billingDay}
                      </p>
                    </div>

                    {subscription.servicesIncluded && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Serviços:</strong> {subscription.servicesIncluded}
                      </div>
                    )}

                    {subscription.usageLimit && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Limite:</strong> {subscription.usageLimit} usos/mês
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGeneratePaymentLink(subscription)}
                        disabled={subscription.status !== 'ACTIVE'}
                        className="flex-1"
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Gerar Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(subscription)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSubscriptionToDelete(subscription.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Criar/Editar Assinatura */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clientId">Cliente *</Label>
                {!selectedSubscription && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nome ou telefone..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  disabled={!!selectedSubscription}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClients.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="planId">Plano de Assinatura (Opcional)</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(value) => {
                    const plan = plans.find(p => p.id === value);
                    if (plan) {
                      setFormData({
                        ...formData,
                        planId: value,
                        planName: plan.name,
                        amount: plan.price.toString(),
                        servicesIncluded: plan.servicesIncluded || '',
                        usageLimit: plan.usageLimit?.toString() || '',
                      });
                    } else {
                      setFormData({ ...formData, planId: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano pré-cadastrado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Personalizado (sem plano)</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Selecionar um plano preencherá automaticamente os campos abaixo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planName">Nome do Plano *</Label>
                <Input
                  id="planName"
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="Ex: Plano Premium Mensal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingDay">Dia do Vencimento *</Label>
                <Input
                  id="billingDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingDay}
                  onChange={(e) => setFormData({ ...formData, billingDay: e.target.value })}
                  placeholder="1-31"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageLimit">Limite de Usos/Mês</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Deixe em branco para ilimitado"
                />
              </div>

              {selectedSubscription && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativa</SelectItem>
                      <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2 border p-3 rounded-md bg-secondary/20">
              <div className="flex justify-between items-center mb-2">
                <Label>Itens Inclusos</Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setInclusionMode('structured')}
                    className={`px-2 py-1 rounded ${inclusionMode === 'structured' ? 'bg-gold text-black font-bold' : 'bg-secondary text-muted-foreground'}`}
                  >
                    Seleção
                  </button>
                  <button
                    type="button"
                    onClick={() => setInclusionMode('text')}
                    className={`px-2 py-1 rounded ${inclusionMode === 'text' ? 'bg-gold text-black font-bold' : 'bg-secondary text-muted-foreground'}`}
                  >
                    Texto Livre
                  </button>
                </div>
              </div>

              {inclusionMode === 'structured' ? (
                <div className="space-y-4">
                  {/* Services Selection */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Serviços</Label>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2">
                      {availableServices.map(service => (
                        <label key={service.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedServices([...selectedServices, service.id]);
                              else setSelectedServices(selectedServices.filter(id => id !== service.id));
                            }}
                            className="rounded border-gray-500 bg-transparent"
                          />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Products Selection */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Produtos</Label>
                    <div className="flex gap-2 mb-2">
                      <Select onValueChange={(val) => {
                        if (!selectedProducts.find(p => p.id === val)) {
                          setSelectedProducts([...selectedProducts, { id: val, quantity: 1 }]);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Adicionar Produto ao Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts
                            .filter(p => !selectedProducts.find(sp => sp.id === p.id))
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      {selectedProducts.map(item => {
                        const product = availableProducts.find(p => p.id === item.id);
                        return (
                          <div key={item.id} className="flex justify-between items-center bg-secondary/40 p-1.5 rounded text-sm">
                            <span>{product?.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Qtd:</span>
                              <Input
                                type="number"
                                min="1"
                                className="h-6 w-12 text-center p-0"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setSelectedProducts(selectedProducts.map(p => p.id === item.id ? { ...p, quantity: val } : p));
                                }}
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setSelectedProducts(selectedProducts.filter(p => p.id !== item.id))}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <Textarea
                  id="servicesIncluded"
                  value={formData.servicesIncluded}
                  onChange={(e) => setFormData({ ...formData, servicesIncluded: e.target.value })}
                  placeholder="Descreva os serviços incluídos na assinatura..."
                  rows={3}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gold text-white hover:bg-gold/90">
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Link de Pagamento Gerado */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Pagamento Gerado</DialogTitle>
          </DialogHeader>
          {generatedLink && selectedSubscription && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <p className="text-sm font-medium">{selectedSubscription.client.name}</p>
                <p className="text-sm text-muted-foreground">{selectedSubscription.client.phone}</p>
              </div>

              <div className="space-y-2">
                <Label>Plano/Valor</Label>
                <p className="text-sm">
                  {selectedSubscription.planName} - R$ {selectedSubscription.amount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link de Pagamento</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink.linkUrl} readOnly className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Enviar pelo WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLinkDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
