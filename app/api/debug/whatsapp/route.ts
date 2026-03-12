import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// GET - verifica config
export async function GET() {
  const { WHATSAPP_UZAPI_URL, WHATSAPP_UZAPI_SESSION, WHATSAPP_UZAPI_SESSION_KEY } = env;

  return NextResponse.json({
    config: {
      url: WHATSAPP_UZAPI_URL,
      session: WHATSAPP_UZAPI_SESSION,
      sessionKey: WHATSAPP_UZAPI_SESSION_KEY ? `${WHATSAPP_UZAPI_SESSION_KEY.slice(0, 3)}***` : 'NOT SET',
      sessionKeyFull: WHATSAPP_UZAPI_SESSION_KEY, // temporário para debug
    },
    instructions: 'POST { "phone": "92XXXXXXXXX", "message": "teste" } para enviar mensagem de teste',
  });
}

// POST - envia mensagem de teste
export async function POST(req: NextRequest) {
  const { WHATSAPP_UZAPI_URL, WHATSAPP_UZAPI_SESSION, WHATSAPP_UZAPI_SESSION_KEY } = env;
  const { phone, message } = await req.json();

  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  const payload = {
    session: WHATSAPP_UZAPI_SESSION,
    number: cleanPhone,
    text: message || 'Teste de conexão WhatsApp - Barbearia Jhon Jhon',
  };

  let status = 0;
  let responseText = '';
  let fetchError = '';

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${WHATSAPP_UZAPI_URL}/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionkey': WHATSAPP_UZAPI_SESSION_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    status = res.status;
    responseText = await res.text();
  } catch (e: any) {
    fetchError = e.message;
  }

  return NextResponse.json({
    config: {
      url: `${WHATSAPP_UZAPI_URL}/sendText`,
      session: WHATSAPP_UZAPI_SESSION,
      sessionKey: WHATSAPP_UZAPI_SESSION_KEY,
    },
    sentTo: cleanPhone,
    payload,
    httpStatus: status,
    response: responseText,
    fetchError: fetchError || undefined,
  });
}
