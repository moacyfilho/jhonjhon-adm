
import { z } from 'zod';

const envSchema = z.object({
    // WhatsApp / UZAPI (Com Fallback Hardcoded para Emergência)
    WHATSAPP_UZAPI_URL: z.string().optional().default('https://jhonjhonbarbearia.uzapi.com.br:3333'),
    WHATSAPP_UZAPI_SESSION: z.string().optional().default('jhonjhonbarbearia'),
    WHATSAPP_UZAPI_SESSION_KEY: z.string().optional().default('ShRZdv'),

    // Internal API Token for server-to-server calls
    INTERNAL_API_TOKEN: z.string().optional().default('ShRZdv'),

    // App URL needed for server side calls to self
    NEXT_PUBLIC_APP_URL: z.string().optional().default("https://jhonjhonbarbearia.com.br"),

    // Existing vars
    DATABASE_URL: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
});

let _env: z.infer<typeof envSchema>;

try {
    _env = envSchema.parse(process.env);
} catch (e) {
    console.error('[ENV] ⚠️ Failed to parse environment variables, using defaults:', e);
    _env = {
        WHATSAPP_UZAPI_URL: 'https://jhonjhonbarbearia.uzapi.com.br:3333',
        WHATSAPP_UZAPI_SESSION: 'jhonjhonbarbearia',
        WHATSAPP_UZAPI_SESSION_KEY: 'ShRZdv',
        INTERNAL_API_TOKEN: 'ShRZdv',
        NEXT_PUBLIC_APP_URL: 'https://jhonjhonbarbearia.com.br',
        DATABASE_URL: undefined,
        NEXTAUTH_SECRET: undefined,
        NEXTAUTH_URL: undefined,
    };
}

export const env = _env;
