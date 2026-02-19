'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

interface FinancialReport {
  summary: {
    totalPayable: number;
    totalReceivable: number;
    totalPayablePaid: number;
    totalReceivablePaid: number;
    totalPayablePending: number;
    totalReceivablePending: number;
    balance: number;
    projectedBalance: number;
  };
  payableByCategory: Record<string, number>;
  receivableByCategory: Record<string, number>;
  cashFlow: Array<{
    date: string;
    receivable: number;
    payable: number;
    balance: number;
  }>;
  payableStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
  receivableStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

const categoryLabels: Record<string, string> = {
  // Contas a Pagar
  RENT: 'Aluguel',
  UTILITIES: 'Utilidades',
  SALARIES: 'Salários',
  SUPPLIES: 'Materiais',
  MAINTENANCE: 'Manutenção',
  TAXES: 'Impostos',
  SERVICES: 'Serviços',
  OTHER_EXPENSE: 'Outras Despesas',
  // Contas a Receber
  SERVICES_INCOME: 'Receita de Serviços',
  PRODUCTS_INCOME: 'Receita de Produtos',
  SUBSCRIPTION: 'Assinatura',
  OTHER_INCOME: 'Outras Receitas',
};

const COLORS = {
  primary: '#D4AF37', // gold
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
  gray: '#6b7280',
};

export default function RelatoriosPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/financial?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Dados do relatório:', data);
        setReport(data);
      } else {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        toast.error('Erro ao carregar relatório');
      }
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Carregando relatórios...</div>
      </div>
    );
  }

  // Preparar dados para gráficos
  const payableCategoryData = Object.entries(report.payableByCategory).map(
    ([category, value]) => ({
      name: categoryLabels[category] || category,
      value: value,
    })
  );

  const receivableCategoryData = Object.entries(report.receivableByCategory).map(
    ([category, value]) => ({
      name: categoryLabels[category] || category,
      value: value,
    })
  );

  const payableStatusData = [
    { name: 'Pagas', value: report.payableStatus.paid, fill: COLORS.green },
    { name: 'Pendentes', value: report.payableStatus.pending, fill: COLORS.yellow },
    { name: 'Vencidas', value: report.payableStatus.overdue, fill: COLORS.red },
  ].filter(item => item.value > 0);

  const receivableStatusData = [
    { name: 'Recebidas', value: report.receivableStatus.paid, fill: COLORS.green },
    { name: 'Pendentes', value: report.receivableStatus.pending, fill: COLORS.yellow },
    { name: 'Vencidas', value: report.receivableStatus.overdue, fill: COLORS.red },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gold">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">
            Análise completa de contas a pagar e receber
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link href="/service-metrics">
              <BarChart2 className="w-4 h-4 mr-2" />
              Desempenho de Serviços
            </Link>
          </Button>

          <div className="w-48">
            <Label>Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {report.summary.totalPayable.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendente: R$ {report.summary.totalPayablePending.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {report.summary.totalReceivable.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendente: R$ {report.summary.totalReceivablePending.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Realizado</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${report.summary.balance >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
            >
              R$ {report.summary.balance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagos vs Recebidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Projetado</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${report.summary.projectedBalance >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
            >
              R$ {report.summary.projectedBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Incluindo pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa (Últimos 7 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined) => value !== undefined ? `R$ ${value.toFixed(2)}` : ''}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="receivable"
                stroke={COLORS.green}
                strokeWidth={2}
                name="Recebimentos"
              />
              <Line
                type="monotone"
                dataKey="payable"
                stroke={COLORS.red}
                strokeWidth={2}
                name="Pagamentos"
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={COLORS.primary}
                strokeWidth={2}
                name="Saldo"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos de Categoria */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {payableCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payableCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => value !== undefined ? `R$ ${value.toFixed(2)}` : ''}
                  />
                  <Bar dataKey="value" fill={COLORS.red} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {receivableCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={receivableCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => value !== undefined ? `R$ ${value.toFixed(2)}` : ''}
                  />
                  <Bar dataKey="value" fill={COLORS.green} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma receita no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status das Contas a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            {payableStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={payableStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {payableStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta a pagar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            {receivableStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={receivableStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {receivableStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta a receber
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}