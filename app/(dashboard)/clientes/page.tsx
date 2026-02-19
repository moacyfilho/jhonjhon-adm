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
  History,
  FileText,
} from "lucide-react";
import { ClientHistoryModal } from "@/components/clients/client-history-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface ClientReportData {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalServices: number;
  totalProducts: number;
  totalGeneral: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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

  // Generate PDF Report
  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await fetch(`/api/reports/all-clients?search=${search}`);

      if (!response.ok) {
        throw new Error("Erro ao buscar dados do relatório");
      }

      const reportData: ClientReportData[] = await response.json();

      if (reportData.length === 0) {
        toast.info("Nenhum cliente encontrado para gerar relatório.");
        return;
      }

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(184, 134, 11); // Gold
      doc.text("Relatório Geral de Clientes", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 28);
      if (search) {
        doc.text(`Filtro: "${search}"`, 14, 34);
      }

      // Calculate totals
      const totalServices = reportData.reduce((acc, c) => acc + c.totalServices, 0);
      const totalProducts = reportData.reduce((acc, c) => acc + c.totalProducts, 0);
      const totalGeneral = reportData.reduce((acc, c) => acc + c.totalGeneral, 0);

      // Table
      autoTable(doc, {
        startY: 40,
        head: [["Cliente", "Telefone", "Total Serviços", "Total Produtos", "Total Geral"]],
        body: reportData.map((client) => [
          client.name,
          client.phone,
          `R$ ${client.totalServices.toFixed(2)}`,
          `R$ ${client.totalProducts.toFixed(2)}`,
          `R$ ${client.totalGeneral.toFixed(2)}`,
        ]),
        foot: [[
          "TOTAL GERAL",
          "",
          `R$ ${totalServices.toFixed(2)}`,
          `R$ ${totalProducts.toFixed(2)}`,
          `R$ ${totalGeneral.toFixed(2)}`
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [184, 134, 11] }, // Gold
        footStyles: { fillColor: [60, 60, 60], fontStyle: "bold" },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" },
        },
      });

      doc.save("relatorio_clientes_financeiro.pdf");
      toast.success("Relatório gerado com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setGeneratingReport(false);
    }
  };

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

  // Open history dialog
  const handleHistoryClick = (client: Client) => {
    setSelectedClient(client);
    setIsHistoryOpen(true);
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
        toast.success(selectedClient ? "Cliente atualizado!" : "Cliente criado!");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Erro ao salvar cliente");
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
        toast.success("Cliente removido com sucesso!");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erro ao excluir cliente");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Clientes
          </h1>
          <p className="text-lg font-semibold text-emerald-500 mb-1">
            Total cadastrado: {clients?.length || 0}
          </p>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-4 py-3 rounded-lg transition-colors border border-border"
          >
            {generatingReport ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            Relatório Geral
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
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

      {/* Clients List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : clients?.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients?.map?.((client) => (
            <div
              key={client?.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(client)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                  <button
                    onClick={() => handleHistoryClick(client)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Ver Histórico"
                  >
                    <History className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-3">
                {client?.name ?? ''}
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{client?.phone ?? ''}</span>
                </div>
                {client?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{client?.email ?? ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{client?._count?.appointments ?? 0} atendimentos</span>
                </div>
              </div>
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

                {/* Phone */}
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

                {/* Email */}
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
              {selectedClient ? (<>Excluir</>) : (<>Excluir</>)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <ClientHistoryModal
        clientId={selectedClient?.id || null}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
