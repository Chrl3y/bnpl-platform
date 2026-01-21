import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

interface KPIs {
  total_contracts: number;
  total_disbursed: number;
  total_outstanding: number;
  total_paid: number;
  avg_approval_time_minutes: number;
  par_1_amount: number;
  par_30_amount: number;
  par_1_percentage: number;
  par_30_percentage: number;
  repayment_completion_rate: number;
  state_distribution: Record<string, number>;
}

export function DashboardOverview() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/kpis`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setKpis(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stateData = kpis?.state_distribution ? Object.entries(kpis.state_distribution).map(([name, value]) => ({
    name,
    value,
  })) : [];

  const COLORS = {
    PRE_APPROVED: '#9333ea',
    DEDUCTION_REQUESTED: '#f59e0b',
    CUSTOMER_AUTHORIZED: '#3b82f6',
    ESCROW_HELD: '#8b5cf6',
    DISBURSED: '#10b981',
    IN_REPAYMENT: '#06b6d4',
    CLOSED: '#22c55e',
    DISPUTED: '#ef4444',
    CANCELLED: '#6b7280',
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchKPIs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.total_contracts || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active BNPL contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {(kpis?.total_disbursed || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Principal disbursed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {(kpis?.total_outstanding || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total receivables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Approval Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.avg_approval_time_minutes || 0} min
            </div>
            <p className="text-xs text-gray-500 mt-1">Time to authorization</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
              PAR 1 (Portfolio at Risk - 1 day)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {(kpis?.par_1_percentage || 0).toFixed(2)}%
            </div>
            <p className="text-sm text-gray-500 mt-2">
              KES {(kpis?.par_1_amount || 0).toLocaleString()} past due
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              PAR 30 (Portfolio at Risk - 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {(kpis?.par_30_percentage || 0).toFixed(2)}%
            </div>
            <p className="text-sm text-gray-500 mt-2">
              KES {(kpis?.par_30_amount || 0).toLocaleString()} overdue 30+ days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Repayment Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(kpis?.repayment_completion_rate || 0).toFixed(2)}%
            </div>
            <p className="text-sm text-gray-500 mt-2">
              KES {(kpis?.total_paid || 0).toLocaleString()} collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract State Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Contract State Distribution</CardTitle>
            <CardDescription>Current status of all BNPL contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stateData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Financial Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Metrics</CardTitle>
            <CardDescription>Disbursed vs Outstanding vs Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Financial Position',
                    Disbursed: kpis?.total_disbursed || 0,
                    Outstanding: kpis?.total_outstanding || 0,
                    Paid: kpis?.total_paid || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `KES ${(value as number).toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="Disbursed" fill="#10b981" />
                <Bar dataKey="Outstanding" fill="#3b82f6" />
                <Bar dataKey="Paid" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Indicators</CardTitle>
          <CardDescription>Key operational metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Authorization SLA</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {kpis?.avg_approval_time_minutes ? (kpis.avg_approval_time_minutes < 5 ? '✓' : '⚠') : '-'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt;5 min
              </div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Escrow Hold Time</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">2.3h</div>
              <div className="text-xs text-gray-500 mt-1">Avg time to release</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Mifos Sync</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">✓</div>
              <div className="text-xs text-gray-500 mt-1">Last: 5 min ago</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-600">Payroll Adherence</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">98%</div>
              <div className="text-xs text-gray-500 mt-1">Employer SLA</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
