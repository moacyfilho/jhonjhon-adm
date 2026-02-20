'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  CheckCircle,
  MessageSquare,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calendar,
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | null>(null);

  // Filtros
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

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
  }, []);

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
      const response = await fetch('/api/accounts-receivable');
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

  // Navegação de mês
  const goToPrevMonth = () => {
    const [y, m] = filterMonth.split('-').map(Number);
    setFilterMonth(format(new Date(y, m - 2, 1), 'yyyy-MM'));
  };
  const goToNextMonth = () => {
    const [y, m] = filterMonth.split('-').map(Number);
    setFilterMonth(format(new Date(y, m, 1), 'yyyy-MM'));
  };
  const isCurrentMonth = filterMonth === format(new Date(), 'yyyy-MM');
  const monthLabel = format(new Date(filterMonth + '-15'), 'MMMM yyyy', { locale: ptBR });

  // Contas filtradas
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (filterMonth) {
        const m = format(new Date(acc.dueDate), 'yyyy-MM');
        if (m !== filterMonth) return false;
      }
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (
          !acc.payer?.toLowerCase().includes(t) &&
          !acc.description.toLowerCase().includes(t)
        )
          return false;
      }
      if (filterStatus !== 'all' && acc.status !== filterStatus) return false;
      if (filterCategory !== 'all' && acc.category !== filterCategory) return false;
      return true;
    });
  }, [accounts, filterMonth, searchTerm, filterStatus, filterCategory]);

  // Contas ordenadas: OVERDUE (mais antigo) → PENDING (mais próximo) → PAID → CANCELLED
  const sortedAccounts = useMemo(() => {
    const order: Record<string, number> = { OVERDUE: 0, PENDING: 1, PAID: 2, CANCELLED: 3 };
    return [...filteredAccounts].sort((a, b) => {
      const oa = order[a.status] ?? 4;
      const ob = order[b.status] ?? 4;
      if (oa !== ob) return oa - ob;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredAccounts]);

  // Totais por status (do mês filtrado)
  const pendingAccounts = useMemo(() => filteredAccounts.filter((a) => a.status === 'PENDING'), [filteredAccounts]);
  const overdueAccounts = useMemo(() => filteredAccounts.filter((a) => a.status === 'OVERDUE'), [filteredAccounts]);
  const paidAccounts = useMemo(() => filteredAccounts.filter((a) => a.status === 'PAID'), [filteredAccounts]);

  const pendingTotal = useMemo(() => pendingAccounts.reduce((s, a) => s + a.amount, 0), [pendingAccounts]);
  const overdueTotal = useMemo(() => overdueAccounts.reduce((s, a) => s + a.amount, 0), [overdueAccounts]);
  const receivedTotal = useMemo(() => paidAccounts.reduce((s, a) => s + a.amount, 0), [paidAccounts]);
  const monthTotal = useMemo(
    () => filteredAccounts.filter((a) => a.status !== 'CANCELLED').reduce((s, a) => s + a.amount, 0),
    [filteredAccounts]
  );

  // Dias em atraso
  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.category || !formData.amount || !formData.dueDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

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
        toast.success(selectedAccount ? 'Conta atualizada com sucesso!' : 'Conta cadastrada com sucesso!');
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
      navigator.clipboard.writeText(link.linkUrl);
      toast.success('Link de pagamento gerado e copiado!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleSendWhatsApp = async (account: AccountReceivable) => {
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

      let phone = account.phone?.replace(/[^0-9]/g, '') || '';
      if (phone && !phone.startsWith('55')) {
        phone = '55' + phone;
      }

      const clientName = account.payer || 'Cliente';
      const competencia = format(new Date(account.dueDate), 'MMMM/yyyy', { locale: ptBR });
      const message = `Olá, ${clientName}! Segue o link para pagamento da sua assinatura (${competencia}): ${link.linkUrl}`;
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

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
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        clientId: client.id,
        payer: client.name,
        phone: client.phone,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gold">Contas a Receber</h1>
          <p className="text-muted-foreground">Gerencie as receitas da barbearia</p>
        </div>
        <Button
          className="bg-gold hover:bg-gold/90 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Navegador de Mês */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar className="h-4 w-4 text-gold" />
          <span className="text-xl font-semibold capitalize">{monthLabel}</span>
          {isCurrentMonth && (
            <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Atual</Badge>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Pendente */}
        <Card className="border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              R$ {pendingTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingAccounts.length} {pendingAccounts.length === 1 ? 'conta' : 'contas'}
            </p>
          </CardContent>
        </Card>

        {/* Vencido */}
        <Card className={overdueAccounts.length > 0 ? 'border-red-500/40 shadow-red-500/10 shadow-md' : 'border-red-500/20'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueAccounts.length > 0 ? 'text-red-500 animate-pulse' : 'text-red-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {overdueTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueAccounts.length} {overdueAccounts.length === 1 ? 'conta' : 'contas'}
            </p>
          </CardContent>
        </Card>

        {/* Recebido */}
        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {receivedTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidAccounts.length} {paidAccounts.length === 1 ? 'conta' : 'contas'}
            </p>
          </CardContent>
        </Card>

        {/* Total do Mês */}
        <Card className="border-gold/30 bg-gold/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">
              R$ {monthTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAccounts.filter((a) => a.status !== 'CANCELLED').length} contas no total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca + Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pagador ou descrição..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
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

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Tabela de Contas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Contas do mês{' '}
              <span className="text-muted-foreground font-normal text-sm">
                ({sortedAccounts.length} {sortedAccounts.length === 1 ? 'resultado' : 'resultados'})
              </span>
            </CardTitle>
            {(searchTerm || filterStatus !== 'all' || filterCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterCategory('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : sortedAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma conta encontrada</p>
              <p className="text-sm mt-1">
                {searchTerm || filterStatus !== 'all' || filterCategory !== 'all'
                  ? 'Tente ajustar os filtros'
                  : `Sem lançamentos em ${monthLabel}`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAccounts.map((account) => {
                    const daysOverdue = account.status === 'OVERDUE' ? getDaysOverdue(account.dueDate) : 0;
                    return (
                      <TableRow
                        key={account.id}
                        className={account.status === 'OVERDUE' ? 'bg-red-500/5' : ''}
                      >
                        <TableCell className="font-medium">{account.description}</TableCell>
                        <TableCell>{categoryLabels[account.category]}</TableCell>
                        <TableCell>{account.payer || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          R$ {account.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(account.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${statusColors[account.status]} text-white w-fit`}>
                              {statusLabels[account.status]}
                            </Badge>
                            {account.status === 'OVERDUE' && daysOverdue > 0 && (
                              <span className="text-xs text-red-500 font-medium">
                                {daysOverdue}d em atraso
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(account.status === 'PENDING' || account.status === 'OVERDUE') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentDialog(account)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Marcar como recebido"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {account.category === 'SUBSCRIPTION' &&
                              account.phone &&
                              (account.status === 'PENDING' || account.status === 'OVERDUE') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGeneratePaymentLink(account)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Gerar e copiar link de pagamento"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendWhatsApp(account)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    title="Enviar link pelo WhatsApp"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            {account.status !== 'PAID' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(account)}
                                title="Editar conta"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDeleteDialog(account)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir conta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent
          onClose={() => {
            setDialogOpen(false);
            resetForm();
          }}
        >
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
                  <Select value={formData.clientId} onValueChange={handleClientSelect}>
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
              <Button type="submit" className="bg-gold hover:bg-gold/90 text-white">
                {selectedAccount ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <Card className="bg-muted/50 border-gold/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{selectedAccount.description}</p>
                    </div>
                    {selectedAccount.category === 'SUBSCRIPTION' && (
                      <Badge className="bg-gold/10 text-gold border-gold/20">Assinatura</Badge>
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
                      {format(new Date(selectedAccount.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <Label htmlFor="paymentDate">Data do Recebimento *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
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
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!paymentData.paymentMethod}
                  >
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
