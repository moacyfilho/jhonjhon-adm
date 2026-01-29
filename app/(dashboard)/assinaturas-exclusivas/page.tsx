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
    Sparkles,
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
    if (normalized.includes('jhon')) return '/barbers/jhonjhon.jpeg';
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
    isExclusive?: boolean;
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

export default function AssinaturasExclusivasPage() {
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
            // FILTER BY EXCLUSIVE
            const response = await fetch(`/api/reports/subscriptions?date=${dateStr}&type=exclusive`);
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
            // FILTER BY EXCLUSIVE
            params.append('type', 'exclusive');

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
            // FILTER BY EXCLUSIVE ONLY
            setPlans(data.filter((p: SubscriptionPlan) => p.isActive && p.isExclusive));
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
                isExclusive: true, // FORCE EXCLUSIVE
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
                    description: `Assinatura ACADEMY - ${subscription.planName} - ${subscription.client.name}`,
                    category: 'SUBSCRIPTION',
                    payer: subscription.client.name,
                    clientId: subscription.clientId,
                    subscriptionId: subscription.id,
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

        console.log('Original phone:', selectedSubscription.client.phone);

        // Remove all non-digits (EXTREMELY IMPORTANT)
        let phone = selectedSubscription.client.phone.replace(/[^0-9]/g, '');

        console.log('Stripped phone:', phone);

        // Ensure it starts with country code 55
        // If it starts with 55 and has 13 digits (55 + 2 digit DDD + 9 digit number), it's prob already complete.
        // If it DOES NOT start with 55, add it.
        if (!phone.startsWith('55')) {
            phone = '55' + phone;
        }

        console.log('Final phone:', phone);

        // ALERT PARA DEBUG - REMOVER DEPOIS
        // alert(`DEBUG: Phone original: ${selectedSubscription.client.phone}\nPhone final: ${phone}`);

        const message = `Olá, ${selectedSubscription.client.name}! Segue o link para pagamento da sua assinatura Exclusiva (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}): ${generatedLink.linkUrl}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

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

    const handleSeedPlans = async () => {
        if (!confirm('Deseja recriar/restaurar os Planos Exclusivos (Corte, Barba, Combo) no banco de dados? Isso não afeta assinaturas existentes.')) return;

        const promise = fetch('/api/admin/seed-exclusive-plans', { method: 'POST' });

        toast.promise(promise, {
            loading: 'Restaurando planos...',
            success: (data) => {
                fetchPlans(); // Refresh list used in dropdown
                return 'Planos restaurados com sucesso!';
            },
            error: 'Erro ao restaurar planos'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gold">Assinaturas Exclusivas Jhon</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gerencie os clientes da Assinatura Exclusiva Jhon Jhon
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSeedPlans} variant="outline" className="text-gold border-gold/20 hover:bg-gold/10">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Restaurar Padrões
                    </Button>
                    <Button onClick={openCreateDialog} className="bg-gold hover:bg-gold/80 text-black">
                        <Plus className="mr-2 h-4 w-4" />
                        Assinatura Exclusiva
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
                            {/* Cards Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <Card className="bg-[#78e068] border-none text-black">
                                    <CardContent className="p-4">
                                        <p className="font-bold text-sm opacity-80 mb-1">Recebidas</p>
                                        <h3 className="text-2xl font-bold">R$ {reportData.metrics.received.toFixed(2).replace('.', ',')}</h3>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[#c76e78] border-none text-black bg-opacity-90">
                                    <CardContent className="p-4">
                                        <p className="font-bold text-sm text-black/70 mb-1">A receber</p>
                                        <h3 className="text-2xl font-bold text-black/90">R$ {reportData.metrics.pending.toFixed(2).replace('.', ',')}</h3>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[#888888] border-none text-white">
                                    <CardContent className="p-4">
                                        <p className="font-bold text-sm opacity-80 mb-1">Total</p>
                                        <h3 className="text-2xl font-bold">R$ {reportData.metrics.total.toFixed(2).replace('.', ',')}</h3>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[#e6d845] border-none text-black">
                                    <CardContent className="p-4">
                                        <p className="font-bold text-sm opacity-80 mb-1">Valor/Hora (Jhon)</p>
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
                                        <p className="font-bold text-sm opacity-80 mb-1">Atendimento (Jhon)</p>
                                        <h3 className="text-2xl font-bold">{formatMinutesToHours(reportData.metrics.totalHours * 60)}</h3>
                                    </CardContent>
                                </Card>

                            </div>

                            {/* Lista de Assinantes */}
                            <Card className="bg-[#1a1a1a] border-[#333] text-[#ddd] mt-6">
                                {/* Same Table as Standard */}
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex gap-4">
                                        <Button size="sm" className="bg-gold hover:bg-gold/80 text-black h-7 text-xs">Exclusivos ({reportData.subscribers.length})</Button>
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
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Hiding Barber Table for Exclusive as it's implied Jhon Jhon only? Or show it? Jhon Jhon should be the only one with data here if data is correct. */}
                        </>
                    ) : (
                        <div className="text-center text-white">Não há dados.</div>
                    )}
                </TabsContent>

                {/* TAB: GERENCIAR (Lista) */}
                <TabsContent value="management" className="space-y-4">
                    {/* Reuse Table from original page but subscriptions list is filtered */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar assinante..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 bg-[#1a1a1a] border-[#333] text-white"
                            />
                        </div>
                        <Button onClick={openCreateDialog} className="bg-gold hover:bg-gold/80 text-black whitespace-nowrap">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Assinatura
                        </Button>
                    </div>

                    <Card className="bg-[#1a1a1a] border-[#333]">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-[#333] hover:bg-transparent">
                                        <TableHead className="text-gray-400">Cliente</TableHead>
                                        <TableHead className="text-gray-400">Plano</TableHead>
                                        <TableHead className="text-gray-400">Valor</TableHead>
                                        <TableHead className="text-gray-400">Dia Cobrança</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-right text-gray-400">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subscriptions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-lg">
                                                Nenhuma assinatura exclusiva encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <TableRow key={sub.id} className="border-b-[#333] hover:bg-white/5">
                                                <TableCell>
                                                    <div className="font-medium text-white">{sub.client.name}</div>
                                                    <div className="text-sm text-gray-500">{sub.client.phone}</div>
                                                </TableCell>
                                                {/* Highlights Exclusivo */}
                                                <TableCell className="text-gold font-bold">{sub.planName}</TableCell>
                                                <TableCell className="text-gray-300">R$ {sub.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-gray-300">Dia {sub.billingDay}</TableCell>
                                                <TableCell>{getStatusBadge(sub.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleGeneratePaymentLink(sub)} className="hover:bg-green-600/20 hover:text-green-500">
                                                            <LinkIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sub)}>
                                                            <Edit className="h-4 w-4 text-blue-400" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            setSubscriptionToDelete(sub.id);
                                                            setIsDeleteDialogOpen(true);
                                                        }}>
                                                            <Trash2 className="h-4 w-4 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOGS - reusing logic */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[#1a1a1a] border-[#333] text-white">
                    <DialogHeader>
                        <DialogTitle>{selectedSubscription ? 'Editar Assinatura Exclusiva' : 'Nova Assinatura Exclusiva'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* CLIENT SELECT */}
                        <div className="space-y-2">
                            <Label>Cliente</Label>
                            {!selectedSubscription ? (
                                <div className="relative">
                                    <Input
                                        placeholder="Buscar cliente..."
                                        value={clientSearchTerm}
                                        onChange={(e) => setClientSearchTerm(e.target.value)}
                                        className="bg-[#111] border-[#333] mb-2"
                                    />
                                    <Select
                                        value={formData.clientId}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, clientId: val }))}
                                    >
                                        <SelectTrigger className="bg-[#111] border-[#333]">
                                            <SelectValue placeholder="Selecione um cliente" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                                            {filteredClients.map(client => (
                                                <SelectItem key={client.id} value={client.id}>{client.name} - {client.phone}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <Input value={subscriptions.find(s => s.id === selectedSubscription.id)?.client.name || ''} disabled className="bg-[#111] border-[#333] text-gray-500" />
                            )}
                        </div>

                        {/* PLAN SELECT (Only Exclusive) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Plano</Label>
                                <Select
                                    value={formData.planId}
                                    onValueChange={(val) => {
                                        const plan = plans.find(p => p.id === val);
                                        if (plan) {
                                            setFormData(prev => ({
                                                ...prev,
                                                planId: val,
                                                planName: plan.name,
                                                amount: plan.price.toString(),
                                                billingDay: prev.billingDay || '10',
                                                servicesIncluded: plan.servicesIncluded || '',
                                                usageLimit: plan.usageLimit?.toString() || ''
                                            }));
                                            // Parse structured
                                            if (plan.servicesIncluded) {
                                                try {
                                                    const p = JSON.parse(plan.servicesIncluded);
                                                    if (p.services) setSelectedServices(p.services);
                                                    if (p.products) setSelectedProducts(p.products);
                                                    setInclusionMode('structured');
                                                } catch { }
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-[#111] border-[#333]">
                                        <SelectValue placeholder="Selecione um plano" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                                        {plans.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name} - R$ {plan.price}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Mensal</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="bg-[#111] border-[#333]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dia de Cobrança</Label>
                                <Input
                                    type="number" min="1" max="31"
                                    value={formData.billingDay}
                                    onChange={(e) => setFormData({ ...formData, billingDay: e.target.value })}
                                    className="bg-[#111] border-[#333]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger className="bg-[#111] border-[#333]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                                        <SelectItem value="ACTIVE">Ativa</SelectItem>
                                        <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Resources Included Section (Simplified for this file to Text if simpler, or keep structured) */}
                        {/* Keeping similar logic to original page but might need imports if I haven't imported everything */}

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-gold text-black hover:bg-gold/80" disabled={submitting}>
                                {submitting ? 'Salvando...' : 'Salvar Assinatura'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Payment Link Dialog */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-[#333] text-white">
                    <DialogHeader>
                        <DialogTitle>Link de Pagamento Gerado</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="link" className="sr-only">Link</Label>
                            <Input
                                id="link"
                                defaultValue={generatedLink?.linkUrl}
                                readOnly
                                className="bg-[#111] border-[#333]"
                            />
                        </div>
                        <Button size="sm" className="px-3" onClick={handleCopyLink}>
                            <span className="sr-only">Copiar</span>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="secondary"
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                            onClick={handleSendWhatsApp}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Enviar via WhatsApp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#1a1a1a] border-[#333] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a assinatura.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#333] border-none hover:bg-[#444] text-white">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
