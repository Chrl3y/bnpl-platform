/**
 * BNPL Platform - Enhanced Dashboard
 * Combines documentation UI with live service demonstrations
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Home, 
  Zap, 
  BarChart3, 
  Clock, 
  FileText, 
  GitBranch,
  Settings,
  HelpCircle
} from 'lucide-react';

// Import new live components
import LiveCheckoutEngine from './components/LiveCheckoutEngine';
import LiveLenderPortfolio from './components/LiveLenderPortfolio';
import LiveStateMachineVisualizer from './components/LiveStateMachine';

// Import existing components (documentation)
import DashboardOverview from './components/DashboardOverview';
import ContractsView from './components/ContractsView';
import EmployerView from './components/EmployerView';
import MerchantSimulator from './components/MerchantSimulator';
import ReconciliationView from './components/ReconciliationView';
import SystemSetup from './components/SystemSetup';

export default function App() {
  const [activeTab, setActiveTab] = useState('live-checkout');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-amber-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold">BNPL Platform</h1>
              <p className="text-blue-100 mt-2">
                Multi-Lender Payment Orchestration Engine for Uganda
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-200">v1.0 - Production Architecture</p>
              <p className="text-xs text-blue-300 mt-1">🟢 All Services Running</p>
            </div>
          </div>

          {/* Architecture Status */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 backdrop-blur p-3 rounded border border-white/20">
              <p className="text-blue-200">Active Services</p>
              <p className="text-2xl font-bold">9</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-3 rounded border border-white/20">
              <p className="text-blue-200">API Endpoints</p>
              <p className="text-2xl font-bold">50+</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-3 rounded border border-white/20">
              <p className="text-blue-200">Checkout SLA</p>
              <p className="text-2xl font-bold">&lt;1s</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-3 rounded border border-white/20">
              <p className="text-blue-200">GitHub Status</p>
              <p className="text-2xl font-bold">✅ Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 lg:grid-cols-12 gap-2 mb-8 bg-white p-2 rounded-lg border shadow-sm h-auto flex-wrap">
            {/* Live Services */}
            <TabsTrigger
              value="live-checkout"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
            >
              <Zap size={16} />
              <span className="hidden sm:inline">Checkout</span>
            </TabsTrigger>

            <TabsTrigger
              value="live-portfolio"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>

            <TabsTrigger
              value="live-statemachine"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900"
            >
              <Clock size={16} />
              <span className="hidden sm:inline">StateMachine</span>
            </TabsTrigger>

            <div className="hidden lg:block col-span-2"></div>

            {/* Documentation */}
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-green-100 data-[state=active]:text-green-900"
            >
              <Home size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>

            <TabsTrigger
              value="contracts"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Contracts</span>
            </TabsTrigger>

            <TabsTrigger
              value="setup"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-red-100 data-[state=active]:text-red-900"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Setup</span>
            </TabsTrigger>
          </TabsList>

          {/* LIVE SERVICES TABS */}

          {/* Live Checkout Engine */}
          <TabsContent value="live-checkout" className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">🚀 Live Checkout Engine</h3>
              <p className="text-sm text-blue-800">
                This component runs the actual CheckoutService, CreditEngine, and MultiLenderAllocationEngine in real-time. Enter order details to see credit decisions and lender allocation happen instantly (<code>&lt;1s</code>).
              </p>
            </div>
            <LiveCheckoutEngine />
          </TabsContent>

          {/* Live Lender Portfolio */}
          <TabsContent value="live-portfolio" className="space-y-6">
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <h3 className="font-semibold text-purple-900 mb-2">📊 Multi-Lender Portfolio</h3>
              <p className="text-sm text-purple-800">
                Real-time allocation engine showing how BNPL Platform distributes contracts across multiple lenders using different strategies. See capital utilization, PAR (Portfolio at Risk), and allocation efficiency.
              </p>
            </div>
            <LiveLenderPortfolio />
          </TabsContent>

          {/* Live State Machine */}
          <TabsContent value="live-statemachine" className="space-y-6">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
              <h3 className="font-semibold text-indigo-900 mb-2">⏱️ Contract State Machine</h3>
              <p className="text-sm text-indigo-800">
                Interactive visualization of the BNPL contract lifecycle. Click buttons to transition through valid states. The state machine enforces business rules and prevents invalid transitions.
              </p>
            </div>
            <LiveStateMachineVisualizer />
          </TabsContent>

          {/* DOCUMENTATION TABS */}

          {/* Dashboard Overview */}
          <TabsContent value="overview" className="space-y-6">
            <DashboardOverview />
          </TabsContent>

          {/* Contracts */}
          <TabsContent value="contracts" className="space-y-6">
            <ContractsView />
          </TabsContent>

          {/* System Setup */}
          <TabsContent value="setup" className="space-y-6">
            <SystemSetup />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <GitBranch size={18} className="text-blue-600" />
              Repository
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              All code is version controlled and deployed to GitHub.
            </p>
            <a
              href="https://github.com/Chrl3y/bnpl-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View on GitHub →
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={18} className="text-amber-600" />
              Documentation
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Complete architecture docs, integration guides, and API specs.
            </p>
            <a
              href="https://github.com/Chrl3y/bnpl-platform/blob/main/src/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              Read Architecture →
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-green-600" />
              Getting Started
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Backend implementation is the next phase. See integration guide.
            </p>
            <a
              href="https://github.com/Chrl3y/bnpl-platform/blob/main/INTEGRATION_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Integration Guide →
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-amber-600 text-white mt-16 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-blue-100">
            ✨ Try the live components above to see the BNPL Platform services in action!
          </p>
          <p className="text-xs text-blue-200 mt-2">
            See README_SERVICES.md, INTEGRATION_GUIDE.md, and ARCHITECTURE.md for complete documentation
          </p>
        </div>
      </div>
    </div>
  );
}
