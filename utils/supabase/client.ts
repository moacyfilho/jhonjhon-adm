
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        'https://tmhokhxuavrglpnuorrg.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9raHh1YXZyZ2xwbnVvcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDI1MTYsImV4cCI6MjA4MzQ3ODUxNn0.8ku7FqoszTVqdF6YE8GXsNocT4Xf5ofThr1hlu8I_Jo'
    )
}
