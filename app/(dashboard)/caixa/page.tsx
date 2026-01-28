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
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession() || {};
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground">
            Gerencie a movimentação do caixa
          </p>
        </div>
        {!openCashRegister && (
          <Button onClick={() => setIsOpenDialogOpen(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Abrir Caixa
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : openCashRegister ? (
        <>
          {/* Open Cash Register */}
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Caixa Aberto
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aberto por {openCashRegister.openedBy.name} em{" "}
                  {format(new Date(openCashRegister.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenProductSaleDialog}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Venda de Produto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExpenseDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Saída
                </Button>
                <Button onClick={() => setIsCloseDialogOpen(true)}>
                  Fechar Caixa
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Valor Inicial</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(openCashRegister.initialAmount)}
                </p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Entradas</p>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(openCashRegister.totalIncome || 0)}
                </p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-muted-foreground">Saídas</p>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(openCashRegister.totalExpense || 0)}
                </p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
                <p className="text-2xl font-bold text-primary">
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
            <div className="bg-card rounded-lg border border-border p-6 mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Saídas Registradas</h3>
              <div className="space-y-3">
                {openCashRegister.movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex justify-between items-center p-4 bg-secondary rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{movement.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {categoryLabels[movement.category]} •{" "}
                        {format(new Date(movement.createdAt), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-red-500">
                      - {formatCurrency(movement.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            Nenhum caixa aberto
          </p>
          <p className="text-muted-foreground mb-4">
            Abra o caixa para começar a registrar movimentações
          </p>
          <Button onClick={() => setIsOpenDialogOpen(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Abrir Caixa
          </Button>
        </div>
      )}

      {/* Closed Cash Registers History */}
      {cashRegisters.filter(cr => cr.status === "CLOSED").length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Histórico de Fechamentos</h2>
          <div className="space-y-4">
            {cashRegisters
              .filter(cr => cr.status === "CLOSED")
              .map((cr) => (
                <div
                  key={cr.id}
                  className="bg-card rounded-lg border border-border p-6"
                >
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(cr.openedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Responsável</p>
                      <p className="font-medium text-foreground">{cr.openedBy.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inicial</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(cr.initialAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entradas</p>
                      <p className="font-medium text-green-500">
                        {formatCurrency(cr.totalIncome || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saídas</p>
                      <p className="font-medium text-red-500">
                        {formatCurrency(cr.totalExpense || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Diferença</p>
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
            <DialogTitle>Abrir Caixa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenCashRegister} className="space-y-4">
            <div>
              <Label htmlFor="initialAmount">Valor Inicial *</Label>
              <Input
                id="initialAmount"
                type="number"
                step="0.01"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
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
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseCashRegister} className="space-y-4">
            {openCashRegister && (
              <>
                <div className="bg-secondary p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Inicial:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(openCashRegister.initialAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entradas:</span>
                    <span className="font-medium text-green-500">
                      + {formatCurrency(openCashRegister.totalIncome || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saídas:</span>
                    <span className="font-medium text-red-500">
                      - {formatCurrency(openCashRegister.totalExpense || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">Valor Esperado:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(
                        openCashRegister.initialAmount +
                        (openCashRegister.totalIncome || 0) -
                        (openCashRegister.totalExpense || 0)
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="finalAmount">Valor Contado *</Label>
                  <Input
                    id="finalAmount"
                    type="number"
                    step="0.01"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>

                {finalAmount && (
                  <div className="bg-secondary p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Diferença:</span>
                      <span
                        className={`font-bold ${
                          parseFloat(finalAmount) -
                            (openCashRegister.initialAmount +
                              (openCashRegister.totalIncome || 0) -
                              (openCashRegister.totalExpense || 0)) >=
                          0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
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

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCloseDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
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
            <DialogTitle>Registrar Saída</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={expenseData.description}
                onChange={(e) =>
                  setExpenseData({ ...expenseData, description: e.target.value })
                }
                placeholder="Descrição da despesa"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Valor *</Label>
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
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={expenseData.category}
                onValueChange={(value) =>
                  setExpenseData({ ...expenseData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
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
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Sale Dialog */}
      <Dialog open={isProductSaleDialogOpen} onOpenChange={setIsProductSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venda de Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProductSale} className="space-y-4">
            <div>
              <Label htmlFor="productId">Produto *</Label>
              {products.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 border rounded">
                  Nenhum produto disponível com estoque
                </div>
              ) : (
                <Select
                  value={productSaleData.productId}
                  onValueChange={(value) => {
                    setProductSaleData({ ...productSaleData, productId: value });
                  }}
                >
                  <SelectTrigger>
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

            <div>
              <Label htmlFor="quantity">Quantidade *</Label>
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
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select
                value={productSaleData.paymentMethod}
                onValueChange={(value) =>
                  setProductSaleData({ ...productSaleData, paymentMethod: value })
                }
              >
                <SelectTrigger>
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

            <div>
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={productSaleData.observations}
                onChange={(e) =>
                  setProductSaleData({ ...productSaleData, observations: e.target.value })
                }
                placeholder="Observações sobre a venda (opcional)"
                rows={2}
              />
            </div>

            {productSaleData.productId && productSaleData.quantity && (
              <div className="bg-secondary p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total:</span>
                  <span className="font-bold text-green-600">
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

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductSaleDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Confirmar Venda
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
