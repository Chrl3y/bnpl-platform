import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ShoppingCart, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-34d8f37e`;

export function MerchantSimulator() {
  const [policyNumber, setPolicyNumber] = useState('');
  const [amount, setAmount] = useState('10000');
  const [tenor, setTenor] = useState('2');
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const createOrder = async () => {
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/merchant/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_id: 'MERCH-001',
          policy_number: policyNumber,
          amount: parseFloat(amount),
          tenor_months: parseInt(tenor),
          items: [{ sku: 'PROD-001', name: 'Sample Product', quantity: 1, unit_price: parseFloat(amount), total_price: parseFloat(amount) }],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setOrder(data);
        toast.success('Order created! Customer will receive SMS authorization prompt');
      } else {
        toast.error(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const authorizeOrder = async () => {
    if (!pin) {
      toast.error('Please enter PIN');
      return;
    }

    setAuthorizing(true);
    try {
      const response = await fetch(`${API_BASE}/api/ussd/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: order.ussd_session_id,
          pin,
        }),
      });

      const data = await response.json();
      if (data.verified) {
        toast.success('Order authorized! Funds held in escrow');
        setOrder({ ...order, status: 'AUTHORIZED' });
      } else {
        toast.error(data.reason || 'Authorization failed');
      }
    } catch (error) {
      console.error('Error authorizing:', error);
      toast.error('Failed to authorize');
    } finally {
      setAuthorizing(false);
    }
  };

  const confirmDelivery = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`${API_BASE}/api/merchant/orders/${order.order_id}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Delivery confirmed! Funds released to merchant');
        setOrder({ ...order, status: 'DELIVERED' });
      } else {
        toast.error(data.error || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Merchant Checkout Simulator</h2>
        <p className="text-gray-500 mt-1">Simulate the complete BNPL purchase flow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Create Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm font-bold">1</div>
              Create Order
            </CardTitle>
            <CardDescription>Customer initiates BNPL purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="policy">Policy Number</Label>
              <Input
                id="policy"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="POL-EMP-ABC123"
              />
            </div>

            <div>
              <Label htmlFor="amount">Purchase Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
              />
            </div>

            <div>
              <Label htmlFor="tenor">Repayment Tenor</Label>
              <Select value={tenor} onValueChange={setTenor}>
                <SelectTrigger id="tenor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="2">2 Months</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={createOrder} disabled={creating || !policyNumber} className="w-full">
              <ShoppingCart className={`w-4 h-4 mr-2 ${creating ? 'animate-bounce' : ''}`} />
              {creating ? 'Creating...' : 'Create Order'}
            </Button>

            {order && order.payment_details && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="font-semibold text-blue-900 mb-2">Payment Breakdown</div>
                <div className="space-y-1 text-blue-700">
                  <div className="flex justify-between">
                    <span>Principal:</span>
                    <span>UGX {order.payment_details.principal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest (7%):</span>
                    <span>UGX {order.payment_details.interest.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees (5%):</span>
                    <span>UGX {(order.payment_details.operational_fee + order.payment_details.collection_fee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-blue-200 pt-1">
                    <span>Total:</span>
                    <span>UGX {order.payment_details.total_payable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Monthly:</span>
                    <span>UGX {order.payment_details.installment_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Authorize */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 text-sm font-bold">2</div>
              Customer Authorization
            </CardTitle>
            <CardDescription>Customer approves via PIN</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!order ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p>Create an order first</p>
              </div>
            ) : order.status === 'AUTHORIZED' || order.status === 'DELIVERED' ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                <p className="text-green-900 font-semibold">Order Authorized</p>
                <p className="text-sm text-gray-500 mt-1">Funds held in escrow</p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <p className="text-yellow-900 font-semibold">📱 SMS Sent to Customer</p>
                  <p className="text-yellow-700 mt-1">
                    "Nova Microfinance BNPL: Authorization required for your purchase. Reply with your PIN to approve."
                  </p>
                </div>

                <div>
                  <Label htmlFor="pin">Enter PIN (for simulation)</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use "1234" for demo (or the PIN set in Setup)
                  </p>
                </div>

                <Button onClick={authorizeOrder} disabled={authorizing || !pin} className="w-full">
                  <CreditCard className={`w-4 h-4 mr-2 ${authorizing ? 'animate-pulse' : ''}`} />
                  {authorizing ? 'Authorizing...' : 'Authorize Purchase'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Confirm Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2 text-sm font-bold">3</div>
              Confirm Delivery
            </CardTitle>
            <CardDescription>Release funds to merchant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!order || (order.status !== 'AUTHORIZED' && order.status !== 'DELIVERED') ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p>Authorize order first</p>
              </div>
            ) : order.status === 'DELIVERED' ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                <p className="text-green-900 font-semibold">Delivery Confirmed</p>
                <p className="text-sm text-gray-500 mt-1">Funds released to merchant</p>
                <Badge className="mt-3 bg-green-600">Contract IN_REPAYMENT</Badge>
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-blue-900 font-semibold mb-2">Current Status</p>
                  <div className="space-y-1 text-blue-700">
                    <div>✓ Order created</div>
                    <div>✓ Customer authorized</div>
                    <div>✓ Funds held in Pesapal escrow</div>
                    <div>✓ Loan created in Mifos X</div>
                    <div className="text-orange-700">⏳ Awaiting delivery confirmation</div>
                  </div>
                </div>

                <Button onClick={confirmDelivery} disabled={confirming} className="w-full">
                  <CheckCircle className={`w-4 h-4 mr-2 ${confirming ? 'animate-spin' : ''}`} />
                  {confirming ? 'Confirming...' : 'Confirm Delivery'}
                </Button>

                <p className="text-xs text-gray-500">
                  This triggers: Pesapal release → Mifos X activation → Deduction instructions to employer
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle>Order Status & Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Order ID</div>
                <div className="font-mono text-xs mt-1">{order.order_id?.substring(0, 12)}...</div>
              </div>
              <div>
                <div className="text-gray-500">Contract ID</div>
                <div className="font-mono text-xs mt-1">{order.contract_id?.substring(0, 12)}...</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <Badge className="mt-1">{order.status || 'PENDING'}</Badge>
              </div>
              <div>
                <div className="text-gray-500">Session Expires</div>
                <div className="text-xs mt-1">
                  {order.authorization_expires_at ? new Date(order.authorization_expires_at).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
