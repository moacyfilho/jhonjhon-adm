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
import { Plus, Pencil, Trash2, DollarSign, CheckCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-user';

interface AccountPayable {
  id: string;
  description: string;
  category: string;
  supplier: string | null;
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentMethod: string | null;
  observations: string | null;
}

const categoryLabels: Record<string, string> = {
  RENT: 'Aluguel',
  UTILITIES: 'Utilidades (Luz, Água, etc)',
  SALARIES: 'Salários',
  SUPPLIES: 'Materiais',
  MAINTENANCE: 'Manutenção',
  TAXES: 'Impostos',
  SERVICES: 'Serviços',
  OTHER_EXPENSE: 'Outras Despesas',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
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

export default function ContasPagarPage() {
  const { user } = useUser();
  const isAdmin = user?.user_metadata?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);

  // Formulário
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    supplier: '',
    amount: '',
    dueDate: '',
    observations: '',
  });

  // Formulário de pagamento
  const [paymentData, setPaymentData] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, [filterStatus, filterCategory]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`/api/accounts-payable?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas a pagar');
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

    try {
      const url = selectedAccount
        ? `/api/accounts-payable/${selectedAccount.id}`
        : '/api/accounts-payable';
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
      const response = await fetch(`/api/accounts-payable/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
        }),
      });

      if (response.ok) {
        toast.success('Pagamento registrado com sucesso!');
        setPaymentDialogOpen(false);
        setSelectedAccount(null);
        setPaymentData({
          paymentDate: format(new Date(), 'yyyy-MM-dd'),
          paymentMethod: '',
        });
        fetchAccounts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(`/api/accounts-payable/${selectedAccount.id}`, {
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
      supplier: '',
      amount: '',
      dueDate: '',
      observations: '',
    });
    setSelectedAccount(null);
  };

  const openEditDialog = (account: AccountPayable) => {
    setSelectedAccount(account);
    setFormData({
      description: account.description,
      category: account.category,
      supplier: account.supplier || '',
      amount: account.amount.toString(),
      dueDate: format(new Date(account.dueDate), 'yyyy-MM-dd'),
      observations: account.observations || '',
    });
    setDialogOpen(true);
  };

  const openPaymentDialog = (account: AccountPayable) => {
    setSelectedAccount(account);
    setPaymentData({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
    });
    setPaymentDialogOpen(true);
  };

  const openDeleteDialog = (account: AccountPayable) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const getTotalPending = () => {
    return accounts
      .filter((acc) => acc.status === 'PENDING' || acc.status === 'OVERDUE')
      .reduce((sum, acc) => sum + acc.amount, 0);
  };

  const getTotalPaid = () => {
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
            Contas a <span className="text-gold-500">Pagar</span>
          </h1>
          <p className="text-gray-500 font-medium">Gerencie as despesas da barbearia</p>
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
              {selectedAccount ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
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
                  placeholder="Ex: Conta de luz"
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

              <div>
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>

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
        <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest">Total Pendente</p>
              <p className="text-3xl font-serif font-bold text-red-500">
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
              <p className="text-xs font-bold text-green-500/60 uppercase tracking-widest">Total Pago</p>
              <p className="text-3xl font-serif font-bold text-green-500">
                R$ {getTotalPaid().toFixed(2)}
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
              value={filterCategory}
              onValueChange={(value) => setFilterCategory(value || undefined)}
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
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Fornecedor</TableHead>
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
                      <TableCell className="text-gray-400">{account.supplier || '-'}</TableCell>
                      <TableCell className="font-bold text-red-500">R$ {account.amount.toFixed(2)}</TableCell>
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
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {account.status !== 'PAID' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(account)}
                              className="text-gray-400 hover:text-white hover:bg-white/10"
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
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
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
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                Confirmar Pagamento
              </Button>
            </div>
          </form>
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