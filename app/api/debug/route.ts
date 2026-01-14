import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const results: any = {
        status: 'starting',
        env: {
            asaas_key_exists: !!process.env.ASAAS_API_KEY,
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
            supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing'
        },
        auth: {
            status: 'pending'
        },
        db: {
            // ...
            status: 'pending',
            client_count: 0
        },
        asaas: {
            status: 'pending',
            message: ''
        }
    };

    // 0. Check Auth Config
    try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        results.auth.status = error ? 'error_response' : 'success';
        results.auth.user_found = !!data?.user;
        if (error) results.auth.error_details = error.message;
    } catch (e: any) {
        results.auth.status = 'exception';
        results.auth.exception = e.message;
    }

    // 1. Check DB
    try {
        const count = await prisma.client.count();
        results.db.status = 'connected';
        results.db.client_count = count;
    } catch (e: any) {
        results.db.status = 'failed';
        results.db.error = e.message;
    }

    // 2. Check Asaas Auth
    try {
        const url = `${process.env.ASAAS_API_URL}/customers?limit=1`;
        const response = await fetch(url, {
            headers: {
                'access_token': process.env.ASAAS_API_KEY || '',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            results.asaas.status = 'connected';
            results.asaas.message = `Auth successful. Found ${data.totalCount} customers.`;
        } else {
            results.asaas.status = 'failed';
            results.asaas.status_code = response.status;
            try {
                const err = await response.json();
                results.asaas.error_details = err;
            } catch (e) {
                const text = await response.text();
                results.asaas.error_text = text;
            }
        }
    } catch (e: any) {
        results.asaas.status = 'network_error';
        results.asaas.message = e.message;
    }

    return NextResponse.json(results);
}
