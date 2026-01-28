'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    servicesIncluded?: string;
    usageLimit?: number;
    isActive: boolean;
    _count?: {
        subscriptions: number;
    };
}

export default function PlanosPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        durationDays: '30',
        servicesIncluded: '',
        usageLimit: '',
        isActive: true,
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/subscription-plans');
            if (!response.ok) throw new Error('Erro ao carregar planos');
            const data = await response.json();
            setPlans(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar planos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingPlan
                ? `/api/subscription-plans/${editingPlan.id}`
                : '/api/subscription-plans';

            const method = editingPlan ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar plano');
            }

            toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!');
            setShowForm(false);
            setEditingPlan(null);
            resetForm();
            fetchPlans();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }
    };

    const handleEdit = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description || '',
            price: plan.price.toString(),
            durationDays: plan.durationDays.toString(),
            servicesIncluded: plan.servicesIncluded || '',
            usageLimit: plan.usageLimit?.toString() || '',
            isActive: plan.isActive,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este plano?')) return;

        try {
            const response = await fetch(`/api/subscription-plans/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao excluir plano');
            }

            toast.success('Plano excluído!');
            fetchPlans();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            durationDays: '30',
            servicesIncluded: '',
            usageLimit: '',
            isActive: true,
        });
    };

    const getDurationLabel = (days: number) => {
        if (days === 30) return 'Mensal';
        if (days === 90) return 'Trimestral';
        if (days === 180) return 'Semestral';
        if (days === 365) return 'Anual';
        return `${days} dias`;
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Planos de Assinatura</h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie os tipos de planos disponíveis para seus clientes
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingPlan(null);
                        resetForm();
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                </Button>
            </div>

            {showForm && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Plano *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Plano Premium Mensal"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">Preço (R$) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="150.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="durationDays">Duração (dias) *</Label>
                                    <Input
                                        id="durationDays"
                                        type="number"
                                        value={formData.durationDays}
                                        onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                                        placeholder="30"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        30 = Mensal, 90 = Trimestral, 365 = Anual
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="usageLimit">Limite de Usos (opcional)</Label>
                                    <Input
                                        id="usageLimit"
                                        type="number"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        placeholder="Deixe vazio para ilimitado"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descreva os benefícios do plano..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="servicesIncluded">Serviços Incluídos</Label>
                                <Textarea
                                    id="servicesIncluded"
                                    value={formData.servicesIncluded}
                                    onChange={(e) => setFormData({ ...formData, servicesIncluded: e.target.value })}
                                    placeholder="Ex: Corte, Barba, Sobrancelha..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="isActive">Plano Ativo</Label>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit">
                                    {editingPlan ? 'Atualizar' : 'Criar'} Plano
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingPlan(null);
                                        resetForm();
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Carregando...</p>
                ) : plans.length === 0 ? (
                    <p className="text-muted-foreground col-span-full text-center py-12">
                        Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
                    </p>
                ) : (
                    plans.map((plan) => (
                        <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="w-5 h-5" />
                                            {plan.name}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {getDurationLabel(plan.durationDays)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(plan)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(plan.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-3xl font-bold text-primary">
                                            R$ {plan.price.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {plan.usageLimit
                                                ? `Até ${plan.usageLimit} usos`
                                                : 'Usos ilimitados'}
                                        </p>
                                    </div>

                                    {plan.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {plan.description}
                                        </p>
                                    )}

                                    {plan.servicesIncluded && (
                                        <div>
                                            <p className="text-xs font-semibold mb-1">Serviços:</p>
                                            <p className="text-sm">{plan.servicesIncluded}</p>
                                        </div>
                                    )}

                                    {plan._count && (
                                        <p className="text-xs text-muted-foreground pt-2 border-t">
                                            {plan._count.subscriptions} assinatura(s) ativa(s)
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-2">
                                        <div
                                            className={`w-2 h-2 rounded-full ${plan.isActive ? 'bg-green-500' : 'bg-gray-400'
                                                }`}
                                        />
                                        <span className="text-xs">
                                            {plan.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
