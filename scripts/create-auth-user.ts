
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const email = 'admin@jhonjhon.com';
    const password = 'admin123';

    console.log(`Signing up ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: 'Administrador'
            }
        }
    });

    if (error) {
        console.error('Error signing up:', error.message);
    } else {
        console.log('Sign up successful. User ID:', data.user?.id);
    }
}

main();
