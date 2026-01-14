import { CreditCard, ExternalLink, Crown, QrCode, Banknote, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

interface Plan {
    id: string;
    name: string;
    price: number;
    paymentLink?: string | null;
    servicesIncluded?: string | null;
}

interface PlanSelectionProps {
    plans: Plan[];
}

export function PlanSelection({ plans }: PlanSelectionProps) {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    if (plans.length === 0) return null;

    const handleSubscribe = (plan: Plan) => {
        setSelectedPlan(plan);
    };

    const handleConfirmPayment = () => {
        if (selectedPlan?.paymentLink) {
            window.open(selectedPlan.paymentLink, '_blank');
            setSelectedPlan(null);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-2">
                <Crown className="text-gold-500 w-5 h-5" />
                <h3 className="text-xl font-serif font-bold text-white uppercase tracking-wider">
                    CONTRATE SEU PLANO DE ASSINATURA !!
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => {
                    return (
                        <div
                            key={plan.id}
                            className="glass-panel p-5 rounded-2xl border-white/5 hover:border-gold-500/50 transition-all duration-300 relative group flex flex-col justify-between h-full bg-black/40 text-center items-center"
                        >
                            <div className="space-y-3 mb-4 w-full">
                                <h4 className="text-lg font-bold font-serif text-white group-hover:text-gold-500 transition-colors">
                                    {plan.name}
                                </h4>
                                <div className="flex items-center justify-center gap-1 text-gold-500">
                                    <span className="text-sm text-gray-400">R$</span>
                                    <span className="text-xl font-bold">{plan.price.toFixed(2).replace('.', ',')}</span>
                                    <span className="text-sm text-gray-500 mx-1">-</span>
                                    <span className="text-sm text-gray-400">
                                        {plan.name.toLowerCase().includes('corte & barba') ? '60min' : '30min'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                    Clique para assinar e garantir benefícios exclusivos.
                                </p>
                            </div>

                            {plan.paymentLink ? (
                                <Button
                                    onClick={() => handleSubscribe(plan)}
                                    variant="outline"
                                    className="w-full border-white/10 hover:bg-gold-500 hover:text-black hover:border-gold-500 transition-all font-bold uppercase tracking-wider text-xs h-10 gap-2"
                                >
                                    Assinar Agora <ExternalLink className="w-3 h-3" />
                                </Button>
                            ) : (
                                <Button
                                    disabled
                                    variant="outline"
                                    className="w-full border-white/5 text-gray-500 cursor-not-allowed font-bold uppercase tracking-wider text-xs h-10"
                                >
                                    Indisponível
                                </Button>
                            )
                            }
                        </div>
                    );
                })}
            </div>

            <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
                <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-serif font-bold text-center text-gold-500">
                            Escolha o Pagamento
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400">
                            Você será redirecionado para o ambiente seguro do Asaas.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlan && (
                        <div className="space-y-6 py-4">
                            <div className="text-center bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Plano Selecionado</p>
                                <h4 className="text-xl font-bold text-white mb-2">{selectedPlan.name}</h4>
                                <p className="text-2xl font-black text-gold-500">
                                    R$ {selectedPlan.price.toFixed(2).replace('.', ',')}
                                    <span className="text-sm text-gray-500 font-normal ml-1">/mês</span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs uppercase text-gray-500 font-bold tracking-widest text-center">Formas Aceitas</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold-500/30 transition-colors">
                                        <QrCode className="w-6 h-6 text-emerald-400" />
                                        <span className="text-xs font-bold text-gray-300">PIX</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold-500/30 transition-colors">
                                        <CreditCard className="w-6 h-6 text-blue-400" />
                                        <span className="text-xs font-bold text-gray-300">Crédito</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold-500/30 transition-colors">
                                        <Banknote className="w-6 h-6 text-purple-400" />
                                        <span className="text-xs font-bold text-gray-300">Débito</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            onClick={handleConfirmPayment}
                            className="w-full bg-gold-gradient text-black font-black h-12 text-sm uppercase tracking-wide hover:scale-[1.02] transition-transform shadow-gold"
                        >
                            Ir para Pagamento Seguro <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
