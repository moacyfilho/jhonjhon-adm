"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Scissors, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Email ou senha inválidos");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("Erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login-bg.png"
          alt="Barbearia Background"
          fill
          className="object-cover opacity-60 scale-110 animate-pulse duration-[10000ms]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 backdrop-blur-[2px]" />
      </div>

      <div className="w-full max-w-md relative z-10 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gold-500/10 rounded-full mb-6 border border-gold-500/20 shadow-gold group">
            <Scissors className="w-12 h-12 text-gold-500 group-hover:rotate-12 transition-transform duration-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-wide">
            Jhon Jhon <span className="text-gold-500">Barbearia</span>
          </h1>
          <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">
            Sistema Administrativo Premium
          </p>
        </div>

        {/* glass-panel Form Container */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <h2 className="text-2xl font-serif font-semibold text-white mb-8 text-center">
            Acesso Restrito
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 ml-1"
              >
                Email Corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 text-white placeholder:text-gray-600 transition-all"
                placeholder="seu@jhonjhon.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 ml-1"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 text-white placeholder:text-gray-600 transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm animate-in shake duration-300 text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-gradient hover:opacity-90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-gold/20 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>
        </div>

        {/* Copyright Footer */}
        <div className="mt-10 text-center text-xs text-gray-500 uppercase tracking-widest space-y-2">
          <p>© {new Date().getFullYear()} Jhon Jhon Barbearis — Todos os direitos reservados</p>
          <div className="h-px w-8 bg-gold-500/30 mx-auto" />
          <p className="text-gold-500/60 lowercase italic">Elevando o padrão do seu visual</p>
        </div>
      </div>
    </div>
  );
}
