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

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  unit: string;
  category: string | null;
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
    stock: '',
    unit: 'un',
    category: '',
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
        stock: product.stock.toString(),
        unit: product.unit,
        category: product.category || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '0',
        unit: 'un',
        category: '',
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie o estoque de produtos da barbearia</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gold text-white hover:bg-gold/90">
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar por nome</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={filterCategory || undefined} onValueChange={setFilterCategory}>
                <SelectTrigger id="category">
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
              <Button onClick={fetchProducts} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setShowInactive(false);
                }}
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
              className="rounded"
            />
            <Label htmlFor="showInactive" className="cursor-pointer">
              Mostrar produtos inativos
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando produtos...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline">{product.category}</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {product.stock} {product.unit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStockBadge(product)}
                          {!product.isActive && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          {product.isActive && product.stock > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSaleDialog(product)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Diálogo de Criar/Editar Produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pomada Modeladora"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição do produto (opcional)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
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

              <div>
                <Label htmlFor="stock">Estoque Inicial</Label>
                <Input
                  id="stock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unidade</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-gold text-white hover:bg-gold/90">
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
            <div className="py-4 space-y-4">
              {/* Informações do Produto */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Produto:</span>
                      <p className="font-medium">{productToSell.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Preço Unitário:</span>
                        <p className="font-medium text-gold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(productToSell.price)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Estoque Disponível:</span>
                        <p className="font-medium">
                          {productToSell.stock} {productToSell.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulário de Venda */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
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
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                  <Select
                    value={saleFormData.paymentMethod}
                    onValueChange={(value) =>
                      setSaleFormData({ ...saleFormData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger id="paymentMethod">
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

                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={saleFormData.observations}
                    onChange={(e) =>
                      setSaleFormData({ ...saleFormData, observations: e.target.value })
                    }
                    placeholder="Observações sobre a venda (opcional)"
                    rows={2}
                  />
                </div>

                {/* Total */}
                {saleFormData.quantity > 0 && (
                  <Card className="bg-gold/10 border-gold">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total da Venda:</span>
                        <span className="text-2xl font-bold text-gold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(saleFormData.quantity * productToSell.price)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaleSubmit}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
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
