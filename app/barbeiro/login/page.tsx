'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function BarberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/barbers/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao fazer login');
        return;
      }

      // Armazenar token no localStorage
      localStorage.setItem('barberToken', data.token);
      localStorage.setItem('barberData', JSON.stringify(data.barber));

      toast.success(`Bem-vindo, ${data.barber.name}!`);
      
      // Redirecionar para o dashboard
      router.push('/barbeiro/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <Card className="w-full max-w-md border-gold/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <Image
                src="/logo.png"
                alt="Jhon Jhon Barbearia"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gold flex items-center justify-center gap-2">
              <Scissors className="w-6 h-6" />
              Área do Barbeiro
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Acesse seu painel personalizado
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-gray-700 focus:border-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-gray-700 focus:border-gold"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gold hover:bg-gold/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>📍 Problemas para acessar?</p>
            <p className="mt-1">Entre em contato com o administrador</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
