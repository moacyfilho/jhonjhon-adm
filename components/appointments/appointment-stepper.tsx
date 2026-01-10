
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, DollarSign, Search, User, X, AlertCircle, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

// Types
interface Client { id: string; name: string; phone: string; }
interface Barber { id: string; name: string; commissionRate: number; }
interface Service { id: string; name: string; price: number; duration: number; }

interface AppointmentStepperProps {
    clients: Client[];
    barbers: Barber[];
    services: Service[];
    onSuccess: () => void;
    onCancel: () => void;
}

const STEPS = [
    { id: 0, title: "Cliente", icon: User },
    { id: 1, title: "Serviços", icon: Scissors },
    { id: 2, title: "Agendamento", icon: CalendarIcon },
    { id: 3, title: "Confirmar", icon: Check },
];

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00'
];

export function AppointmentStepper({ clients, barbers, services, onSuccess, onCancel }: AppointmentStepperProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientId: "",
        clientSearch: "",
        serviceIds: [] as string[],
        barberId: "",
        date: undefined as Date | undefined,
        time: "",
        paymentMethod: "CASH",
        notes: "",
    });

    // Derived State
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const selectedBarber = barbers.find(b => b.id === formData.barberId);
    const selectedServicesList = services.filter(s => formData.serviceIds.includes(s.id));

    const totalAmount = selectedServicesList.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServicesList.reduce((sum, s) => sum + s.duration, 0);

    // Handlers
    const handleNext = () => {
        if (validateStep(currentStep)) {
            setDirection(1);
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const validateStep = (step: number) => {
        switch (step) {
            case 0:
                if (!formData.clientId) {
                    toast.error("Selecione um cliente para continuar");
                    return false;
                }
                return true;
            case 1:
                if (formData.serviceIds.length === 0) {
                    toast.error("Selecione pelo menos um serviço");
                    return false;
                }
                return true;
            case 2:
                if (!formData.date || !formData.time || !formData.barberId) {
                    toast.error("Selecione barbeiro, data e horário");
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return; // Should be valid by now
        setLoading(true);

        try {
            const dateStr = format(formData.date!, "yyyy-MM-dd");
            const fullDate = `${dateStr}T${formData.time}:00`;

            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: formData.clientId,
                    barberId: formData.barberId,
                    serviceIds: formData.serviceIds,
                    date: fullDate,
                    paymentMethod: formData.paymentMethod,
                    notes: formData.notes,
                }),
            });

            if (res.ok) {
                toast.success("Agendamento realizado com sucesso!");
                onSuccess();
            } else {
                const error = await res.json();
                toast.error(error.error || "Erro ao criar agendamento");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    // Sort clients alphabetically once
    const sortedClients = useMemo(() => {
        return [...clients].sort((a, b) => a.name.localeCompare(b.name));
    }, [clients]);

    // Filtered Clients
    const filteredClients = useMemo(() => {
        if (!formData.clientSearch) return sortedClients.slice(0, 50);
        const search = formData.clientSearch.toLowerCase().trim();
        return sortedClients.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.phone && c.phone.includes(search)) ||
            (c.phone && c.phone.replace(/\D/g, '').includes(search.replace(/\D/g, '')))
        ).slice(0, 50);
    }, [sortedClients, formData.clientSearch]);

    const slideVariants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (direction: number) => ({ x: direction > 0 ? -50 : 50, opacity: 0 }),
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-transparent">
            {/* Steps Header */}
            <div className="flex justify-between items-center mb-6 px-2">
                {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center relative z-10">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                    isActive ? "bg-gold-500 border-gold-500 text-black scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]" :
                                        isCompleted ? "bg-green-500 border-green-500 text-black" :
                                            "bg-black/40 border-white/10 text-gray-500"
                                )}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={cn(
                                "text-xs font-bold mt-2 uppercase tracking-wide transition-colors duration-300",
                                isActive ? "text-gold-500" : isCompleted ? "text-green-500" : "text-gray-600"
                            )}>
                                {step.title}
                            </span>

                            {/* Connector Line */}
                            {index < STEPS.length - 1 && (
                                <div className="absolute top-5 left-1/2 w-[calc(100vw/5)] max-w-[120px] h-[2px] -z-10 bg-white/5">
                                    <div
                                        className="h-full bg-gold-500 transition-all duration-500"
                                        style={{ width: index < currentStep ? '100%' : '0%' }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="h-full flex flex-col"
                    >
                        {/* STEP 0: CLIENT */}
                        {currentStep === 0 && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                        placeholder="Buscar cliente por nome ou telefone..."
                                        className="pl-10 h-12 bg-black/20 border-white/10 text-white focus:border-gold-500 text-lg"
                                        value={formData.clientSearch}
                                        onChange={(e) => setFormData(p => ({ ...p, clientSearch: e.target.value }))}
                                        autoFocus
                                    />
                                </div>

                                <ScrollArea className="flex-1 pr-4 -mr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                onClick={() => setFormData(p => ({ ...p, clientId: client.id }))}
                                                className={cn(
                                                    "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
                                                    formData.clientId === client.id
                                                        ? "bg-gold-500/20 border-gold-500 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]"
                                                        : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-gold-500/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                                        formData.clientId === client.id ? "bg-gold-500 text-black" : "bg-white/10 text-gray-400"
                                                    )}>
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className={cn("font-bold text-lg", formData.clientId === client.id ? "text-gold-500" : "text-white")}>
                                                            {client.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                                            <span className="text-xs opacity-60">📞</span> {client.phone}
                                                        </p>
                                                    </div>
                                                </div>
                                                {formData.clientId === client.id && (
                                                    <Check className="w-6 h-6 text-gold-500 animate-in zoom-in" />
                                                )}
                                            </div>
                                        ))}
                                        {filteredClients.length === 0 && (
                                            <div className="col-span-full text-center py-10 text-gray-500">
                                                Nenhum cliente encontrado.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* STEP 1: SERVICES */}
                        {currentStep === 1 && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Scissors className="text-gold-500" /> Selecione os Serviços
                                    </h3>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">Selecionados: <span className="text-white font-bold">{formData.serviceIds.length}</span></p>
                                        <p className="text-gold-500 font-bold">{formatCurrency(totalAmount)}</p>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 pr-4 -mr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {services.map(service => {
                                            const isSelected = formData.serviceIds.includes(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => {
                                                        setFormData(p => ({
                                                            ...p,
                                                            serviceIds: isSelected
                                                                ? p.serviceIds.filter(id => id !== service.id)
                                                                : [...p.serviceIds, service.id]
                                                        }));
                                                    }}
                                                    className={cn(
                                                        "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                                                        isSelected
                                                            ? "bg-gold-500/20 border-gold-500 shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]"
                                                            : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-gold-500/30"
                                                    )}
                                                >
                                                    <div>
                                                        <p className={cn("font-bold", isSelected ? "text-gold-500" : "text-white")}>{service.name}</p>
                                                        <p className="text-sm text-gray-500">{service.duration} mins</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-white mb-1">{formatCurrency(service.price)}</p>
                                                        {isSelected && <Badge className="bg-gold-500 text-black hover:bg-gold-600">Selecionado</Badge>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* STEP 2: SCHEDULE */}
                        {currentStep === 2 && (
                            <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-4">
                                    {/* Barber Selection */}
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 uppercase text-xs font-bold tracking-widest">Profissional</Label>
                                        <Select
                                            value={formData.barberId}
                                            onValueChange={val => setFormData(p => ({ ...p, barberId: val }))}
                                        >
                                            <SelectTrigger className="h-12 bg-black/20 border-white/10 text-white">
                                                <SelectValue placeholder="Selecione o barbeiro" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {barbers.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Calendar */}
                                    <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex-1">
                                        <Calendar
                                            mode="single"
                                            selected={formData.date}
                                            onSelect={date => setFormData(p => ({ ...p, date }))}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            initialFocus
                                            locale={ptBR}
                                            className="text-white w-full flex justify-center"
                                            classNames={{
                                                day_selected: "bg-gold-500 text-black hover:bg-gold-600 focus:bg-gold-600 font-bold",
                                                day_today: "bg-white/10 text-white font-bold text-gold-500",
                                                head_cell: "text-gray-500 font-normal text-[0.8rem]",
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <Label className="text-gray-400 uppercase text-xs font-bold tracking-widest">Horário Disponível</Label>
                                    {!formData.date || !formData.barberId ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                                            <Clock className="w-10 h-10 mb-2 opacity-50" />
                                            <p className="text-sm">Selecione barbeiro e data</p>
                                        </div>
                                    ) : (
                                        <ScrollArea className="flex-1 bg-black/20 border border-white/5 rounded-2xl p-4">
                                            <div className="grid grid-cols-3 gap-2">
                                                {TIME_SLOTS.map(time => (
                                                    <Button
                                                        key={time}
                                                        variant="outline"
                                                        onClick={() => setFormData(p => ({ ...p, time }))}
                                                        className={cn(
                                                            "border-white/10 hover:border-gold-500/50 transition-all",
                                                            formData.time === time
                                                                ? "bg-gold-500 text-black font-bold hover:bg-gold-600"
                                                                : "bg-transparent text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        {time}
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: SUMMARY */}
                        {currentStep === 3 && (
                            <div className="h-full flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                                        <h4 className="flex items-center gap-2 text-gold-500 font-bold border-b border-white/10 pb-2">
                                            <User className="w-4 h-4" /> Cliente
                                        </h4>
                                        <div>
                                            <p className="text-xl font-bold text-white">{selectedClient?.name}</p>
                                            <p className="text-sm text-gray-400">{selectedClient?.phone}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                                        <h4 className="flex items-center gap-2 text-gold-500 font-bold border-b border-white/10 pb-2">
                                            <CalendarIcon className="w-4 h-4" /> Agendamento
                                        </h4>
                                        <div>
                                            <p className="text-xl font-bold text-white">
                                                {formData.date && format(formData.date, "dd 'de' MMMM", { locale: ptBR })}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                às <span className="text-white font-bold">{formData.time}</span> com {selectedBarber?.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 bg-black/20 rounded-xl border border-white/10 p-4 space-y-4">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Resumo Financeiro</h4>

                                    <div className="space-y-2">
                                        {selectedServicesList.map(s => (
                                            <div key={s.id} className="flex justify-between text-sm">
                                                <span className="text-gray-300">{s.name}</span>
                                                <span className="text-white font-medium">{formatCurrency(s.price)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className="bg-white/10 my-4" />

                                    <div className="flex justify-between items-center bg-gold-500/10 p-4 rounded-xl border border-gold-500/20">
                                        <span className="text-lg font-bold text-gold-500">Total a Pagar</span>
                                        <span className="text-2xl font-serif font-bold text-white">{formatCurrency(totalAmount)}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs uppercase">Pagamento</Label>
                                            <Select
                                                value={formData.paymentMethod}
                                                onValueChange={val => setFormData(p => ({ ...p, paymentMethod: val }))}
                                            >
                                                <SelectTrigger className="bg-white/5 text-white border-white/10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CASH">Dinheiro</SelectItem>
                                                    <SelectItem value="PIX">PIX</SelectItem>
                                                    <SelectItem value="CREDIT_CARD">Crédito</SelectItem>
                                                    <SelectItem value="DEBIT_CARD">Débito</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs uppercase">Obs (Opcional)</Label>
                                            <Input
                                                placeholder="..."
                                                className="bg-white/5 border-white/10 text-white"
                                                value={formData.notes}
                                                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / Navigation Actions */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                <Button
                    variant="ghost"
                    onClick={currentStep === 0 ? onCancel : handleBack}
                    className="text-gray-400 hover:text-white"
                >
                    {currentStep === 0 ? "Cancelar" : "Voltar"}
                </Button>

                <div className="flex gap-2">
                    {currentStep === 3 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 shadow-lg shadow-green-500/20"
                        >
                            {loading ? "Processando..." : "Confirmar Agendamento"}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-gold-gradient text-black font-bold px-8 shadow-gold hover:scale-105 transition-transform"
                        >
                            Próximo <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
