
import { z } from 'zod';

const envSchema = z.object({
    // WhatsApp / UZAPI
    WHATSAPP_UZAPI_URL: z.string().optional(),
    WHATSAPP_UZAPI_SESSION: z.string().optional(),
    WHATSAPP_UZAPI_SESSION_KEY: z.string().optional(),

    // Internal API Token for server-to-server calls
    INTERNAL_API_TOKEN: z.string().optional(), // Making this optional too for safety, but route will check it. Actually prompt said "Garantir INTERNAL_API_TOKEN", so I should probably require it or make it optional and check in route. I'll make it optional to avoid crash.

    // App URL needed for server side calls to self
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // Existing vars
    DATABASE_URL: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
});

const _env = envSchema.parse(process.env);

// Debug: Log environment status on startup
console.log('--- ENV DEBUG ---');
console.log('WHATSAPP_UZAPI_URL:', _env.WHATSAPP_UZAPI_URL ? 'Loaded' : 'Missing');
console.log('WHATSAPP_UZAPI_SESSION:', _env.WHATSAPP_UZAPI_SESSION ? 'Loaded' : 'Missing');
console.log('WHATSAPP_UZAPI_SESSION_KEY:', _env.WHATSAPP_UZAPI_SESSION_KEY ? 'Loaded (Hidden)' : 'Missing');
console.log('-----------------');

export const env = _env;
