/**
 * Optimized Home Page Layout
 * Hierarchical dashboard with quick navigation to all levels
 * Organizations → Employer Groups → Employees
 */

import React, { useState } from 'react';
import {
  BarChart3, Users, Building2, TrendingUp, ArrowRight,
  Globe, Target, Shield, Zap, Calendar, Bell, Settings
} from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export default function OptimizedHomePage() {
  const [selectedOrg, setSelectedOrg] = useState('uganda');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Key Statistics
  const keyStats: StatCard[] = [
    {
      label: 'Total Platform Value',
      value: 'UGX 125B+',
      trend: 23,
      icon: <TrendingUp className="text-blue-600" size={24} />,
      color: 'bg-blue-50',
    },
    {
      label: 'Active Employers',
      value: 1250,
      trend: 15,
      icon: <Building2 className="text-green-600" size={24} />,
      color: 'bg-green-50',
    },
    {
      label: 'Active Employees',
      value: '125K+',
      trend: 28,
      icon: <Users className="text-purple-600" size={24} />,
      color: 'bg-purple-50',
    },
    {
      label: 'Monthly Transactions',
      value: '45.2K',
      trend: 18,
      icon: <BarChart3 className="text-amber-600" size={24} />,
      color: 'bg-amber-50',
    },
  ];

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      title: 'View All Organizations',
      description: 'Manage markets, regions, and operations centers',
      icon: <Globe size={24} />,
      action: () => setSelectedOrg('all'),
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Onboard Employer Group',
      description: 'Add new companies or institutions',
      icon: <Building2 size={24} />,
      action: () => console.log('Onboard employer'),
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Manage Employees',
      description: 'View, verify, and manage employee profiles',
      icon: <Users size={24} />,
      action: () => console.log('Manage employees'),
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Portfolio Analytics',
      description: 'View risk distribution and performance metrics',
      icon: <BarChart3 size={24} />,
      action: () => console.log('View analytics'),
      color: 'from-amber-500 to-amber-600',
    },
  ];

  // Featured Metrics
  const featuredMetrics = [
    {
      title: 'Portfolio at Risk',
      value: '3.8%',
      description: 'Well-maintained collection rates',
      status: 'good',
    },
    {
      title: 'Average Repayment',
      value: '95.2%',
      description: 'Strong customer discipline',
      status: 'excellent',
    },
    {
      title: 'Processing Speed',
      value: '<1 second',
      description: 'Checkout decision SLA',
      status: 'excellent',
    },
    {
      title: 'KYC Completion',
      value: '94.3%',
      description: 'Employees verified',
      status: 'excellent',
    },
  ];

  // Recent Organizations
  const recentOrganizations = [
    {
      id: 'org-001',
      name: 'Uganda Market',
      employers: 450,
      employees: 45_250,
      totalValue: 'UGX 45B',
      status: 'ACTIVE',
      color: 'from-blue-400 to-blue-600',
    },
    {
      id: 'org-002',
      name: 'Kenya Operations',
      employers: 320,
      employees: 38_500,
      totalValue: 'UGX 35B',
      status: 'ACTIVE',
      color: 'from-green-400 to-green-600',
    },
    {
      id: 'org-003',
      name: 'Tanzania Expansion',
      employers: 180,
      employees: 22_100,
      totalValue: 'UGX 20B',
      status: 'ACTIVE',
      color: 'from-amber-400 to-amber-600',
    },
    {
      id: 'org-004',
      name: 'Rwanda Hub',
      employers: 95,
      employees: 8_550,
      totalValue: 'UGX 8.5B',
      status: 'GROWING',
      color: 'from-purple-400 to-purple-600',
    },
  ];

  // Top Employer Groups
  const topEmployerGroups = [
    {
      name: 'Uganda Revenue Authority',
      employees: 450,
      activeLoans: 145,
      collectionsRate: 98.2,
      portfolioAtRisk: 2.1,
    },
    {
      name: 'Stanbic Bank Uganda',
      employees: 320,
      activeLoans: 98,
      collectionsRate: 96.5,
      portfolioAtRisk: 3.2,
    },
    {
      name: 'Kampala City Council',
      employees: 280,
      activeLoans: 87,
      collectionsRate: 94.1,
      portfolioAtRisk: 5.1,
    },
    {
      name: 'Uganda Medical Bureau',
      employees: 195,
      activeLoans: 62,
      collectionsRate: 97.8,
      portfolioAtRisk: 2.8,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">Multi-Level Ecosystem Overview</h1>
            <p className="text-blue-100 mb-6 text-lg">
              Monitor and manage your entire BNPL network: Organizations → Employer Groups → Employees
            </p>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold flex items-center gap-2">
                <Zap size={20} />
                Quick Start
              </button>
              <button className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 font-semibold flex items-center gap-2 border border-white/30">
                <Bell size={20} />
                View Alerts
              </button>
            </div>
          </div>
          <div className="hidden lg:block text-right">
            <p className="text-blue-100 mb-4">Current Focus</p>
            <div className="text-3xl font-bold">Uganda Market</div>
            <p className="text-blue-200 text-sm">45,250 employees | 450 employers</p>
          </div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyStats.map((stat, idx) => (
          <div key={idx} className={`${stat.color} border rounded-lg p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div>{stat.icon}</div>
              {stat.trend && (
                <span className="text-sm font-semibold text-green-600">↑ {stat.trend}%</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className={`bg-gradient-to-br ${action.color} text-white p-6 rounded-lg hover:shadow-lg transition group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition">
                  {action.icon}
                </div>
                <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
              <h3 className="font-semibold text-left mb-1">{action.title}</h3>
              <p className="text-sm text-white/80 text-left">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredMetrics.map((metric, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">{metric.title}</p>
                {metric.status === 'excellent' && (
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                )}
                {metric.status === 'good' && (
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</p>
              <p className="text-xs text-gray-600">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Organizations Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Organizations (Centers)</h2>
          <button className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2">
            View All <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recentOrganizations.map((org) => (
            <div key={org.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition">
              <div className={`bg-gradient-to-r ${org.color} h-2`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{org.totalValue}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    {org.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Employer Groups</p>
                    <p className="text-2xl font-bold text-gray-900">{org.employers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{org.employees.toLocaleString()}</p>
                  </div>
                </div>

                <button className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium text-sm">
                  Manage Organization
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Employer Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Top Employer Groups (Uganda)</h2>
          <button className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2">
            View All <ArrowRight size={18} />
          </button>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Group Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Employees</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Active Loans</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Collections %</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Portfolio at Risk</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {topEmployerGroups.map((group, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{group.name}</td>
                  <td className="px-6 py-4 text-gray-600">{group.employees}</td>
                  <td className="px-6 py-4 text-gray-600">{group.activeLoans}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      {group.collectionsRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      group.portfolioAtRisk < 3 ? 'bg-green-100 text-green-800' :
                      group.portfolioAtRisk < 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {group.portfolioAtRisk}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Capabilities */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Hierarchical Management',
              description: 'Manage multiple organizations, employer groups, and employees in one platform',
              icon: '🏗️',
            },
            {
              title: 'Real-time Analytics',
              description: 'Track portfolio performance, risk metrics, and collection rates in real-time',
              icon: '📊',
            },
            {
              title: 'Multi-lender Routing',
              description: 'Intelligent allocation of loans across multiple lenders for optimal yield',
              icon: '🔀',
            },
            {
              title: 'KYC & CRB Integration',
              description: 'Automated employee verification with KYC and CRB checks',
              icon: '✅',
            },
            {
              title: 'Payroll Deduction',
              description: 'Direct employer salary deductions for seamless repayment',
              icon: '💰',
            },
            {
              title: 'Audit & Compliance',
              description: 'Complete transaction history and compliance reporting',
              icon: '📋',
            },
          ].map((capability, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
              <p className="text-4xl mb-3">{capability.icon}</p>
              <h3 className="font-bold text-gray-900 mb-2">{capability.title}</h3>
              <p className="text-sm text-gray-600">{capability.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
