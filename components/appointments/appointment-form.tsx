"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00'
];

const formSchema = z.object({
    clientId: z.string().min(1, "Selecione o cliente"),
    barberId: z.string().min(1, "Selecione o barbeiro"),
    serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
    date: z.date({ required_error: "Selecione a data" }),
    time: z.string().min(1, "Selecione o horário"),
    paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
    notes: z.string().optional(),
});

interface AppointmentFormProps {
    clients: { id: string; name: string; phone: string }[];
    barbers: { id: string; name: string; commissionRate: number }[];
    services: { id: string; name: string; price: number; duration: number }[];
    onSuccess: () => void;
    onCancel: () => void;
}

export function AppointmentForm({
    clients,
    barbers,
    services,
    onSuccess,
    onCancel,
}: AppointmentFormProps) {
    const [submitting, setSubmitting] = useState(false);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: "",
            barberId: "",
            serviceIds: [],
            paymentMethod: "",
            notes: "",
            time: "",
        },
    });

    const selectedServices = form.watch("serviceIds");
    const selectedBarberId = form.watch("barberId");

    const calculateTotal = () => {
        return selectedServices.reduce((sum, id) => {
            const service = services.find((s) => s.id === id);
            return sum + (service?.price || 0);
        }, 0);
    };

    const calculateCommission = () => {
        const total = calculateTotal();
        const barber = barbers.find((b) => b.id === selectedBarberId);
        return barber ? (total * barber.commissionRate) / 100 : 0;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setSubmitting(true);
        try {
            // Combine date and time into a single ISO string for the backend logic (it expects 'date' as ISO string or similar)
            // The backend splits 'T', so we construct "YYYY-MM-DDTHH:mm:ss"
            // values.date is Date object. values.time is "HH:mm"

            const dateStr = format(values.date, "yyyy-MM-dd");
            const fullDate = `${dateStr}T${values.time}:00`;

            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: values.clientId,
                    barberId: values.barberId,
                    serviceIds: values.serviceIds,
                    date: fullDate,
                    paymentMethod: values.paymentMethod,
                    notes: values.notes,
                }),
            });

            if (res.ok) {
                toast.success("Atendimento registrado com sucesso!");
                form.reset();
                onSuccess();
            } else {
                const error = await res.json();
                toast.error(error.error || "Erro ao registrar atendimento");
            }
        } catch (error) {
            console.error("Error creating appointment:", error);
            toast.error("Erro ao registrar atendimento");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Cliente *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                                            <SelectValue placeholder="Selecione o cliente" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name} - {client.phone}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="barberId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Barbeiro *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                                            <SelectValue placeholder="Selecione o barbeiro" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {barbers.map((barber) => (
                                            <SelectItem key={barber.id} value={barber.id}>
                                                {barber.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-white">Data *</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "h-12 w-full pl-3 text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-gold-500",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ptBR })
                                                ) : (
                                                    <span>Selecione a data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-black/95 border-gold-500/20" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date(new Date().setHours(0, 0, 0, 0))
                                            }
                                            initialFocus
                                            locale={ptBR}
                                            className="text-white"
                                            classNames={{
                                                day_selected: "bg-gold-500 text-black hover:bg-gold-600 focus:bg-gold-600",
                                                day_today: "bg-white/10 text-white",
                                                day_outside: "text-gray-600 opacity-50",
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Horário *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                                            <SelectValue placeholder="Selecione o horário" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-60">
                                        {TIME_SLOTS.map((time) => (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="serviceIds"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base text-white">Serviços *</FormLabel>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="serviceIds"
                                        render={({ field }) => {
                                            return (
                                                <FormItem
                                                    key={item.id}
                                                    className={cn(
                                                        "flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 transition-all cursor-pointer",
                                                        field.value?.includes(item.id)
                                                            ? "bg-gold-500/10 border-gold-500"
                                                            : "bg-white/5 border-white/10 hover:border-gold-500/50"
                                                    )}
                                                >
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, item.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                            (value) => value !== item.id
                                                                        )
                                                                    );
                                                            }}
                                                            className="border-white/20 data-[state=checked]:bg-gold-500 data-[state=checked]:text-black"
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none w-full">
                                                        <FormLabel className="font-bold text-white cursor-pointer w-full block">
                                                            {item.name}
                                                        </FormLabel>
                                                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                                                            <span>{item.duration} min</span>
                                                            <span className="text-gold-500 font-bold">{formatCurrency(item.price)}</span>
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            );
                                        }}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="bg-gold-500/5 border border-gold-500/20 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="space-y-1 text-center md:text-left">
                        <p className="text-xs font-bold uppercase tracking-widest text-gold-500">Total Estimado</p>
                        <p className="text-3xl font-serif font-bold text-gold-500">{formatCurrency(calculateTotal())}</p>
                    </div>
                    <div className="space-y-1 text-center md:text-right">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Sua Comissão</p>
                        <p className="text-xl font-bold text-gray-300">{formatCurrency(calculateCommission())}</p>
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Forma de Pagamento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="CASH">Dinheiro</SelectItem>
                                    <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                    <SelectItem value="PIX">PIX</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Observações</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Alguma observação especial?"
                                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 h-12 bg-white/5 border-white/10 text-white font-bold hover:bg-white/10"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-12 bg-gold-gradient text-black font-bold shadow-gold hover:scale-[1.02] transition-transform"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            "Agendar"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
