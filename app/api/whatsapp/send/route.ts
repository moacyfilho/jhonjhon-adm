import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { env } from '@/lib/env';

export async function POST(req: Request) {
    try {
        const {
            WHATSAPP_UZAPI_URL,
            WHATSAPP_UZAPI_SESSION,
            WHATSAPP_UZAPI_SESSION_KEY,
            INTERNAL_API_TOKEN
        } = env;

        if (!WHATSAPP_UZAPI_URL || !WHATSAPP_UZAPI_SESSION || !WHATSAPP_UZAPI_SESSION_KEY) {
            return NextResponse.json({ error: "WhatsApp nao configurado" }, { status: 503 });
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { whatsapp, message } = body;

        if (!whatsapp || !message) {
            return NextResponse.json({ error: "Missing whatsapp or message" }, { status: 400 });
        }

        // Auth Logic
        const internalToken = req.headers.get('X-Internal-Token');
        const isInternal = internalToken && INTERNAL_API_TOKEN && internalToken === INTERNAL_API_TOKEN;

        if (!isInternal) {
            const session = await getServerSession(authOptions);
            if (!session) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        // Phone Validation
        let cleanPhone = whatsapp.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone;
        }

        if (cleanPhone.length < 12 || cleanPhone.length > 13) {
            return NextResponse.json({ error: "Invalid phone number length (must be 12-13 digits)" }, { status: 400 });
        }

        // UZAPI Request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(`${WHATSAPP_UZAPI_URL}/sendText`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'sessionkey': WHATSAPP_UZAPI_SESSION_KEY,
                },
                body: JSON.stringify({
                    session: WHATSAPP_UZAPI_SESSION,
                    number: cleanPhone,
                    text: message
                }),
                signal: controller.signal
            });

            console.log('Sending to UZAPI:', `${WHATSAPP_UZAPI_URL}/sendText`);
            console.log('Session Key:', WHATSAPP_UZAPI_SESSION_KEY);
            console.log('Body:', { session: WHATSAPP_UZAPI_SESSION, number: cleanPhone, text: message });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                const urlDebug = `${WHATSAPP_UZAPI_URL}/sendText`;
                console.error(`❌ UZAPI Error (${response.status}):`, errorText); // Better visual log
                return NextResponse.json({
                    error: "Provider error",
                    details: errorText,
                    status: response.status
                }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);

        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                return NextResponse.json({ error: "Timeout" }, { status: 504 });
            }
            throw error;
        }

    } catch (error) {
        console.error("Error sending WhatsApp:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
