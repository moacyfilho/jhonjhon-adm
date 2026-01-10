"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Loader2,
  Calendar,
} from "lucide-react";
import { CardGridSkeleton } from "@/components/ui/table-skeleton";
import { useMask } from "@/hooks/use-mask";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
  _count?: {
    appointments: number;
  };
}

export default function ClientsPage() {
  const { maskPhone } = useMask();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clients?search=${search}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Open create dialog
  const handleCreate = () => {
    setSelectedClient(null);
    setFormData({ name: "", phone: "", email: "" });
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
    });
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedClient
        ? `/api/clients/${selectedClient.id}`
        : "/api/clients";
      const method = selectedClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchClients();
      }
    } catch (error) {
      console.error("Error saving client:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete client
  const handleDelete = async () => {
    if (!selectedClient) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchClients();
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Meus <span className="text-gold-500">Clientes</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Gerencie sua base de clientes com excelência.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-white placeholder:text-gray-600"
        />
      </div>

      {/* Clients List */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : clients?.length === 0 ? (
        <EmptyState
          icon={User}
          title={search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          description={search ? "Tente buscar por outro termo ou limpe o filtro." : "Comece a construir sua base de clientes hoje mesmo para gerenciar seus atendimentos."}
          actionLabel={search ? undefined : "Novo Cliente"}
          onAction={search ? undefined : handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients?.map?.((client) => (
            <div
              key={client?.id}
              className="glass-panel p-6 rounded-3xl relative group hover:border-gold-500/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                  <User className="w-8 h-8 text-gold-500" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(client)}
                    className="p-3 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-gold-500 transition-colors">
                    {client?.name ?? 'Cliente Sem Nome'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-gold-500/60 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    <span>{client?._count?.appointments ?? 0} Atendimentos</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium">{client?.phone ?? 'Sem telefone'}</span>
                  </div>
                  {client?.email && (
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium truncate">{client?.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Glow */}
              <div className="absolute -inset-0.5 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity pointer-events-none" />
            </div>
          )) ?? null}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2 ml-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                    placeholder="Nome do cliente"
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2 ml-1">
                    Telefone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: maskPhone(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                    placeholder="(11) 99999-9999"
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2 ml-1">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                    placeholder="email@exemplo.com"
                    disabled={submitting}
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold rounded-xl transition-all shadow-gold disabled:opacity-50 flex items-center gap-2"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedClient ? "Salvar" : "Criar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent onClose={() => setIsDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{selectedClient?.name ?? ''}</strong>? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
