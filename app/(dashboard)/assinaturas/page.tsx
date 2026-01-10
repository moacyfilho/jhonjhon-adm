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
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface PaymentLink {
  id: string;
  linkUrl: string;
  status: string;
  createdAt: string;
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

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    planName: '',
    amount: '',
    billingDay: '',
    servicesIncluded: '',
    usageLimit: '',
    observations: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchClients();
  }, [searchTerm, statusFilter]);

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

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Erro ao carregar clientes');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar clientes');
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
    setFormData({
      clientId: subscription.clientId,
      planName: subscription.planName,
      amount: subscription.amount.toString(),
      billingDay: subscription.billingDay.toString(),
      servicesIncluded: subscription.servicesIncluded || '',
      usageLimit: subscription.usageLimit?.toString() || '',
      observations: subscription.observations || '',
      status: subscription.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      planName: '',
      amount: '',
      billingDay: '',
      servicesIncluded: '',
      usageLimit: '',
      observations: '',
      status: 'ACTIVE',
    });
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

  const handleProcessRecurrence = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/process-recurrence');
      const data = await response.json();

      if (response.ok) {
        toast.success(`Concluído! ${data.created} novas contas geradas.`);
        fetchSubscriptions();
      } else {
        toast.error(data.error || 'Erro ao processar recorrência');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar recorrência');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Gestão de <span className="text-gold-500">Assinaturas</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Gerencie os clientes assinantes e gere links de cobrança
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleProcessRecurrence}
            className="border-white/10 text-white hover:bg-white/5 font-bold px-6 py-4 rounded-2xl h-auto"
            title="Gerar contas a receber para o mês atual"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Processar Mensalidades
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nova Assinatura
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
            <Input
              placeholder="Buscar por nome ou telefone do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white focus:ring-gold-500/50 focus:border-gold-500 rounded-2xl py-4"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || undefined)}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white/5 border-white/10 text-white rounded-2xl">
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
      </div>

      {/* Lista de Assinaturas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gold-500 font-serif italic">Carregando assinaturas...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-10 w-10 text-gray-600" />
          </div>
          <p className="text-gray-500 text-lg font-medium">Nenhuma assinatura encontrada</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="glass-panel p-6 rounded-3xl group hover:border-gold-500/30 transition-all duration-500"
            >
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-gold-500 transition-colors">
                      {subscription.client.name}
                    </h3>
                    <p className="text-sm text-gray-500">{subscription.client.phone}</p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{subscription.planName}</p>
                    <p className="text-3xl font-serif font-bold text-gold-500">
                      R$ {subscription.amount.toFixed(2)}
                      <span className="text-sm text-gray-500 font-normal">/mês</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                      Vencimento: dia {subscription.billingDay}
                    </p>
                  </div>

                  {subscription.servicesIncluded && (
                    <div className="text-sm text-gray-400 bg-white/5 rounded-xl p-3">
                      <span className="text-gold-500/80 font-medium">Serviços:</span> {subscription.servicesIncluded}
                    </div>
                  )}

                  {subscription.usageLimit && (
                    <div className="text-sm text-gray-400">
                      <span className="text-gold-500/80 font-medium">Limite:</span> {subscription.usageLimit} usos/mês
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGeneratePaymentLink(subscription)}
                      disabled={subscription.status !== 'ACTIVE'}
                      className="flex-1 border-gold-500/30 text-gold-500 hover:bg-gold-500/10 rounded-xl"
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Gerar Link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(subscription)}
                      className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSubscriptionToDelete(subscription.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingDay" className="text-sm font-bold text-white ml-1">Dia do Vencimento *</Label>
                    <Input
                      id="billingDay"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billingDay}
                      onChange={(e) => setFormData({ ...formData, billingDay: e.target.value })}
                      placeholder="1-31"
                      className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageLimit" className="text-sm font-bold text-white ml-1">Usos/Mês</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      min="1"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      placeholder="Ilimitado"
                      className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                    />
                  </div>

                  {selectedSubscription && (
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="status" className="text-sm font-bold text-white ml-1">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-[52px]">
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

                <div className="space-y-2">
                  <Label htmlFor="servicesIncluded" className="text-sm font-bold text-white ml-1">Serviços Incluídos</Label>
                  <Textarea
                    id="servicesIncluded"
                    value={formData.servicesIncluded}
                    onChange={(e) => setFormData({ ...formData, servicesIncluded: e.target.value })}
                    placeholder="Descreva os serviços incluídos na assinatura..."
                    rows={3}
                    className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-gold-500/50 focus:border-gold-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-sm font-bold text-white ml-1">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                    className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-gold-500/50 focus:border-gold-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-white/[0.02] border-t border-white/5 p-8 flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border-white/10 transition-all h-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="px-8 py-6 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold rounded-xl transition-all shadow-gold h-auto"
              >
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
