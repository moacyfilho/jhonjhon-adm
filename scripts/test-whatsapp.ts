
// Script para testar o envio de WhatsApp
// Uso: npx tsx scripts/test-whatsapp.ts <NUMERO_TELEFONE>

const INTERNAL_TOKEN = 'ShRZdv';
const API_URL = 'http://localhost:3000/api/whatsapp/send';

async function testSend() {
    // Pega o número do argumento da linha de comando
    const phone = process.argv[2];

    if (!phone) {
        console.error('❌ Por favor, forneça um número de telefone.');
        console.error('Uso: npx tsx scripts/test-whatsapp.ts 11999999999');
        process.exit(1);
    }

    console.log(`📱 Testando envio para: ${phone}`);
    console.log(`🔑 Usando token: ${INTERNAL_TOKEN}`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Token': INTERNAL_TOKEN
            },
            body: JSON.stringify({
                whatsapp: phone,
                message: '🤖 Esta é uma mensagem de teste do seu Backend Next.js!'
            })
        });

        const status = response.status;
        const data = await response.json();

        console.log(`\n📡 Status HTTP: ${status}`);
        console.log('📄 Resposta:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Teste concluído com sucesso!');
        } else {
            console.log('\n⚠️ O servidor retornou um erro.');
        }

    } catch (error) {
        console.error('\n❌ Erro ao conectar com o servidor:');
        console.error(error);
        console.log('\nDica: Verifique se o servidor está rodando com "npm run dev"');
    }
}

testSend();
