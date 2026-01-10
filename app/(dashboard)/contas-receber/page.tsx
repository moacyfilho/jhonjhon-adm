'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Pencil, Trash2, DollarSign, CheckCircle, Filter, MessageSquare, Link as LinkIcon, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-user';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface AccountReceivable {
  id: string;
  description: string;
  category: string;
  payer: string | null;
  clientId: string | null;
  phone: string | null;
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentMethod: string | null;
  observations: string | null;
  client?: Client;
}

const categoryLabels: Record<string, string> = {
  SERVICES_INCOME: 'Receita de Serviços',
  PRODUCTS_INCOME: 'Receita de Produtos',
  SUBSCRIPTION: 'Assinatura',
  OTHER_INCOME: 'Outras Receitas',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Recebido',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PAID: 'bg-green-500',
  OVERDUE: 'bg-red-500',
  CANCELLED: 'bg-gray-500',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'PIX',
};

export default function ContasReceberPage() {
  const { user } = useUser();
  const isAdmin = user?.user_metadata?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [showOnlySubscriptions, setShowOnlySubscriptions] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    payer: '',
    clientId: '',
    phone: '',
    amount: '',
    dueDate: '',
    observations: '',
  });

  const [clients, setClients] = useState<Client[]>([]);

  // Formulário de pagamento
  const [paymentData, setPaymentData] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
  });

  useEffect(() => {
    fetchAccounts();
    fetchClients();
  }, [filterStatus, filterCategory, showOnlySubscriptions]);

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

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);

      // Se showOnlySubscriptions estiver ativo, força filtro de SUBSCRIPTION
      if (showOnlySubscriptions) {
        params.append('category', 'SUBSCRIPTION');
      } else if (filterCategory) {
        params.append('category', filterCategory);
      }

      const response = await fetch(`/api/accounts-receivable?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.category || !formData.amount || !formData.dueDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Para assinaturas, telefone é obrigatório
    if (formData.category === 'SUBSCRIPTION' && !formData.phone) {
      toast.error('Telefone é obrigatório para assinaturas');
      return;
    }

    try {
      const url = selectedAccount
        ? `/api/accounts-receivable/${selectedAccount.id}`
        : '/api/accounts-receivable';
      const method = selectedAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          selectedAccount
            ? 'Conta atualizada com sucesso!'
            : 'Conta cadastrada com sucesso!'
        );
        setDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao salvar conta');
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast.error('Erro ao salvar conta');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccount || !paymentData.paymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    try {
      const response = await fetch(`/api/accounts-receivable/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
        }),
      });

      if (response.ok) {
        toast.success('Recebimento registrado com sucesso!');
        setPaymentDialogOpen(false);
        setSelectedAccount(null);
        setPaymentData({
          paymentDate: format(new Date(), 'yyyy-MM-dd'),
          paymentMethod: '',
        });
        fetchAccounts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao registrar recebimento');
      }
    } catch (error) {
      console.error('Erro ao registrar recebimento:', error);
      toast.error('Erro ao registrar recebimento');
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(`/api/accounts-receivable/${selectedAccount.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Conta excluída com sucesso!');
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao excluir conta');
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      category: '',
      payer: '',
      clientId: '',
      phone: '',
      amount: '',
      dueDate: '',
      observations: '',
    });
    setSelectedAccount(null);
  };

  const openEditDialog = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setFormData({
      description: account.description,
      category: account.category,
      payer: account.payer || '',
      clientId: account.clientId || '',
      phone: account.phone || '',
      amount: account.amount.toString(),
      dueDate: format(new Date(account.dueDate), 'yyyy-MM-dd'),
      observations: account.observations || '',
    });
    setDialogOpen(true);
  };

  const openPaymentDialog = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setPaymentData({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
    });
    setPaymentDialogOpen(true);
  };

  const openDeleteDialog = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleGeneratePaymentLink = async (account: AccountReceivable) => {
    try {
      const linkResponse = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountReceivableId: account.id,
          expiryDays: 7,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('Erro ao gerar link de pagamento');
      }

      const link = await linkResponse.json();

      // Copiar link para área de transferência
      navigator.clipboard.writeText(link.linkUrl);
      toast.success('Link de pagamento gerado e copiado!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleSendWhatsApp = async (account: AccountReceivable) => {
    try {
      // Gerar o link primeiro
      const linkResponse = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountReceivableId: account.id,
          expiryDays: 7,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('Erro ao gerar link de pagamento');
      }

      const link = await linkResponse.json();

      // Preparar mensagem
      const phone = account.phone?.replace(/\\D/g, '') || '';
      const clientName = account.payer || 'Cliente';
      const competencia = format(new Date(account.dueDate), 'MMMM/yyyy', { locale: ptBR });
      const message = `Olá, ${clientName}! Segue o link para pagamento da sua assinatura (${competencia}): ${link.linkUrl}`;
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;

      // Marcar link como enviado
      await fetch(`/api/payment-links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent', sentAt: new Date().toISOString() }),
      });

      window.open(whatsappUrl, '_blank');
      toast.success('Abrindo WhatsApp Web...');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        clientId: client.id,
        payer: client.name,
        phone: client.phone,
      });
    }
  };

  const getTotalPending = () => {
    return accounts
      .filter((acc) => acc.status === 'PENDING' || acc.status === 'OVERDUE')
      .reduce((sum, acc) => sum + acc.amount, 0);
  };

  const getTotalReceived = () => {
    return accounts
      .filter((acc) => acc.status === 'PAID')
      .reduce((sum, acc) => sum + acc.amount, 0);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Contas a <span className="text-gold-500">Receber</span>
          </h1>
          <p className="text-gray-500 font-medium">Gerencie as receitas da barbearia</p>
        </div>
        <Button
          className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Conta
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent onClose={() => {
          setDialogOpen(false);
          resetForm();
        }}>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Venda de produtos"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.category === 'SUBSCRIPTION' && (
                <div>
                  <Label htmlFor="clientId">Selecionar Cliente *</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={handleClientSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="payer">
                  Pagador/Cliente {formData.category === 'SUBSCRIPTION' && '*'}
                </Label>
                <Input
                  id="payer"
                  value={formData.payer}
                  onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                  placeholder="Nome do pagador"
                  required={formData.category === 'SUBSCRIPTION'}
                  disabled={formData.category === 'SUBSCRIPTION' && !!formData.clientId}
                />
              </div>

              {formData.category === 'SUBSCRIPTION' && (
                <div>
                  <Label htmlFor="phone">Telefone (com DDD) *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    required
                    disabled={!!formData.clientId}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Data de Vencimento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black font-bold">
                {selectedAccount ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest">Total Pendente</p>
              <p className="text-3xl font-serif font-bold text-amber-500">
                R$ {getTotalPending().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-green-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-green-500/60 uppercase tracking-widest">Total Recebido</p>
              <p className="text-3xl font-serif font-bold text-green-500">
                R$ {getTotalReceived().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-gold-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
              <Filter className="h-8 w-8 text-gold-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gold-500/60 uppercase tracking-widest">Total de Contas</p>
              <p className="text-3xl font-serif font-bold text-white">{accounts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel p-6 rounded-3xl">
        <h3 className="text-lg font-serif font-bold text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-gold-500" />
          Filtros
        </h3>

        {/* Filtro rápido de assinaturas */}
        <div className="mb-4">
          <Button
            variant={showOnlySubscriptions ? "default" : "outline"}
            onClick={() => {
              setShowOnlySubscriptions(!showOnlySubscriptions);
              if (!showOnlySubscriptions) {
                setFilterCategory(undefined);
              }
            }}
            className={showOnlySubscriptions
              ? "bg-gold-500 text-black font-bold hover:bg-gold-600"
              : "border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
            }
          >
            <Filter className="mr-2 h-4 w-4" />
            {showOnlySubscriptions ? "Mostrando apenas Assinaturas" : "Filtrar Assinaturas"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400 text-sm uppercase tracking-wide">Status</Label>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value || undefined)}
            >
              <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-sm uppercase tracking-wide">Categoria</Label>
            <Select
              value={showOnlySubscriptions ? 'SUBSCRIPTION' : filterCategory}
              onValueChange={(value) => {
                setFilterCategory(value || undefined);
                setShowOnlySubscriptions(false);
              }}
              disabled={showOnlySubscriptions}
            >
              <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Contas */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-serif font-bold text-white">Lista de Contas</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gold-500 font-serif italic">Carregando contas...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="h-10 w-10 text-gray-600" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Nenhuma conta encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Descrição</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Categoria</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Pagador</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Valor</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Vencimento</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Status</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-bold text-white">{account.description}</TableCell>
                      <TableCell className="text-gray-400">{categoryLabels[account.category]}</TableCell>
                      <TableCell className="text-gray-400">{account.payer || '-'}</TableCell>
                      <TableCell className="font-bold text-green-500">R$ {account.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400">
                        {format(new Date(account.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[account.status]} text-white`}>
                          {statusLabels[account.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(account.status === 'PENDING' || account.status === 'OVERDUE') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openPaymentDialog(account)}
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              title="Marcar como recebido"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {account.category === 'SUBSCRIPTION' && account.phone && (account.status === 'PENDING' || account.status === 'OVERDUE') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGeneratePaymentLink(account)}
                                className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                title="Gerar e copiar link de pagamento"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendWhatsApp(account)}
                                className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                title="Enviar link pelo WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {account.status !== 'PAID' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(account)}
                              className="text-gray-400 hover:text-white hover:bg-white/10"
                              title="Editar conta"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(account)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                              title="Excluir conta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              {/* Informações da Conta */}
              <Card className="bg-muted/50 border-gold/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{selectedAccount.description}</p>
                    </div>
                    {selectedAccount.category === 'SUBSCRIPTION' && (
                      <Badge className="bg-gold/10 text-gold border-gold/20">
                        Assinatura
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <p className="font-medium">{categoryLabels[selectedAccount.category]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pagador</p>
                      <p className="font-medium">{selectedAccount.payer || '-'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Valor a Receber</p>
                    <p className="text-2xl font-bold text-gold">
                      R$ {selectedAccount.amount.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">
                      {format(new Date(selectedAccount.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Formulário de Pagamento */}
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <Label htmlFor="paymentDate">Data do Recebimento *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, paymentDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Forma de Recebimento *</Label>
                  <Select
                    value={paymentData.paymentMethod}
                    onValueChange={(value) =>
                      setPaymentData({ ...paymentData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de recebimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccount.category === 'SUBSCRIPTION' && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          Assinatura Recorrente
                        </p>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          Ao confirmar, uma nova cobrança será gerada automaticamente para o próximo mês.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Recebimento
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}