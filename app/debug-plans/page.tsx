
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugPlansPage() {
    const plans = await prisma.plan.findMany();

    // Masking sensitive info
    const envCheck = {
        DATABASE_URL: process.env.DATABASE_URL ? (process.env.DATABASE_URL.substring(0, 15) + "...") : "MISSING",
        DIRECT_URL: process.env.DIRECT_URL ? "Present" : "Missing"
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-mono">
            <h1 className="text-3xl font-bold text-gold-500 mb-6">Diagnóstico de Planos</h1>

            <div className="space-y-6">
                <section className="border border-white/20 p-4 rounded-lg">
                    <h2 className="text-xl font-bold mb-2 text-blue-400">Ambiente</h2>
                    <pre>{JSON.stringify(envCheck, null, 2)}</pre>
                </section>

                <section className="border border-white/20 p-4 rounded-lg">
                    <h2 className="text-xl font-bold mb-2 text-green-400">
                        Planos no Banco ({plans.length})
                    </h2>
                    {plans.length === 0 ? (
                        <p className="text-red-500 font-bold">NENHUM PLANO ENCONTRADO!</p>
                    ) : (
                        <pre className="whitespace-pre-wrap bg-white/5 p-4 rounded">
                            {JSON.stringify(plans, null, 2)}
                        </pre>
                    )}
                </section>
            </div>
        </div>
    );
}
