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
  ShoppingCart,
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  unit: string;
  category: string | null;
  isCommissioned: boolean;
  commissionPercentage: number | null;
  isActive: boolean;
  _count?: {
    sales: number;
  };
}

interface SaleFormData {
  productId: string;
  quantity: number;
  paymentMethod: string;
  observations: string;
}

const CATEGORIES = [
  'Pomadas',
  'Shampoos',
  'Condicionadores',
  'Acessórios',
  'Óleos',
  'Ceras',
  'Outros',
];

const UNITS = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'PIX', label: 'PIX' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Formulários
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToSell, setProductToSell] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    stock: '',
    unit: 'un',
    category: '',
    isCommissioned: false,
    commissionPercentage: '',
  });

  const [saleFormData, setSaleFormData] = useState<SaleFormData>({
    productId: '',
    quantity: 1,
    paymentMethod: '',
    observations: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (showInactive) params.append('showInactive', 'true');

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao buscar produtos');

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        costPrice: product.costPrice?.toString() || '',
        stock: product.stock.toString(),
        unit: product.unit,
        category: product.category || '',
        isCommissioned: product.isCommissioned,
        commissionPercentage: product.commissionPercentage?.toString() || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        costPrice: '',
        stock: '0',
        unit: 'un',
        category: '',
        isCommissioned: false,
        commissionPercentage: '',
      });
    }
    setDialogOpen(true);
  };

  const handleOpenSaleDialog = (product: Product) => {
    setProductToSell(product);
    setSaleFormData({
      productId: product.id,
      quantity: 1,
      paymentMethod: '',
      observations: '',
    });
    setSaleDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.price) {
        toast.error('Nome e preço são obrigatórios');
        return;
      }

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar produto');
      }

      toast.success(
        editingProduct
          ? 'Produto atualizado com sucesso!'
          : 'Produto criado com sucesso!'
      );
      setDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
    }
  };

  const handleSaleSubmit = async () => {
    try {
      if (!saleFormData.quantity || !saleFormData.paymentMethod) {
        toast.error('Quantidade e forma de pagamento são obrigatórios');
        return;
      }

      const response = await fetch('/api/product-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleFormData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao registrar venda');
      }

      toast.success('Venda registrada com sucesso!');
      setSaleDialogOpen(false);
      fetchProducts(); // Atualiza estoque
    } catch (error: any) {
      console.error('Erro ao registrar venda:', error);
      toast.error(error.message || 'Erro ao registrar venda');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir produto');
      }

      toast.success(data.message || 'Produto excluído com sucesso!');
      setDeleteDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error(error.message || 'Erro ao excluir produto');
    }
  };

  const getStockBadge = (product: Product) => {
    if (product.stock === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Esgotado
        </Badge>
      );
    }
    if (product.stock <= 5) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          Estoque Baixo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle className="h-3 w-3" />
        Disponível
      </Badge>
    );
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Meus <span className="text-gold-500">Produtos</span>
          </h1>
          <p className="text-gray-500 font-medium">Gerencie o estoque de produtos da barbearia</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold h-auto">
          <Plus className="mr-2 h-5 w-5" /> Novo Produto
        </Button>
      </div>

      {/* Filtros */}
      <div className="glass-panel p-6 rounded-3xl">
        <h3 className="text-lg font-serif font-bold text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-gold-500" />
          Filtros de Busca
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search" className="text-gray-400 text-sm uppercase tracking-wide">Buscar por nome</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="search"
                placeholder="Nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category" className="text-gray-400 text-sm uppercase tracking-wide">Categoria</Label>
            <Select value={filterCategory || undefined} onValueChange={setFilterCategory}>
              <SelectTrigger id="category" className="mt-2 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchProducts} className="flex-1 bg-gold-500 hover:bg-gold-600 text-black font-bold">
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setShowInactive(false);
              }}
              className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              Limpar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded bg-white/5 border-white/20 text-gold-500 focus:ring-gold-500"
          />
          <Label htmlFor="showInactive" className="cursor-pointer text-gray-400">
            Mostrar produtos inativos
          </Label>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-6">
          {loading ? (
            <TableSkeleton count={5} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum produto"
              description={searchTerm ? "Nenhum produto encontrado para sua busca." : "Você ainda não tem produtos cadastrados."}
              actionLabel={searchTerm ? undefined : "Novo Produto"}
              onAction={searchTerm ? undefined : () => handleOpenDialog()}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Produto</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Categoria</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider text-right">Preço</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider text-right">Estoque</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider">Status</TableHead>
                    <TableHead className="text-gold-500 font-bold uppercase text-xs tracking-wider text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div>
                          <div className="font-bold text-white">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline" className="border-gold-500/30 text-gold-500 bg-gold-500/10">{product.category}</Badge>
                        ) : (
                          <span className="text-gray-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-white">
                          {product.stock} {product.unit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStockBadge(product)}
                          {!product.isActive && (
                            <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">Inativo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {product.isActive && product.stock > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenSaleDialog(product)}
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(product)}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Diálogo de Criar/Editar Produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-white ml-1">Nome do Produto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pomada Modeladora"
                  className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description" className="text-sm font-bold text-white ml-1">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição do produto (opcional)"
                  rows={3}
                  className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-gold-500/50 focus:border-gold-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-sm font-bold text-white ml-1">Preço Custo (R$)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-bold text-white ml-1">Preço Venda (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-bold text-white ml-1">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" className="bg-white/5 border-white/10 text-white rounded-xl h-[52px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-bold text-white ml-1">Estoque Inicial</Label>
                <Input
                  id="stock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-bold text-white ml-1">Unidade</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit" className="bg-white/5 border-white/10 text-white rounded-xl h-[52px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Configuração de Comissão */}
              <div className="grid grid-cols-2 gap-4 items-end pt-2 border-t border-white/5 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-white ml-1 block">Produto comissionado?</Label>
                  <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isCommissioned: true })}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.isCommissioned ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isCommissioned: false })}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${!formData.isCommissioned ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'text-gray-400 hover:text-white'}`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {formData.isCommissioned ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                    <Label htmlFor="commissionPercentage" className="text-sm font-bold text-white ml-1">% Comissão</Label>
                    <div className="relative">
                      <Input
                        id="commissionPercentage"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.commissionPercentage}
                        onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                        placeholder="0"
                        className="bg-white/5 border-white/10 text-white rounded-xl py-6 pr-8 focus:ring-gold-500/50 focus:border-gold-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 opacity-30 pointer-events-none">
                    <Label className="text-sm font-bold text-white ml-1">% Comissão</Label>
                    <Input disabled placeholder="-" className="bg-white/5 border-white/10 rounded-xl py-6" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white/[0.02] border-t border-white/5 p-8 flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="px-6 py-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border-white/10 transition-all h-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-8 py-6 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold rounded-xl transition-all shadow-gold h-auto"
            >
              {editingProduct ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Registrar Venda */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
          </DialogHeader>

          {productToSell && (
            <div className="p-8 space-y-6">
              {/* Informações do Produto */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center border border-gold-500/20">
                    <Package className="w-6 h-6 text-gold-500" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Produto</span>
                    <p className="text-white font-bold text-lg leading-tight">{productToSell.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Preço Unitário</span>
                    <p className="font-serif font-bold text-gold-500 text-xl">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(productToSell.price)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Estoque</span>
                    <p className="text-white font-bold text-xl">
                      {productToSell.stock} <span className="text-sm text-gray-500 font-normal">{productToSell.unit}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulário de Venda */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-bold text-white ml-1">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={productToSell.stock}
                    value={saleFormData.quantity}
                    onChange={(e) =>
                      setSaleFormData({
                        ...saleFormData,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white rounded-xl py-6 focus:ring-gold-500/50 focus:border-gold-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-sm font-bold text-white ml-1">Forma de Pagamento *</Label>
                  <Select
                    value={saleFormData.paymentMethod}
                    onValueChange={(value) =>
                      setSaleFormData({ ...saleFormData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger id="paymentMethod" className="bg-white/5 border-white/10 text-white rounded-xl h-[52px]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-sm font-bold text-white ml-1">Observações</Label>
                  <Textarea
                    id="observations"
                    value={saleFormData.observations}
                    onChange={(e) =>
                      setSaleFormData({ ...saleFormData, observations: e.target.value })
                    }
                    placeholder="Observações sobre a venda (opcional)"
                    rows={2}
                    className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-gold-500/50 focus:border-gold-500 resize-none"
                  />
                </div>

                {/* Total */}
                {saleFormData.quantity > 0 && (
                  <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gold-500 uppercase tracking-widest">Total da Venda</span>
                      <span className="text-3xl font-serif font-bold text-gold-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(saleFormData.quantity * productToSell.price)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="bg-white/[0.02] border-t border-white/5 p-8 flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setSaleDialogOpen(false)}
              className="px-6 py-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border-white/10 transition-all h-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaleSubmit}
              className="px-8 py-6 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold rounded-xl transition-all shadow-gold h-auto"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto &quot;
              {productToDelete?.name}&quot;?
              {productToDelete?._count && productToDelete._count.sales > 0 && (
                <span className="block mt-2 text-yellow-600 font-medium">
                  Este produto possui {productToDelete._count.sales} venda(s)
                  registrada(s). Ele será desativado ao invés de excluído.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
