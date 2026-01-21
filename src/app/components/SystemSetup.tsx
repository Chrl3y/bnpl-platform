import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Settings, Key, Building, Store, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

export function SystemSetup() {
  const [policyNumber, setPolicyNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  const handleSetPIN = async () => {
    if (!policyNumber || !phoneNumber || !pin) {
      toast.error('Please fill all fields');
      return;
    }

    setSettingPin(true);
    try {
      const response = await fetch(`${API_BASE}/api/customer/set-pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policy_number: policyNumber, phone_number: phoneNumber, pin }),
      });

      const data = await response.json();
      if (response.ok) {
        setPinSet(true);
        toast.success('PIN set successfully');
      } else {
        toast.error(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast.error('Failed to set PIN');
    } finally {
      setSettingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">System Setup</h2>
        <p className="text-gray-500 mt-1">Configure and initialize the BNPL platform</p>
      </div>

      <Tabs defaultValue="customer">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customer">Customer PIN</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Set Customer Authorization PIN
              </CardTitle>
              <CardDescription>
                Configure PIN for USSD/SMS authorization (required before creating orders)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="setup-policy">Policy Number</Label>
                <Input
                  id="setup-policy"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="POL-EMP-..."
                />
              </div>

              <div>
                <Label htmlFor="setup-phone">Phone Number</Label>
                <Input
                  id="setup-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254712345678"
                />
              </div>

              <div>
                <Label htmlFor="setup-pin">4-Digit PIN</Label>
                <Input
                  id="setup-pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              <Button onClick={handleSetPIN} disabled={settingPin} className="w-full">
                <Key className={`w-4 h-4 mr-2 ${settingPin ? 'animate-pulse' : ''}`} />
                {settingPin ? 'Setting PIN...' : 'Set PIN'}
              </Button>

              {pinSet && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-900 font-semibold">PIN configured successfully</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <div className="font-semibold">Onboard Employees</div>
                  <p className="text-gray-600">Go to Employers tab → Upload employee CSV with salary data</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <div className="font-semibold">Set Customer PINs</div>
                  <p className="text-gray-600">Use this tab to configure authorization PINs for employees</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <div className="font-semibold">Simulate Purchase</div>
                  <p className="text-gray-600">Go to Merchant Simulator → Test the complete BNPL flow</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <div>
                  <div className="font-semibold">Monitor Operations</div>
                  <p className="text-gray-600">Dashboard → View KPIs, contracts, and reconciliation status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Architecture</CardTitle>
              <CardDescription>Production-ready BNPL platform components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Core Services
                  </h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Policy Service (Employee registration)</li>
                    <li>• Affordability Engine (Limit calculation)</li>
                    <li>• Contract Service (Lifecycle management)</li>
                    <li>• State Machine (Strict transitions)</li>
                    <li>• Audit Service (Immutable logs)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
                    <Store className="w-4 h-4 mr-2" />
                    Integration Services
                  </h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Mifos X (Loan management)</li>
                    <li>• Pesapal (Escrow payments)</li>
                    <li>• USSD/SMS (Customer auth)</li>
                    <li>• Employer APIs (Payroll deduction)</li>
                    <li>• Merchant APIs (Checkout)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">State Machine</h4>
                  <div className="text-xs space-y-1 text-gray-700 font-mono">
                    <div>PRE_APPROVED →</div>
                    <div>DEDUCTION_REQUESTED →</div>
                    <div>CUSTOMER_AUTHORIZED →</div>
                    <div>ESCROW_HELD →</div>
                    <div>DISBURSED →</div>
                    <div>IN_REPAYMENT →</div>
                    <div>CLOSED</div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">Reconciliation</h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Payroll deduction matching</li>
                    <li>• BNPL ↔ Mifos X ledger sync</li>
                    <li>• Pesapal settlement verification</li>
                    <li>• Daily automated jobs</li>
                    <li>• Variance alerts</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Key Differentiators</h4>
                <ul className="text-sm space-y-1 text-blue-800">
                  <li>✓ <strong>Policy-Based:</strong> No mobile app required, policy number drives everything</li>
                  <li>✓ <strong>Salary-Backed:</strong> Only salaried employees, payroll deduction at source</li>
                  <li>✓ <strong>Escrow Protection:</strong> Pesapal holds funds until delivery confirmed</li>
                  <li>✓ <strong>Strict State Machine:</strong> Invalid transitions fail hard</li>
                  <li>✓ <strong>Full Audit Trail:</strong> Every financial event immutably logged</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>External Integrations</CardTitle>
              <CardDescription>Third-party system configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Mifos X Integration</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base URL:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">https://demo.mifos.io/fineract-provider/api/v1</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-green-600 font-semibold">✓ Connected (Simulated)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Loans created after customer authorization. Repayments posted from employer remittances.
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Pesapal Escrow</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Environment:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">Demo/Sandbox</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-green-600 font-semibold">✓ Connected (Simulated)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Funds held after authorization, released after delivery confirmation.
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">USSD/SMS Gateway</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">Console Logging (Demo)</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-yellow-600 font-semibold">⚠ Simulated</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Production: Integrate Africa's Talking or Twilio for real SMS delivery.
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Employer Payroll Systems</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Integration Type:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">API + File Upload</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Endpoints:</span>
                      <span className="text-blue-600 font-semibold">3 REST APIs</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Deduction instructions, remittance submission, bulk employee onboarding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Production Deployment Notes</h4>
                <ul className="text-sm space-y-1 text-yellow-800">
                  <li>• Set environment variables for Mifos X, Pesapal API keys</li>
                  <li>• Configure SMS gateway credentials (Africa's Talking recommended)</li>
                  <li>• Implement OAuth2 for employer/merchant API authentication</li>
                  <li>• Set up SSL certificates for all endpoints</li>
                  <li>• Enable PCI-DSS compliance for payment data</li>
                  <li>• Configure disaster recovery and backup procedures</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
