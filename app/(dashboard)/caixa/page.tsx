"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, DollarSign, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@/hooks/use-user";

interface CashRegister {
  id: string;
  initialAmount: number;
  finalAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  totalIncome: number | null;
  totalExpense: number | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: { name: string; email: string };
  closedBy: { name: string; email: string } | null;
  movements: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    category: string;
    createdAt: string;
  }>;
}

export default function CaixaPage() {
  const { user } = useUser();
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isProductSaleDialogOpen, setIsProductSaleDialogOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [expenseData, setExpenseData] = useState({
    description: "",
    amount: "",
    category: "",
  });
  const [products, setProducts] = useState<any[]>([]);
  const [productSaleData, setProductSaleData] = useState({
    productId: "",
    quantity: "1",
    paymentMethod: "",
    observations: "",
  });

  useEffect(() => {
    fetchCashRegisters();
  }, []);

  const fetchCashRegisters = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cash-register");
      const data = await res.json();
      setCashRegisters(data);

      const open = data.find((cr: CashRegister) => cr.status === "OPEN");
      setOpenCashRegister(open || null);
    } catch (error) {
      console.error("Error fetching cash registers:", error);
      toast.error("Erro ao carregar caixas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCashRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Valor inicial inválido");
      return;
    }

    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialAmount: amount }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Caixa aberto com sucesso!");
        setIsOpenDialogOpen(false);
        setInitialAmount("");
        fetchCashRegisters();
      } else {
        toast.error(data.error || "Erro ao abrir caixa");
      }
    } catch (error) {
      console.error("Error opening cash register:", error);
      toast.error("Erro ao abrir caixa");
    }
  };

  const handleCloseCashRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!openCashRegister) return;

    const amount = parseFloat(finalAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Valor final inválido");
      return;
    }

    try {
      const res = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashRegisterId: openCashRegister.id,
          finalAmount: amount,
        }),
      });

      if (res.ok) {
        toast.success("Caixa fechado com sucesso!");
        setIsCloseDialogOpen(false);
        setFinalAmount("");
        fetchCashRegisters();
      } else {
        toast.error("Erro ao fechar caixa");
      }
    } catch (error) {
      console.error("Error closing cash register:", error);
      toast.error("Erro ao fechar caixa");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!openCashRegister) return;

    const amount = parseFloat(expenseData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (!expenseData.description || !expenseData.category) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const res = await fetch("/api/cash-register/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashRegisterId: openCashRegister.id,
          ...expenseData,
          amount,
        }),
      });

      if (res.ok) {
        toast.success("Despesa registrada com sucesso!");
        setIsExpenseDialogOpen(false);
        setExpenseData({ description: "", amount: "", category: "" });
        fetchCashRegisters();
      } else {
        toast.error("Erro ao registrar despesa");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Erro ao registrar despesa");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        // Apenas produtos ativos e com estoque
        setProducts(data.filter((p: any) => p.isActive && p.stock > 0));
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleOpenProductSaleDialog = () => {
    fetchProducts();
    setIsProductSaleDialogOpen(true);
  };

  const handleProductSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!openCashRegister) return;

    const quantity = parseFloat(productSaleData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (!productSaleData.productId || !productSaleData.paymentMethod) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const res = await fetch("/api/product-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productSaleData,
          quantity,
        }),
      });

      if (res.ok) {
        toast.success("Venda registrada com sucesso!");
        setIsProductSaleDialogOpen(false);
        setProductSaleData({
          productId: "",
          quantity: "1",
          paymentMethod: "",
          observations: "",
        });
        fetchCashRegisters();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao registrar venda");
      }
    } catch (error) {
      console.error("Error registering product sale:", error);
      toast.error("Erro ao registrar venda");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const categoryLabels: Record<string, string> = {
    PURCHASE: "Compras",
    BILL: "Contas",
    OTHER: "Outros",
    PRODUCT_SALE: "Venda de Produto",
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Controle de <span className="text-gold-500">Caixa</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Gerencie a movimentação financeira diária.
          </p>
        </div>
        {!openCashRegister && (
          <Button
            onClick={() => setIsOpenDialogOpen(true)}
            className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Abrir Caixa
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gold-500 font-serif italic">Carregando caixa...</p>
        </div>
      ) : openCashRegister ? (
        <>
          {/* Open Cash Register */}
          <div className="glass-panel rounded-3xl p-6 border-l-4 border-l-green-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <h2 className="text-xl font-serif font-bold text-white">
                    Caixa Aberto
                  </h2>
                </div>
                <p className="text-sm text-gray-500">
                  Aberto por <span className="text-gold-500 font-medium">{openCashRegister.openedBy.name}</span> em{" "}
                  {format(new Date(openCashRegister.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenProductSaleDialog}
                  className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Venda de Produto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExpenseDialogOpen(true)}
                  className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Saída
                </Button>
                <Button
                  onClick={() => setIsCloseDialogOpen(true)}
                  className="bg-gold-500 hover:bg-gold-600 text-black font-bold"
                >
                  Fechar Caixa
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Valor Inicial</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(openCashRegister.initialAmount)}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-2xl p-5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-xs font-bold text-green-500/80 uppercase tracking-wide">Entradas</p>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(openCashRegister.totalIncome || 0)}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-2xl p-5 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold text-red-500/80 uppercase tracking-wide">Saídas</p>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(openCashRegister.totalExpense || 0)}
                </p>
              </div>
              <div className="bg-gold-500/10 rounded-2xl p-5 border border-gold-500/20">
                <p className="text-xs font-bold text-gold-500/80 uppercase tracking-wide mb-2">Valor Atual</p>
                <p className="text-2xl font-bold text-gold-500">
                  {formatCurrency(
                    openCashRegister.initialAmount +
                    (openCashRegister.totalIncome || 0) -
                    (openCashRegister.totalExpense || 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          {openCashRegister.movements.length > 0 && (
            <div className="glass-panel rounded-3xl p-6">
              <h3 className="text-lg font-serif font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Saídas Registradas
              </h3>
              <div className="space-y-3">
                {openCashRegister.movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-white">{movement.description}</p>
                      <p className="text-sm text-gray-500">
                        {categoryLabels[movement.category]} •{" "}
                        {format(new Date(movement.createdAt), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-red-500">
                      - {formatCurrency(movement.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-gray-600" />
          </div>
          <p className="text-white text-lg font-bold mb-2">
            Nenhum caixa aberto
          </p>
          <p className="text-gray-500 mb-6">
            Abra o caixa para começar a registrar movimentações
          </p>
          <Button
            onClick={() => setIsOpenDialogOpen(true)}
            className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Abrir Caixa
          </Button>
        </div>
      )}

      {/* Closed Cash Registers History */}
      {cashRegisters.filter(cr => cr.status === "CLOSED").length > 0 && (
        <div>
          <h2 className="text-xl font-serif font-bold text-white mb-4">Histórico de Fechamentos</h2>
          <div className="space-y-4">
            {cashRegisters
              .filter(cr => cr.status === "CLOSED")
              .map((cr) => (
                <div
                  key={cr.id}
                  className="glass-panel rounded-3xl p-6 hover:border-gold-500/20 transition-all"
                >
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data</p>
                      <p className="font-bold text-white">
                        {format(new Date(cr.openedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Responsável</p>
                      <p className="font-medium text-gray-300">{cr.openedBy.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Inicial</p>
                      <p className="font-bold text-white">
                        {formatCurrency(cr.initialAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Entradas</p>
                      <p className="font-bold text-green-500">
                        {formatCurrency(cr.totalIncome || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Saídas</p>
                      <p className="font-bold text-red-500">
                        {formatCurrency(cr.totalExpense || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Diferença</p>
                      <p className={`font-bold ${cr.difference! >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {cr.difference! >= 0 ? "+" : ""}
                        {formatCurrency(cr.difference || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Open Dialog */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 font-serif text-white text-xl">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <Wallet className="w-4 h-4 text-gold-500" />
                </div>
                Abrir Caixa
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenCashRegister} className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <Label htmlFor="initialAmount" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                Valor Inicial *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-serif">R$</span>
                <Input
                  id="initialAmount"
                  type="number"
                  step="0.01"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="pl-10 h-12 bg-black/20 border-white/10 text-white text-lg font-bold focus:border-gold-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenDialogOpen(false)}
                className="flex-1 h-12 bg-white/5 border-white/10 text-white font-bold hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12 bg-gold-gradient text-black font-bold shadow-gold hover:scale-[1.02] transition-transform">
                Abrir Caixa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 font-serif text-white text-xl">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <Wallet className="w-4 h-4 text-gold-500" />
                </div>
                Fechar Caixa
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseCashRegister} className="space-y-6">
            {openCashRegister && (
              <>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Valor Inicial:</span>
                    <span className="font-bold text-white">
                      {formatCurrency(openCashRegister.initialAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Entradas:</span>
                    <span className="font-bold text-green-500">
                      + {formatCurrency(openCashRegister.totalIncome || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Saídas:</span>
                    <span className="font-bold text-red-500">
                      - {formatCurrency(openCashRegister.totalExpense || 0)}
                    </span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-gold-500">Valor Esperado</span>
                    <span className="font-serif font-bold text-gold-500 text-xl">
                      {formatCurrency(
                        openCashRegister.initialAmount +
                        (openCashRegister.totalIncome || 0) -
                        (openCashRegister.totalExpense || 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <Label htmlFor="finalAmount" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    Valor Contado *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-serif">R$</span>
                    <Input
                      id="finalAmount"
                      type="number"
                      step="0.01"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      placeholder="0,00"
                      required
                      className="pl-10 h-12 bg-black/20 border-white/10 text-white text-lg font-bold focus:border-gold-500/50 transition-all placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {finalAmount && (
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Diferença</span>
                      <span
                        className={`font-bold text-lg ${parseFloat(finalAmount) -
                          (openCashRegister.initialAmount +
                            (openCashRegister.totalIncome || 0) -
                            (openCashRegister.totalExpense || 0)) >=
                          0
                          ? "text-green-500"
                          : "text-red-500"
                          }`}
                      >
                        {parseFloat(finalAmount) -
                          (openCashRegister.initialAmount +
                            (openCashRegister.totalIncome || 0) -
                            (openCashRegister.totalExpense || 0)) >= 0 ? "+" : ""}
                        {formatCurrency(
                          parseFloat(finalAmount) -
                          (openCashRegister.initialAmount +
                            (openCashRegister.totalIncome || 0) -
                            (openCashRegister.totalExpense || 0))
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCloseDialogOpen(false)}
                className="flex-1 h-12 bg-white/5 border-white/10 text-white font-bold hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12 bg-gold-gradient text-black font-bold shadow-gold hover:scale-[1.02] transition-transform">
                Fechar Caixa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 font-serif text-white text-xl">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                Registrar Saída
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Descrição *</Label>
                <Textarea
                  id="description"
                  value={expenseData.description}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, description: e.target.value })
                  }
                  placeholder="Descrição da despesa"
                  required
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Valor *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-serif">R$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={expenseData.amount}
                      onChange={(e) =>
                        setExpenseData({ ...expenseData, amount: e.target.value })
                      }
                      placeholder="0,00"
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Categoria *</Label>
                  <Select
                    value={expenseData.category}
                    onValueChange={(value) =>
                      setExpenseData({ ...expenseData, category: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseDialogOpen(false)}
                className="flex-1 h-12 bg-white/5 border-white/10 text-white font-bold hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20">
                Registrar Saída
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Sale Dialog */}
      <Dialog open={isProductSaleDialogOpen} onOpenChange={setIsProductSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 font-serif text-white text-xl">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                  <ShoppingCart className="w-4 h-4 text-gold-500" />
                </div>
                Venda de Produto
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProductSale} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="productId" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Produto *</Label>
                {products.length === 0 ? (
                  <div className="text-sm text-gray-500 p-3 border border-white/10 rounded-xl bg-white/5">
                    Nenhum produto disponível com estoque
                  </div>
                ) : (
                  <Select
                    value={productSaleData.productId}
                    onValueChange={(value) => {
                      setProductSaleData({ ...productSaleData, productId: value });
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.price)} (Estoque: {product.stock} {product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={productSaleData.quantity}
                    onChange={(e) =>
                      setProductSaleData({ ...productSaleData, quantity: e.target.value })
                    }
                    placeholder="1"
                    required
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Pagamento *</Label>
                  <Select
                    value={productSaleData.paymentMethod}
                    onValueChange={(value) =>
                      setProductSaleData({ ...productSaleData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Dinheiro</SelectItem>
                      <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="observations" className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Observações</Label>
                <Textarea
                  id="observations"
                  value={productSaleData.observations}
                  onChange={(e) =>
                    setProductSaleData({ ...productSaleData, observations: e.target.value })
                  }
                  placeholder="Observações sobre a venda (opcional)"
                  rows={2}
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>
            </div>

            {productSaleData.productId && productSaleData.quantity && (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-500 uppercase tracking-widest text-xs">Total da Venda</span>
                  <span className="font-bold text-green-500 text-xl">
                    {(() => {
                      const selectedProduct = products.find(
                        (p) => p.id === productSaleData.productId
                      );
                      if (selectedProduct) {
                        const total =
                          selectedProduct.price * parseFloat(productSaleData.quantity || "0");
                        return formatCurrency(total);
                      }
                      return "R$ 0,00";
                    })()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductSaleDialogOpen(false)}
                className="flex-1 h-12 bg-white/5 border-white/10 text-white font-bold hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20">
                Concluir Venda
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
