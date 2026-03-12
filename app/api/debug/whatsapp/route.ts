import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { WHATSAPP_UZAPI_URL, WHATSAPP_UZAPI_SESSION, WHATSAPP_UZAPI_SESSION_KEY } = env;

  // Testa conexão com UZapi
  let uzapiStatus = 'not_tested';
  let uzapiError = '';
  let uzapiResponse = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${WHATSAPP_UZAPI_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'sessionkey': WHATSAPP_UZAPI_SESSION_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    uzapiStatus = res.ok ? 'ok' : `error_${res.status}`;
    uzapiResponse = await res.text();
  } catch (e: any) {
    uzapiStatus = 'exception';
    uzapiError = e.message;
  }

  return NextResponse.json({
    config: {
      url: WHATSAPP_UZAPI_URL,
      session: WHATSAPP_UZAPI_SESSION,
      sessionKey: WHATSAPP_UZAPI_SESSION_KEY ? `${WHATSAPP_UZAPI_SESSION_KEY.slice(0, 3)}***` : 'NOT SET',
    },
    uzapiStatus,
    uzapiError: uzapiError || undefined,
    uzapiResponse: uzapiResponse || undefined,
  });
}
