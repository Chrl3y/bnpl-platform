import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Building2, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

export function EmployerView() {
  const [employerId, setEmployerId] = useState('EMP-001');
  const [employeeData, setEmployeeData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBulkUpload = async () => {
    if (!employeeData.trim()) {
      toast.error('Please enter employee data');
      return;
    }

    setUploading(true);
    try {
      // Parse CSV-like data
      const lines = employeeData.trim().split('\n');
      const employees = lines.slice(1).map(line => {
        const [payroll_id, national_id, full_name, phone, net_salary] = line.split(',').map(s => s.trim());
        return {
          payroll_employee_id: payroll_id,
          national_id,
          full_name,
          phone_number: phone,
          net_salary: parseFloat(net_salary),
        };
      });

      const response = await fetch(`${API_BASE}/api/employer/bulk-onboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employer_id: employerId, employees }),
      });

      const data = await response.json();
      setResult(data);
      toast.success(`Onboarded ${data.successful} employees successfully`);
    } catch (error) {
      console.error('Error bulk uploading:', error);
      toast.error('Failed to upload employees');
    } finally {
      setUploading(false);
    }
  };

  const sampleData = `payroll_id,national_id,full_name,phone_number,net_salary
EMP001,12345678,John Doe,+254712345678,50000
EMP002,87654321,Jane Smith,+254723456789,65000
EMP003,11223344,Bob Johnson,+254734567890,45000`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Employer Management</h2>
        <p className="text-gray-500 mt-1">Bulk onboard employees and manage deductions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Bulk Employee Onboarding
            </CardTitle>
            <CardDescription>Upload employee data to create BNPL policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="employer-id">Employer ID</Label>
              <Input
                id="employer-id"
                value={employerId}
                onChange={(e) => setEmployerId(e.target.value)}
                placeholder="EMP-001"
              />
            </div>

            <div>
              <Label htmlFor="employee-data">Employee Data (CSV Format)</Label>
              <Textarea
                id="employee-data"
                value={employeeData}
                onChange={(e) => setEmployeeData(e.target.value)}
                placeholder={sampleData}
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: payroll_id,national_id,full_name,phone_number,net_salary
              </p>
            </div>

            <Button onClick={handleBulkUpload} disabled={uploading} className="w-full">
              <Upload className={`w-4 h-4 mr-2 ${uploading ? 'animate-bounce' : ''}`} />
              {uploading ? 'Uploading...' : 'Upload Employees'}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Upload Complete</span>
                </div>
                <div className="text-sm space-y-1">
                  <div>Total Employees: {result.total_employees}</div>
                  <div className="text-green-700">Successful: {result.successful}</div>
                  <div className="text-red-700">Failed: {result.failed}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Onboarding Process
            </CardTitle>
            <CardDescription>How the employer integration works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-semibold text-blue-900 mb-1">Step 1: Employee Registration</div>
                <p className="text-blue-700">
                  Employer pre-registers all eligible employees with salary information
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="font-semibold text-purple-900 mb-1">Step 2: Policy Issuance</div>
                <p className="text-purple-700">
                  System generates unique policy numbers and calculates BNPL limits per tenor
                </p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-semibold text-green-900 mb-1">Step 3: Affordability Calculation</div>
                <p className="text-green-700">
                  Limits calculated using 33% debt service ratio: Max monthly payment = Salary × 0.33
                </p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="font-semibold text-orange-900 mb-1">Step 4: Deduction Instructions</div>
                <p className="text-orange-700">
                  Monthly deductions sent to employer for payroll processing
                </p>
              </div>

              <div className="p-3 bg-cyan-50 rounded-lg">
                <div className="font-semibold text-cyan-900 mb-1">Step 5: Remittance</div>
                <p className="text-cyan-700">
                  Employer remits deducted amounts which are posted to Mifos X
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Business Rules</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Minimum net salary: KES 15,000</li>
                <li>Maximum debt service ratio: 33%</li>
                <li>Pricing: 12% per month (7% interest + 2% ops + 3% collection)</li>
                <li>Tenors: 1, 2, or 3 months only</li>
                <li>Repayment: Salary deduction at source only</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
