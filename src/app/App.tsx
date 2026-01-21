import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { DashboardOverview } from '@/app/components/DashboardOverview';
import { ContractsView } from '@/app/components/ContractsView';
import { ReconciliationView } from '@/app/components/ReconciliationView';
import { EmployerView } from '@/app/components/EmployerView';
import { MerchantSimulator } from '@/app/components/MerchantSimulator';
import { SystemSetup } from '@/app/components/SystemSetup';
import { Card } from '@/app/components/ui/card';
import { Building2, TrendingUp, Users, Settings } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nova Microfinance</h1>
                <p className="text-sm text-gray-500">BNPL Platform - Production System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Card className="px-4 py-2">
                <div className="text-xs text-gray-500">System Status</div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">Operational</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Contracts</span>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger value="employers" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Employers</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Merchant Sim</span>
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Setup</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <ContractsView />
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-6">
            <ReconciliationView />
          </TabsContent>

          <TabsContent value="employers" className="space-y-6">
            <EmployerView />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <MerchantSimulator />
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <SystemSetup />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Nova Microfinance BNPL Platform v1.0</p>
            <p className="mt-1">
              Policy-based salary-backed BNPL • Mifos X Integration • Pesapal Escrow • Payroll Deduction
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}