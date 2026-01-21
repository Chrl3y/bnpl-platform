import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Search, Eye, RefreshCw, FileText } from 'lucide-react';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

interface Contract {
  id: string;
  policy_number: string;
  customer_id: string;
  merchant_id: string;
  order_id: string;
  principal_amount: number;
  tenor_months: number;
  total_payable: number;
  installment_amount: number;
  state: string;
  mifos_loan_id: string | null;
  created_at: string;
  authorized_at: string | null;
  disbursed_at: string | null;
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
}

const STATE_COLORS: Record<string, string> = {
  PRE_APPROVED: 'bg-purple-100 text-purple-800',
  DEDUCTION_REQUESTED: 'bg-orange-100 text-orange-800',
  CUSTOMER_AUTHORIZED: 'bg-blue-100 text-blue-800',
  ESCROW_HELD: 'bg-indigo-100 text-indigo-800',
  DISBURSED: 'bg-green-100 text-green-800',
  IN_REPAYMENT: 'bg-cyan-100 text-cyan-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  DISPUTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export function ContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const url = stateFilter !== 'ALL' 
        ? `${API_BASE}/api/contracts?state=${stateFilter}`
        : `${API_BASE}/api/contracts`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setContracts(data.contracts || []);
      setFilteredContracts(data.contracts || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [stateFilter]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = contracts.filter(c => 
        c.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.order_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContracts(filtered);
    } else {
      setFilteredContracts(contracts);
    }
  }, [searchTerm, contracts]);

  const viewContractDetails = async (contract: Contract) => {
    setSelectedContract(contract);
    
    // Fetch installments
    try {
      const response = await fetch(`${API_BASE}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      // For now, we'll need to implement a separate endpoint for installments
      // This is a placeholder
      setInstallments([]);
    } catch (error) {
      console.error('Error fetching installments:', error);
    }

    // Fetch audit logs
    try {
      const response = await fetch(`${API_BASE}/api/audit-logs/contract/${contract.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Contracts Management</h2>
          <p className="text-gray-500 mt-1">View and manage all BNPL contracts</p>
        </div>
        <Button onClick={fetchContracts} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by policy number, contract ID, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All States</SelectItem>
                <SelectItem value="PRE_APPROVED">Pre-Approved</SelectItem>
                <SelectItem value="CUSTOMER_AUTHORIZED">Authorized</SelectItem>
                <SelectItem value="ESCROW_HELD">Escrow Held</SelectItem>
                <SelectItem value="DISBURSED">Disbursed</SelectItem>
                <SelectItem value="IN_REPAYMENT">In Repayment</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="DISPUTED">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts ({filteredContracts.length})</CardTitle>
          <CardDescription>All BNPL contracts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Policy Number</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Tenor</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Mifos Loan ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No contracts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono text-xs">
                        {contract.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {contract.policy_number}
                      </TableCell>
                      <TableCell>UGX {contract.principal_amount.toLocaleString()}</TableCell>
                      <TableCell>{contract.tenor_months} months</TableCell>
                      <TableCell>UGX {contract.total_payable.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={STATE_COLORS[contract.state]}>
                          {contract.state.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {contract.mifos_loan_id ? contract.mifos_loan_id.substring(0, 12) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewContractDetails(contract)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Contract Details</DialogTitle>
                              <DialogDescription>
                                Contract ID: {selectedContract?.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedContract && (
                              <div className="space-y-6">
                                {/* Contract Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><span className="text-gray-500">Policy Number:</span> {selectedContract.policy_number}</div>
                                      <div><span className="text-gray-500">Order ID:</span> {selectedContract.order_id}</div>
                                      <div><span className="text-gray-500">Principal:</span> UGX {selectedContract.principal_amount.toLocaleString()}</div>
                                      <div><span className="text-gray-500">Total Payable:</span> UGX {selectedContract.total_payable.toLocaleString()}</div>
                                      <div><span className="text-gray-500">Tenor:</span> {selectedContract.tenor_months} months</div>
                                      <div><span className="text-gray-500">Installment:</span> UGX {selectedContract.installment_amount.toLocaleString()}/month</div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Status & Integration</h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-500">State:</span>{' '}
                                        <Badge className={STATE_COLORS[selectedContract.state]}>
                                          {selectedContract.state.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                      <div><span className="text-gray-500">Mifos Loan ID:</span> {selectedContract.mifos_loan_id || 'Not created'}</div>
                                      <div><span className="text-gray-500">Created:</span> {new Date(selectedContract.created_at).toLocaleString()}</div>
                                      {selectedContract.authorized_at && (
                                        <div><span className="text-gray-500">Authorized:</span> {new Date(selectedContract.authorized_at).toLocaleString()}</div>
                                      )}
                                      {selectedContract.disbursed_at && (
                                        <div><span className="text-gray-500">Disbursed:</span> {new Date(selectedContract.disbursed_at).toLocaleString()}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Audit Trail */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Audit Trail
                                  </h4>
                                  <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                                    {auditLogs.length === 0 ? (
                                      <div className="text-sm text-gray-500">No audit logs available</div>
                                    ) : (
                                      <div className="space-y-2">
                                        {auditLogs.map((log, idx) => (
                                          <div key={idx} className="text-xs border-b border-gray-200 pb-2">
                                            <div className="font-medium">{log.action}</div>
                                            <div className="text-gray-500">
                                              {new Date(log.timestamp).toLocaleString()} by {log.actor}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
