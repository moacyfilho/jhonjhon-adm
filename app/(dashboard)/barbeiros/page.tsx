"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Scissors,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  Key,
  Lock,
  Clock,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";

interface Barber {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  password?: string | null;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    appointments: number;
  };
}

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [blockFormData, setBlockFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    commissionRate: "50",
    hourlyRate: "0",
    isActive: true,
  });

  const fetchBarbers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/barbers?search=${search}`);
      if (response.ok) {
        const data = await response.json();
        setBarbers(data);
      }
    } catch (error) {
      console.error("Error fetching barbers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBarbers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = () => {
    setSelectedBarber(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      commissionRate: "50",
      hourlyRate: "0",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (barber: Barber) => {
    setSelectedBarber(barber);
    setFormData({
      name: barber.name,
      phone: barber.phone,
      email: barber.email || "",
      commissionRate: String(barber.commissionRate),
      hourlyRate: String((barber as any).hourlyRate || 0),
      isActive: barber.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (barber: Barber) => {
    setSelectedBarber(barber);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedBarber
        ? `/api/barbers/${selectedBarber.id}`
        : "/api/barbers";
      const method = selectedBarber ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchBarbers();
      }
    } catch (error) {
      console.error("Error saving barber:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBarber) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/barbers/${selectedBarber.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchBarbers();
      }
    } catch (error) {
      console.error("Error deleting barber:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPasswordDialog = (barber: Barber) => {
    setSelectedBarber(barber);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleSetPassword = async () => {
    if (!selectedBarber) return;

    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/barbers/${selectedBarber.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        alert("Senha definida com sucesso!");
        setIsPasswordDialogOpen(false);
        setNewPassword("");
        fetchBarbers();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao definir senha");
      }
    } catch (error) {
      console.error("Error setting password:", error);
      alert("Erro ao definir senha");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenBlockDialog = async (barber: Barber) => {
    setSelectedBarber(barber);
    setBlockFormData({
      date: "",
      startTime: "",
      endTime: "",
      reason: "",
    });
    setIsBlockDialogOpen(true);
    
    // Carregar bloqueios existentes
    try {
      const response = await fetch(`/api/schedule-blocks?barberId=${barber.id}`);
      if (response.ok) {
        const data = await response.json();
        setScheduleBlocks(data);
      }
    } catch (error) {
      console.error("Erro ao carregar bloqueios:", error);
    }
  };

  const handleCreateBlock = async () => {
    if (!selectedBarber) return;

    if (!blockFormData.date || !blockFormData.startTime || !blockFormData.endTime) {
      alert("Data, horário inicial e final são obrigatórios");
      return;
    }

    if (blockFormData.startTime >= blockFormData.endTime) {
      alert("Horário final deve ser depois do horário inicial");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/schedule-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberId: selectedBarber.id,
          ...blockFormData,
        }),
      });

      if (response.ok) {
        alert("Bloqueio criado com sucesso!");
        setBlockFormData({
          date: "",
          startTime: "",
          endTime: "",
          reason: "",
        });
        
        // Recarregar bloqueios
        const blocksResponse = await fetch(`/api/schedule-blocks?barberId=${selectedBarber.id}`);
        if (blocksResponse.ok) {
          const data = await blocksResponse.json();
          setScheduleBlocks(data);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao criar bloqueio");
      }
    } catch (error) {
      console.error("Erro ao criar bloqueio:", error);
      alert("Erro ao criar bloqueio");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Deseja remover este bloqueio?")) return;

    try {
      const response = await fetch(`/api/schedule-blocks?id=${blockId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert("Bloqueio removido com sucesso!");
        
        // Recarregar bloqueios
        if (selectedBarber) {
          const blocksResponse = await fetch(`/api/schedule-blocks?barberId=${selectedBarber.id}`);
          if (blocksResponse.ok) {
            const data = await blocksResponse.json();
            setScheduleBlocks(data);
          }
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao remover bloqueio");
      }
    } catch (error) {
      console.error("Erro ao remover bloqueio:", error);
      alert("Erro ao remover bloqueio");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Barbeiros
          </h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de barbeiros
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Barbeiro
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : barbers?.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search
              ? "Nenhum barbeiro encontrado"
              : "Nenhum barbeiro cadastrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers?.map?.((barber) => (
            <div
              key={barber?.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(barber)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleOpenPasswordDialog(barber)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Definir Senha"
                  >
                    <Key className={`w-4 h-4 ${barber?.password ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => handleOpenBlockDialog(barber)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Bloquear Horário"
                  >
                    <Clock className="w-4 h-4 text-amber-500" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(barber)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-foreground">
                  {barber?.name ?? ""}
                </h3>
                {barber?.isActive ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{barber?.phone ?? ""}</span>
                </div>
                {barber?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{barber?.email ?? ""}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="w-4 h-4" />
                  <span>{barber?.commissionRate ?? 0}% de comissão</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{barber?._count?.appointments ?? 0} atendimentos</span>
                </div>
              </div>
            </div>
          )) ?? null}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedBarber ? "Editar Barbeiro" : "Novo Barbeiro"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do barbeiro
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="(11) 99999-9999"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="email@exemplo.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Comissão (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commissionRate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Porcentagem sobre serviços normais
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Valor por Hora (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hourlyRate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor fixo por hora para atendimentos de assinantes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-foreground"
                  >
                    Barbeiro ativo
                  </label>
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedBarber ? "Salvar" : "Criar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent onClose={() => setIsDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o barbeiro{" "}
              <strong>{selectedBarber?.name ?? ""}</strong>? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent onClose={() => setIsPasswordDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gold" />
                Definir Senha de Acesso
              </div>
            </DialogTitle>
            <DialogDescription>
              Configure a senha para <strong>{selectedBarber?.name ?? ""}</strong> acessar o painel do barbeiro.
              {selectedBarber?.password && (
                <span className="block mt-2 text-green-500">
                  ✓ Este barbeiro já possui senha configurada. Você pode alterá-la aqui.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nova Senha *
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={submitting}
              />
            </div>
            
            {selectedBarber?.email ? (
              <div className="text-sm text-muted-foreground">
                <p>📧 Email de acesso: <strong>{selectedBarber.email}</strong></p>
              </div>
            ) : (
              <div className="text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                ⚠️ Este barbeiro não possui email cadastrado. Cadastre um email antes de definir a senha.
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsPasswordDialogOpen(false)}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSetPassword}
              className="px-4 py-2 bg-gold hover:bg-gold/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={submitting || !selectedBarber?.email}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Key className="w-4 h-4" />
              {selectedBarber?.password ? "Alterar Senha" : "Definir Senha"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent onClose={() => setIsBlockDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Bloqueios de Horário - {selectedBarber?.name ?? ""}
              </div>
            </DialogTitle>
            <DialogDescription>
              Bloqueie horários específicos na agenda do barbeiro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Formulário para criar novo bloqueio */}
            <div className="bg-secondary/30 border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">Novo Bloqueio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">Data *</label>
                  <input
                    type="date"
                    value={blockFormData.date}
                    onChange={(e) => setBlockFormData({ ...blockFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">Motivo (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Almoço, Folga"
                    value={blockFormData.reason}
                    onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">Horário Inicial *</label>
                  <input
                    type="time"
                    value={blockFormData.startTime}
                    onChange={(e) => setBlockFormData({ ...blockFormData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm time-input-red"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">Horário Final *</label>
                  <input
                    type="time"
                    value={blockFormData.endTime}
                    onChange={(e) => setBlockFormData({ ...blockFormData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm time-input-red"
                    disabled={submitting}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateBlock}
                className="mt-3 w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Clock className="w-4 h-4" />
                Criar Bloqueio
              </button>
            </div>

            {/* Lista de bloqueios existentes */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Bloqueios Existentes</h3>
              {scheduleBlocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum bloqueio de horário criado
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduleBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {new Date(block.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{block.startTime} - {block.endTime}</span>
                          {block.reason && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{block.reason}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remover bloqueio"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsBlockDialogOpen(false)}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
