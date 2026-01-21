/**
 * Live Lender Portfolio Dashboard
 * Shows real-time lender allocation and portfolio metrics
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { MultiLenderAllocationEngine } from '@/services/domain/MultiLenderAllocationEngine';

export function LiveLenderPortfolio() {
  const [selectedStrategy, setSelectedStrategy] = useState<'ROUND_ROBIN' | 'RISK_WEIGHTED'>('ROUND_ROBIN');
  const [allocations, setAllocations] = useState<any[]>([]);

  // Mock lenders with realistic portfolio data
  const mockLenders = [
    {
      id: 'lender_equity',
      name: 'Equity Bank Uganda',
      type: 'BANK' as const,
      country: 'Uganda' as const,
      capitalLimit: 5_000_000_000,
      capitalUtilized: 3_500_000_000,
      products: [],
      riskAppetite: 'MODERATE' as const,
      isActive: true,
      createdAt: new Date(),
      portfolioMetrics: {
        totalDisbursed: 3_500_000_000,
        totalOutstanding: 2_100_000_000,
        totalPaid: 1_400_000_000,
        par: 2.8,
        writeoffs: 85_000_000,
      },
    },
    {
      id: 'lender_dfcu',
      name: 'DFCU Bank',
      type: 'BANK' as const,
      country: 'Uganda' as const,
      capitalLimit: 3_000_000_000,
      capitalUtilized: 1_200_000_000,
      products: [],
      riskAppetite: 'AGGRESSIVE' as const,
      isActive: true,
      createdAt: new Date(),
      portfolioMetrics: {
        totalDisbursed: 1_200_000_000,
        totalOutstanding: 720_000_000,
        totalPaid: 480_000_000,
        par: 5.2,
        writeoffs: 45_000_000,
      },
    },
    {
      id: 'lender_stanchart',
      name: 'Standard Chartered Uganda',
      type: 'BANK' as const,
      country: 'Uganda' as const,
      capitalLimit: 2_500_000_000,
      capitalUtilized: 1_875_000_000,
      products: [],
      riskAppetite: 'CONSERVATIVE' as const,
      isActive: true,
      createdAt: new Date(),
      portfolioMetrics: {
        totalDisbursed: 1_875_000_000,
        totalOutstanding: 937_500_000,
        totalPaid: 937_500_000,
        par: 1.5,
        writeoffs: 25_000_000,
      },
    },
  ];

  // Simulate multiple allocations
  useEffect(() => {
    const simulated = [];
    for (let i = 0; i < 5; i++) {
      const amount = 500_000 + Math.random() * 2_000_000;
      const alloc = MultiLenderAllocationEngine.allocate({
        lenders: mockLenders,
        requestedAmount: Math.floor(amount),
        tenor: 90 + Math.floor(Math.random() * 90),
        riskTier: Math.random() > 0.5 ? 'TIER_1' : Math.random() > 0.5 ? 'TIER_2' : 'TIER_3',
        employerId: 'org_' + i,
        strategy: selectedStrategy,
      });

      if (alloc) {
        simulated.push(alloc);
      }
    }
    setAllocations(simulated);
  }, [selectedStrategy]);

  const stats = MultiLenderAllocationEngine.getAllocationStats(mockLenders);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={28} className="text-purple-600" />
        <h2 className="text-2xl font-bold text-purple-900">Multi-Lender Portfolio</h2>
      </div>

      {/* Strategy Selector */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Allocation Strategy</p>
        <div className="flex gap-3">
          {(['ROUND_ROBIN', 'RISK_WEIGHTED'] as const).map((strat) => (
            <button
              key={strat}
              onClick={() => setSelectedStrategy(strat)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedStrategy === strat
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              {strat}
            </button>
          ))}
        </div>
      </div>

      {/* Capital Utilization */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(stats).map(([lenderId, stat]: any) => {
          const lender = mockLenders.find((l) => l.id === lenderId);
          const utilizationPercent = stat.utilization;
          const color =
            utilizationPercent > 80 ? 'text-red-600' :
            utilizationPercent > 60 ? 'text-amber-600' :
            'text-green-600';

          return (
            <div key={lenderId} className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">{stat.name}</p>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Capital Utilized</span>
                  <span className={`font-bold ${color}`}>{utilizationPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      utilizationPercent > 80 ? 'bg-red-500' :
                      utilizationPercent > 60 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${utilizationPercent}%` }}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-1 text-xs">
                <p className="text-gray-600">
                  <span>Available:</span>
                  <span className="font-mono float-right">
                    UGX {(stat.capital.available / 1_000_000).toFixed(0)}M
                  </span>
                </p>
                <p className="text-gray-600">
                  <span>Total:</span>
                  <span className="font-mono float-right">
                    UGX {(stat.capital.total / 1_000_000).toFixed(0)}M
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio Performance */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {mockLenders.map((lender) => (
          <div key={lender.id} className="bg-white rounded-lg p-4 border border-purple-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">{lender.name}</p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Disbursed</span>
                <span className="font-mono font-bold">
                  UGX {(lender.portfolioMetrics.totalDisbursed / 1_000_000).toFixed(0)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding</span>
                <span className="font-mono font-bold text-amber-600">
                  UGX {(lender.portfolioMetrics.totalOutstanding / 1_000_000).toFixed(0)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Collections</span>
                <span className="font-mono font-bold text-green-600">
                  UGX {(lender.portfolioMetrics.totalPaid / 1_000_000).toFixed(0)}M
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600 flex items-center gap-1">
                  PAR
                  {lender.portfolioMetrics.par > 5 && (
                    <AlertTriangle size={12} className="text-red-600" />
                  )}
                </span>
                <span
                  className={`font-mono font-bold ${
                    lender.portfolioMetrics.par > 5 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {lender.portfolioMetrics.par.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Allocations */}
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-purple-600" />
          <h3 className="font-semibold text-gray-900">Recent Allocations</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-auto">
            {allocations.length} contracts routed
          </span>
        </div>

        <div className="space-y-2">
          {allocations.map((alloc, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 text-sm">
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {mockLenders.find((l) => l.id === alloc.lenderId)?.name}
                </p>
                <p className="text-xs text-gray-500">{alloc.allocationStrategy}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-purple-600">
                  UGX {(alloc.assignedAmount / 1_000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">allocated</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-3 p-2 bg-blue-50 rounded border border-blue-100">
          💡 Allocations are simulated based on the selected strategy. Real-time allocation depends on lender preferences, capital availability, and customer risk tier.
        </p>
      </div>
    </div>
  );
}

export default LiveLenderPortfolio;
