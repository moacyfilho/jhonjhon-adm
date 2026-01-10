'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Scissors, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  LogOut, 
  Clock,
  User,
  Phone,
  Lock,
  Unlock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

interface BarberData {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
}

interface Stats {
  currentMonth: {
    appointments: number;
    commissions: number;
    workedHours: number;
    workedHoursSubscription: number;
  };
  lastMonth: {
    appointments: number;
  };
  commissions: {
    paid: number;
    pending: number;
    total: number;
  };
  upcomingAppointments: any[];
}

interface ScheduleBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  appointment: {
    date: string;
    totalAmount: number;
    client: {
      name: string;
      phone: string;
    };
    services: Array<{
      service: {
        name: string;
      };
    }>;
  };
}

export default function BarberDashboard() {
  const router = useRouter();
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticação
    const token = localStorage.getItem('barberToken');
    const data = localStorage.getItem('barberData');

    if (!token || !data) {
      router.push('/barbeiro/login');
      return;
    }

    setBarberData(JSON.parse(data));
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    setIsLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Buscar estatísticas
      const statsResponse = await fetch('/api/barbers/stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Buscar comissões
      const commissionsResponse = await fetch('/api/barbers/commissions', { headers });
      if (commissionsResponse.ok) {
        const commissionsData = await commissionsResponse.json();
        setCommissions(commissionsData);
      }

      // Buscar bloqueios de horário
      const blocksResponse = await fetch('/api/barbers/schedule-blocks', { headers });
      if (blocksResponse.ok) {
        const blocksData = await blocksResponse.json();
        setScheduleBlocks(blocksData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('barberToken');
    localStorage.removeItem('barberData');
    toast.success('Até logo!');
    router.push('/barbeiro/login');
  };

  const handleCreateBlock = async () => {
    if (!blockDate || !blockStartTime || !blockEndTime) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const token = localStorage.getItem('barberToken');
    if (!token) return;

    try {
      const response = await fetch('/api/barbers/schedule-blocks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: blockDate,
          startTime: blockStartTime,
          endTime: blockEndTime,
          reason: blockReason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao criar bloqueio');
        return;
      }

      toast.success('Horário bloqueado com sucesso!');
      setIsBlockDialogOpen(false);
      setBlockDate('');
      setBlockStartTime('');
      setBlockEndTime('');
      setBlockReason('');
      fetchData(token);
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error);
      toast.error('Erro ao criar bloqueio');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const token = localStorage.getItem('barberToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/barbers/schedule-blocks?id=${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Erro ao remover bloqueio');
        return;
      }

      toast.success('Bloqueio removido com sucesso!');
      fetchData(token);
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      toast.error('Erro ao remover bloqueio');
    }
  };

  if (isLoading || !barberData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-black/40 backdrop-blur-sm border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gold flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  {barberData.name}
                </h1>
                <p className="text-sm text-gray-400">{barberData.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cards de Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-gold/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Atendimentos (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-gold">
                    {stats.currentMonth.appointments}
                  </div>
                  <Calendar className="w-8 h-8 text-gold/60" />
                </div>
                {stats.lastMonth.appointments > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Mês passado: {stats.lastMonth.appointments}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Comissões (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-500">
                    R$ {stats.currentMonth.commissions.toFixed(2)}
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500/60" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Taxa: {barberData.commissionRate}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-gold/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  A Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-blue-500">
                    R$ {stats.commissions.pending.toFixed(2)}
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500/60" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Pendentes
                </p>
              </CardContent>
            </Card>

            <Card className="border-gold/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Já Recebido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-gold">
                    R$ {stats.commissions.paid.toFixed(2)}
                  </div>
                  <DollarSign className="w-8 h-8 text-gold/60" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Total pago
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Horas Trabalhadas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Horas Trabalhadas (Normais)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-amber-500">
                    {stats.currentMonth.workedHours.toFixed(2)}h
                  </div>
                  <Clock className="w-8 h-8 text-amber-500/60" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Atendimentos regulares neste mês
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Horas Trabalhadas (Assinantes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-purple-500">
                    {stats.currentMonth.workedHoursSubscription.toFixed(2)}h
                  </div>
                  <Clock className="w-8 h-8 text-purple-500/60" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Atendimentos de assinantes neste mês
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-black/40">
            <TabsTrigger value="schedule">Próximos Agendamentos</TabsTrigger>
            <TabsTrigger value="commissions">Minhas Comissões</TabsTrigger>
            <TabsTrigger value="blocks">Bloqueios de Horário</TabsTrigger>
          </TabsList>

          {/* Próximos Agendamentos */}
          <TabsContent value="schedule">
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  Próximos Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && stats.upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {stats.upcomingAppointments.map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="border border-gray-700 rounded-lg p-4 hover:border-gold/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-white">
                                {appointment.client.name}
                              </span>
                              <Badge 
                                variant={appointment.status === 'SCHEDULED' ? 'default' : 'outline'}
                                className={appointment.status === 'SCHEDULED' ? 'bg-blue-500' : ''}
                              >
                                {appointment.status === 'SCHEDULED' ? 'Agendado' : 'Completo'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Phone className="w-3 h-3" />
                              {appointment.client.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(appointment.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {appointment.services.map((svc: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {svc.service.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gold">
                              R$ {appointment.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">
                    Nenhum agendamento próximo
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comissões */}
          <TabsContent value="commissions">
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold" />
                  Histórico de Comissões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviços</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.length > 0 ? (
                      commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {format(new Date(commission.appointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{commission.appointment.client.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {commission.appointment.services.map((svc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {svc.service.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            R$ {commission.appointment.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-gold">
                            R$ {commission.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={commission.status === 'PAID' ? 'default' : 'secondary'}
                              className={commission.status === 'PAID' ? 'bg-green-500' : 'bg-yellow-500'}
                            >
                              {commission.status === 'PAID' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400">
                          Nenhuma comissão registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bloqueios de Horário */}
          <TabsContent value="blocks">
            <Card className="border-gold/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gold" />
                    Bloqueios de Horário
                  </CardTitle>
                  <Button 
                    className="bg-gold hover:bg-gold/90 text-white"
                    onClick={() => setIsBlockDialogOpen(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Bloquear Horário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                  <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bloquear Horário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="blockDate">Data *</Label>
                          <Input
                            id="blockDate"
                            type="date"
                            value={blockDate}
                            onChange={(e) => setBlockDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="blockStartTime">Horário Início *</Label>
                            <Input
                              id="blockStartTime"
                              type="time"
                              value={blockStartTime}
                              onChange={(e) => setBlockStartTime(e.target.value)}
                              className="time-input-red"
                            />
                          </div>
                          <div>
                            <Label htmlFor="blockEndTime">Horário Fim *</Label>
                            <Input
                              id="blockEndTime"
                              type="time"
                              value={blockEndTime}
                              onChange={(e) => setBlockEndTime(e.target.value)}
                              className="time-input-red"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="blockReason">Motivo (opcional)</Label>
                          <Textarea
                            id="blockReason"
                            placeholder="Ex: Almoço, Folga, Compromisso pessoal..."
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleCreateBlock}
                          className="w-full bg-gold hover:bg-gold/90 text-white"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Criar Bloqueio
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                {scheduleBlocks.length > 0 ? (
                  <div className="space-y-3">
                    {scheduleBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="border border-gray-700 rounded-lg p-4 hover:border-red-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-red-500" />
                              <span className="font-medium text-white">
                                {format(new Date(block.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">
                              {block.startTime} - {block.endTime}
                            </p>
                            {block.reason && (
                              <p className="text-sm text-gray-500 italic">
                                {block.reason}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">
                    Nenhum bloqueio de horário configurado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}