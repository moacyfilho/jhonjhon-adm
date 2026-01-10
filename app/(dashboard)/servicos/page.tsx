"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Briefcase,
  DollarSign,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
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

interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration: number;
  isActive: boolean;
  _count?: {
    appointmentServices: number;
  };
}

export default function ServicesPage() {
  const { maskCurrency } = useMask();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "30",
    isActive: true,
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/services?search=${search}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = () => {
    setSelectedService(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "30",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: String(service.price),
      duration: String(service.duration),
      isActive: service.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedService
        ? `/api/services/${selectedService.id}`
        : "/api/services";
      const method = selectedService ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchServices();
      }
    } catch (error) {
      console.error("Error saving service:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchServices();
      }
    } catch (error) {
      console.error("Error deleting service:", error);
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
            Meus <span className="text-gold-500">Serviços</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Gerencie seu catálogo de serviços.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 bg-gold-gradient hover:scale-105 active:scale-95 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-gold"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Buscar serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-white placeholder:text-gray-600"
        />
      </div>

      {/* Services List */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : services?.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
          description={search ? "Tente buscar por outro termo ou limpe o filtro." : "Crie seu catálogo de serviços. Adicione o seu primeiro serviço para habilitar o agendamento online."}
          actionLabel={search ? undefined : "Novo Serviço"}
          onAction={search ? undefined : handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.map?.((service) => (
            <div
              key={service?.id}
              className="glass-panel p-6 rounded-3xl relative group hover:border-gold-500/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                  <Briefcase className="w-8 h-8 text-gold-500" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(service)}
                    className="p-3 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-gold-500 transition-colors">
                      {service?.name ?? "Serviço Sem Nome"}
                    </h3>
                    {service?.isActive ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {service?.description && (
                    <p className="text-sm text-gray-500 italic line-clamp-2 mt-2">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-white font-bold">R$ {service?.price?.toFixed?.(2) ?? "0.00"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-gray-400 font-medium">{service?.duration ?? 0} min</span>
                  </div>
                </div>
              </div>

              {/* Card Glow */}
              <div className="absolute -inset-0.5 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-3xl blur-xl transition-opacity pointer-events-none" />
            </div>
          )) ?? null}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedService ? "Editar Serviço" : "Novo Serviço"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do serviço
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2 ml-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                    placeholder="Ex: Corte Degradê"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 ml-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium resize-none"
                    rows={3}
                    placeholder="Descreva o serviço..."
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 ml-1">
                      Preço *
                    </label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: maskCurrency(e.target.value) })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                      placeholder="R$ 0,00"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2 ml-1">
                      Duração (min) *
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-white placeholder:text-gray-600 transition-all font-medium"
                      required
                      disabled={submitting}
                    />
                  </div>
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
                    className="text-sm font-bold text-white cursor-pointer"
                  >
                    Serviço ativo
                  </label>
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
                {selectedService ? "Salvar" : "Criar"}
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
              Tem certeza que deseja excluir o serviço{" "}
              <strong>{selectedService?.name ?? ""}</strong>? Esta ação não pode
              ser desfeita.
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
    </div>
  );
}
