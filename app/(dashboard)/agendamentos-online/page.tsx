'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Filter,
  User,
  Phone,
  Mail,
  Scissors,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface OnlineBooking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  scheduledDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  isSubscriber: boolean;
  observations?: string;
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  barber?: {
    id: string;
    name: string;
  };
  client?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface Barber {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-blue-500',
  CANCELLED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
};

export default function AgendamentosOnlinePage() {
  const [bookings, setBookings] = useState<OnlineBooking[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterDate, setFilterDate] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<OnlineBooking | null>(null);

  const [editData, setEditData] = useState({
    status: '',
    barberId: '',
    observations: '',
  });

  useEffect(() => {
    fetchBookings();
    fetchBarbers();
  }, [filterStatus, filterDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('date', filterDate);

      const response = await fetch(`/api/online-bookings?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar agendamentos');
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/barbers');
      if (!response.ok) throw new Error('Erro ao carregar barbeiros');
      const data = await response.json();
      setBarbers(data.filter((b: any) => b.isActive));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar barbeiros');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/online-bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editData.status,
          barberId: editData.barberId || null,
          observations: editData.observations,
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar agendamento');

      toast.success('Agendamento atualizado com sucesso!');
      setEditDialogOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/online-bookings/${selectedBooking.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir agendamento');

      toast.success('Agendamento excluído com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const openViewDialog = (booking: OnlineBooking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const openEditDialog = (booking: OnlineBooking) => {
    setSelectedBooking(booking);
    setEditData({
      status: booking.status,
      barberId: booking.barber?.id || '',
      observations: booking.observations || '',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (booking: OnlineBooking) => {
    setSelectedBooking(booking);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`${statusColors[status]} text-white`}>
        {statusLabels[status]}
      </Badge>
    );
  };

  const getTotalByStatus = (status: string) => {
    return bookings.filter((b) => b.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gold">Agendamentos Online</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os agendamentos realizados pelo site público
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">{getTotalByStatus('PENDING')}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold text-blue-500">{getTotalByStatus('CONFIRMED')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-green-500">{getTotalByStatus('COMPLETED')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p className="text-2xl font-bold text-red-500">{getTotalByStatus('CANCELLED')}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filterStatus || 'all'} 
                onValueChange={(value) => setFilterStatus(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus(undefined);
                  setFilterDate('');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {booking.clientName}
                          {booking.isSubscriber && (
                            <span title="Cliente assinante">
                              <Award className="h-4 w-4 text-gold" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{booking.clientPhone}</TableCell>
                      <TableCell>
                        {booking.service.name}
                        <div className="text-xs text-muted-foreground">
                          R$ {booking.service.price.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{booking.barber?.name || 'Qualquer'}</TableCell>
                      <TableCell>
                        {format(new Date(booking.scheduledDate), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewDialog(booking)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(booking)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Editar status"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(booking)}
                            className="text-red-600 hover:text-red-700"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Ver Detalhes */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </Label>
                  <p className="text-sm font-medium">
                    {selectedBooking.clientName}
                    {selectedBooking.isSubscriber && (
                      <Badge className="ml-2 bg-gold text-white">Assinante</Badge>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <p className="text-sm">{selectedBooking.clientPhone}</p>
                </div>

                {selectedBooking.clientEmail && (
                  <div className="space-y-2 col-span-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-mail
                    </Label>
                    <p className="text-sm">{selectedBooking.clientEmail}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Scissors className="h-4 w-4" />
                    Serviço
                  </Label>
                  <p className="text-sm font-medium">{selectedBooking.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {selectedBooking.service.price.toFixed(2)} • {selectedBooking.service.duration}min
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Barbeiro</Label>
                  <p className="text-sm">{selectedBooking.barber?.name || 'Qualquer profissional'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data/Hora
                  </Label>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedBooking.scheduledDate), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedBooking.status)}</div>
                </div>

                {selectedBooking.observations && (
                  <div className="space-y-2 col-span-2">
                    <Label>Observações</Label>
                    <p className="text-sm text-muted-foreground">{selectedBooking.observations}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Status */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Agendamento</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <p className="text-sm font-medium">{selectedBooking.clientName}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barberId">Barbeiro</Label>
                <Select
                  value={editData.barberId || 'none'}
                  onValueChange={(value) => setEditData({ ...editData, barberId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer profissional</SelectItem>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={editData.observations}
                  onChange={(e) => setEditData({ ...editData, observations: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateStatus} className="bg-gold text-white hover:bg-gold/90">
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
