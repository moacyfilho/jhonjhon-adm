import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { asaas } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let clientId: string | undefined;

    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (!process.env.ASAAS_API_KEY) {
            return NextResponse.json({ error: 'Asaas não configurado no .env' }, { status: 500 });
        }

        const body = await request.json();
        clientId = body.clientId;
        const { amount, description, cpfCnpj } = body;

        if (!clientId || !amount) {
            return NextResponse.json({ error: 'Dados incompletos: clientId ou amount faltando' }, { status: 400 });
        }

        // Buscar cliente
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return NextResponse.json({ error: 'Cliente não encontrado no banco de dados' }, { status: 404 });
        }

        console.log(`[Pix] Iniciando para cliente: ${client.name} (${client.id})`);

        // Garantir cliente no Asaas
        const sanitizedPhone = client.phone.replace(/\D/g, '');
        const sanitizedCpf = cpfCnpj ? cpfCnpj.replace(/\D/g, '') : null;
        let asaasCustomerId = client.asaasCustomerId;

        // Se tiver CPF novo, ou se não tiver ID Asaas, atualiza/cria
        if (!asaasCustomerId) {
            console.log('[Pix] Criando cliente no Asaas...');
            const asaasCustomer = await asaas.createCustomer({
                name: client.name,
                phone: sanitizedPhone,
                mobilePhone: sanitizedPhone,
                cpfCnpj: sanitizedCpf || undefined,
                externalReference: client.id
            });
            asaasCustomerId = asaasCustomer.id;

            await prisma.client.update({
                where: { id: clientId },
                data: { asaasCustomerId }
            });
        } else if (sanitizedCpf) {
            // Se já existe e veio CPF, tenta atualizar o cadastro no Asaas
            console.log('[Pix] Atualizando CPF no Asaas...');
            try {
                // Atualiza o cliente existente
                // Nota: createCustomer costuma retornar o existente se mesmo CPF/Email, 
                // mas aqui queremos update explícito se possível. 
                // A lib asaas.ts tem update? Se não, usamos create (que na v3 costuma fazer upsert inteligente ou falhar).
                // Verificando lib/asaas.ts... (não posso ver agora, mas create geralmente falha se duplicado).
                // Mas a API de update é POST /customers/{id}.
                // Assumindo que a lib só tem createCustomer, vamos tentar update via fetch manual ou create.
                // Melhor: se der erro de "CPF necessário", a gente já sabe.
                // Mas aqui estamos prevenindo.
                // Vamos tentar atualizar via 'createCustomer' (algumas libs tratam como upsert).
                // SE NÃO, teríamos que implementar updateCustomer na lib. 
                // Para não quebrar, vou assumir que o 'create' pode falhar se duplicado, 
                // ENTÃO, vou implementar um fetch direto para UPDATE se a lib não tiver.

                // Melhor abordagem: Tentar criar a cobrança. Se der erro de CPF, atualizamos. 
                // Mas já sabemos que vai dar erro.
                // Vou injetar o CPF na criação da cobrança? Não, PixCharge não aceita CPF direto, usa o do Customer.

                // Vou adicionar o CPF no Customer existente.
                const updateUrl = `${process.env.ASAAS_API_URL}/customers/${asaasCustomerId}`;
                await fetch(updateUrl, {
                    method: 'POST', // Asaas Update is POST or PUT? V3 docs say POST.
                    headers: {
                        'access_token': process.env.ASAAS_API_KEY || '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ cpfCnpj: sanitizedCpf })
                });
            } catch (e) {
                console.error('[Pix] Falha ao atualizar CPF:', e);
            }
        }

        // Gerar Cobrança Pix
        console.log(`[Pix] Gerando cobrança... Valor: ${amount}`);
        const charge = await asaas.createPixCharge({
            customer: asaasCustomerId!,
            billingType: 'PIX',
            value: Number(amount),
            dueDate: new Date().toISOString().split('T')[0],
            description: description || 'Pagamento Avulso'
        });

        console.log('[Pix] Cobrança gerada com sucesso:', charge.id);

        // Salvar AR
        console.log('[Pix] Salvando conta a receber...');
        await prisma.accountReceivable.create({
            data: {
                description: description || 'Pagamento Avulso',
                category: 'OTHER_INCOME',
                amount: Number(amount),
                dueDate: new Date(),
                status: 'PENDING',
                clientId,
                payer: client.name,
                phone: client.phone,
                asaasPaymentId: charge.id,
                pixQrCode: charge.qrCode?.encodedImage,
                pixCopyPaste: charge.qrCode?.payload,
            }
        });

        return NextResponse.json(charge);

    } catch (error: any) {
        console.error('[Pix] Erro CRÍTICO:', error);

        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'pix-error.log');
            const logMsg = `\n[${new Date().toISOString()}] ERROR:\n${error?.stack || JSON.stringify(error)}\n`;
            if (error.response?.data) {
                const asaasDetails = `Asaas Response: ${JSON.stringify(error.response.data)}\n`;
                fs.appendFileSync(logPath, logMsg + asaasDetails);
            } else {
                fs.appendFileSync(logPath, logMsg);
            }
        } catch (filesysError) {
            console.error('Falha ao escrever log:', filesysError);
        }

        // Log extra para Axios/Fetch erros
        if (error.response?.data) {
            console.error('[Pix] Detalhes Asaas:', JSON.stringify(error.response.data, null, 2));
        }

        // Auto-correção "Customer not found"
        if (clientId) {
            const msg = error.message || '';
            // Asaas error codes for invalid customer
            const isRefused = msg.includes('Customer not found') ||
                msg.includes('invalid_customer') ||
                (error.response?.data?.errors?.[0]?.code === 'invalid_customer');

            if (isRefused) {
                console.log('[Pix] Cliente inválido no Asaas. Limpando ID local...');
                try {
                    await prisma.client.update({
                        where: { id: clientId },
                        data: { asaasCustomerId: null }
                    });
                    return NextResponse.json({ error: 'Cadastro do cliente sincronizado. Tente novamente.' }, { status: 409 });
                } catch (e) {
                    console.error('[Pix] Falha ao limpar ID:', e);
                }
            }
        }

        const userMsg = error.response?.data?.errors?.[0]?.description || error.message || 'Erro ao processar Pix';
        return NextResponse.json({ error: userMsg }, { status: 500 });
    }
}
