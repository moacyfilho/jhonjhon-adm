
import { z } from 'zod';

const envSchema = z.object({
    // WhatsApp / UZAPI (com defaults hardcoded para garantir funcionamento)
    WHATSAPP_UZAPI_URL: z.string().optional().default('https://jhonjhonbarbearia.uzapi.com.br:3333'),
    WHATSAPP_UZAPI_SESSION: z.string().optional().default('jhonjhonbarbearia'),
    WHATSAPP_UZAPI_SESSION_KEY: z.string().optional().default('ShRZdv'),

    // Internal API Token for server-to-server calls
    INTERNAL_API_TOKEN: z.string().optional().default('ShRZdv'),

    // App URL needed for server side calls to self
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // Existing vars
    DATABASE_URL: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
});

const _env = envSchema.parse(process.env);

export const env = _env;
