
# 🚀 Instruções de Deploy no Netlify

Siga estes passos exatos para colocar o Jhon Jhon Admin no ar:

## 1. Conectar ao Netlify
1. Acesse **[app.netlify.com](https://app.netlify.com)** e faça login.
2. Clique em **"Add new site"** > **"Import from existing project"**.
3. Escolha **GitHub**.
4. Autorize o Netlify a acessar seu GitHub (se pedir).
5. Pesquise e selecione o repositório: **`jhonjhon-adm`**.

## 2. Configurar o Build
Na tela de configuração ("Site settings"):
- **Build command:** `npm run build` (Já deve estar automático)
- **Publish directory:** `.next` (Já deve estar automático)

## 3. Variáveis de Ambiente (MUITO IMPORTANTE) ⚠️
Você precisa cadastrar as senhas do sistema.
Clique em **"Add folder"** ou vá na seção **"Environment variables"** e adicione estas 3 chaves exatas:

| Key (Nome) | Value (Valor) |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tmhokhxuavrglpnuorrg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9raHh1YXZyZ2xwbnVvcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDI1MTYsImV4cCI6MjA4MzQ3ODUxNn0.8ku7FqoszTVqdF6YE8GXsNocT4Xf5ofThr1hlu8I_Jo` |
| `DATABASE_URL` | `postgres://postgres.tmhokhxuavrglpnuorrg:H5u%2AVXT%215R-%23etA@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true` |

*(Note: A `DATABASE_URL` já está configurada com a conexão especial IPv4 para funcionar na nuvem sem erros).*

## 4. Finalizar
Clique em **"Deploy jhonjhon-adm"**.

O processo pode levar uns 2-3 minutos. Assim que terminar, você receberá um link (ex: `jhonjhon-adm.netlify.app`).
