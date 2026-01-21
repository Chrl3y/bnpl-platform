import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

interface ReconciliationSummary {
  total_reconciliations: number;
  matched: number;
  variance: number;
  missing: number;
  total_variance_amount: number;
  by_type: Record<string, { total: number; matched: number; variance_amount: number }>;
}

interface ReconciliationRecord {
  id: string;
  type: 'PAYROLL' | 'MIFOS' | 'PESAPAL';
  date: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  status: 'MATCHED' | 'VARIANCE' | 'MISSING';
  details: any;
  created_at: string;
}

export function ReconciliationView() {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<ReconciliationRecord[]>([]);
  const [mifosRecords, setMifosRecords] = useState<ReconciliationRecord[]>([]);
  const [pesapalRecords, setPesapalRecords] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDaily, setRunningDaily] = useState(false);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/reconciliation/summary`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching reconciliation summary:', error);
    }
  };

  const fetchRecords = async (type: 'PAYROLL' | 'MIFOS' | 'PESAPAL') => {
    try {
      const response = await fetch(`${API_BASE}/api/reconciliation/${type.toLowerCase()}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      
      if (type === 'PAYROLL') setPayrollRecords(data.records || []);
      else if (type === 'MIFOS') setMifosRecords(data.records || []);
      else if (type === 'PESAPAL') setPesapalRecords(data.records || []);
    } catch (error) {
      console.error(`Error fetching ${type} reconciliations:`, error);
    }
  };

  const runDailyReconciliation = async () => {
    setRunningDaily(true);
    try {
      const response = await fetch(`${API_BASE}/api/reconciliation/run-daily`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      toast.success('Daily reconciliation completed successfully');
      await fetchAll();
    } catch (error) {
      console.error('Error running daily reconciliation:', error);
      toast.error('Failed to run daily reconciliation');
    } finally {
      setRunningDaily(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchSummary(),
      fetchRecords('PAYROLL'),
      fetchRecords('MIFOS'),
      fetchRecords('PESAPAL'),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const STATUS_COLORS = {
    MATCHED: 'bg-green-100 text-green-800',
    VARIANCE: 'bg-orange-100 text-orange-800',
    MISSING: 'bg-red-100 text-red-800',
  };

  const RecordTable = ({ records, type }: { records: ReconciliationRecord[]; type: string }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Expected Amount</TableHead>
          <TableHead>Actual Amount</TableHead>
          <TableHead>Variance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
              No {type} reconciliation records found
            </TableCell>
          </TableRow>
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.date}</TableCell>
              <TableCell>KES {record.expected_amount.toLocaleString()}</TableCell>
              <TableCell>KES {record.actual_amount.toLocaleString()}</TableCell>
              <TableCell className={record.variance !== 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                KES {Math.abs(record.variance).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[record.status]}>
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(record.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reconciliation Center</h2>
          <p className="text-gray-500 mt-1">Monitor and manage all system reconciliations</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={runDailyReconciliation} disabled={runningDaily} variant="default">
            <PlayCircle className={`w-4 h-4 mr-2 ${runningDaily ? 'animate-spin' : ''}`} />
            Run Daily Recon
          </Button>
          <Button onClick={fetchAll} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reconciliations</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_reconciliations || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.matched || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {summary && summary.total_reconciliations > 0 
                ? ((summary.matched / summary.total_reconciliations) * 100).toFixed(1) 
                : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary?.variance || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance Amount</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              KES {(summary?.total_variance_amount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Discrepancy</p>
          </CardContent>
        </Card>
      </div>

      {/* By Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['PAYROLL', 'MIFOS', 'PESAPAL'].map((type) => {
          const typeData = summary?.by_type[type];
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="text-lg">{type} Reconciliation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total:</span>
                  <span className="font-semibold">{typeData?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Matched:</span>
                  <span className="font-semibold text-green-600">{typeData?.matched || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Variance Amount:</span>
                  <span className="font-semibold text-red-600">
                    KES {(typeData?.variance_amount || 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Records */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Records</CardTitle>
          <CardDescription>Detailed view of all reconciliation activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payroll">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="mifos">Mifos X</TabsTrigger>
              <TabsTrigger value="pesapal">Pesapal</TabsTrigger>
            </TabsList>
            <TabsContent value="payroll" className="mt-4">
              <RecordTable records={payrollRecords} type="payroll" />
            </TabsContent>
            <TabsContent value="mifos" className="mt-4">
              <RecordTable records={mifosRecords} type="Mifos X" />
            </TabsContent>
            <TabsContent value="pesapal" className="mt-4">
              <RecordTable records={pesapalRecords} type="Pesapal" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
