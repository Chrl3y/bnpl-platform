/**
 * Organization Dashboard
 * Top-level view showing all employers, employees, and portfolio metrics
 * Equivalent to "Center" view in Mifos X
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Building2, Users, TrendingUp, AlertCircle, CheckCircle2,
  DollarSign, Calendar, Filter, Download, Settings, Eye
} from 'lucide-react';

interface OrgMetrics {
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  activeContracts: number;
  defaultedContracts: number;
  portfolioAtRisk: number;
}

interface EmployerGroupSummary {
  id: string;
  name: string;
  employeeCount: number;
  activeLoans: number;
  totalDisbursed: number;
  portfolioAtRisk: number;
  status: string;
}

const mockOrgMetrics: OrgMetrics = {
  totalDisbursed: 125_000_000,
  totalOutstanding: 87_500_000,
  totalCollected: 37_500_000,
  activeContracts: 1250,
  defaultedContracts: 47,
  portfolioAtRisk: 3.8,
};

const mockEmployerGroups: EmployerGroupSummary[] = [
  {
    id: 'emp1',
    name: 'Uganda Revenue Authority',
    employeeCount: 450,
    activeLoans: 145,
    totalDisbursed: 45_000_000,
    portfolioAtRisk: 2.1,
    status: 'ACTIVE',
  },
  {
    id: 'emp2',
    name: 'Stanbic Bank Uganda',
    employeeCount: 320,
    activeLoans: 98,
    totalDisbursed: 38_500_000,
    portfolioAtRisk: 4.2,
    status: 'ACTIVE',
  },
  {
    id: 'emp3',
    name: 'Kampala City Council',
    employeeCount: 280,
    activeLoans: 87,
    totalDisbursed: 32_000_000,
    portfolioAtRisk: 5.1,
    status: 'ACTIVE',
  },
  {
    id: 'emp4',
    name: 'Uganda Medical Bureau',
    employeeCount: 195,
    activeLoans: 62,
    totalDisbursed: 9_500_000,
    portfolioAtRisk: 2.8,
    status: 'ACTIVE',
  },
];

const disbursementTrend = [
  { month: 'Jan', amount: 8_500_000 },
  { month: 'Feb', amount: 9_200_000 },
  { month: 'Mar', amount: 10_100_000 },
  { month: 'Apr', amount: 11_500_000 },
  { month: 'May', amount: 12_100_000 },
  { month: 'Jun', amount: 12_800_000 },
];

const portfolioRiskData = [
  { name: 'Low Risk', value: 72, color: '#10b981' },
  { name: 'Medium Risk', value: 20, color: '#f59e0b' },
  { name: 'High Risk', value: 8, color: '#ef4444' },
];

export default function OrganizationDashboard() {
  const [selectedEmployer, setSelectedEmployer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('month');

  const KPICard = ({ icon: Icon, label, value, trend, color }: any) => (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Dashboard</h1>
          <p className="text-gray-600 mt-1">Uganda Market - Complete Ecosystem Overview</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={DollarSign}
          label="Total Disbursed"
          value={`UGX ${(mockOrgMetrics.totalDisbursed / 1_000_000).toFixed(0)}M`}
          trend={12.5}
          color="bg-blue-500"
        />
        <KPICard
          icon={DollarSign}
          label="Outstanding Balance"
          value={`UGX ${(mockOrgMetrics.totalOutstanding / 1_000_000).toFixed(0)}M`}
          trend={-3.2}
          color="bg-amber-500"
        />
        <KPICard
          icon={CheckCircle2}
          label="Total Collected"
          value={`UGX ${(mockOrgMetrics.totalCollected / 1_000_000).toFixed(0)}M`}
          trend={8.1}
          color="bg-green-500"
        />
        <KPICard
          icon={AlertCircle}
          label="Portfolio at Risk"
          value={`${mockOrgMetrics.portfolioAtRisk}%`}
          trend={-0.5}
          color="bg-red-500"
        />
      </div>

      {/* KPI Cards - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          icon={Users}
          label="Active Contracts"
          value={mockOrgMetrics.activeContracts.toLocaleString()}
          trend={5.3}
          color="bg-purple-500"
        />
        <KPICard
          icon={Building2}
          label="Employer Groups"
          value={mockEmployerGroups.length}
          trend={2.0}
          color="bg-indigo-500"
        />
        <KPICard
          icon={AlertCircle}
          label="Defaulted Contracts"
          value={mockOrgMetrics.defaultedContracts}
          trend={-1.2}
          color="bg-red-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disbursement Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Disbursement Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={disbursementTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => `UGX ${(value / 1_000_000).toFixed(1)}M`}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio Risk Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={portfolioRiskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {portfolioRiskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employer Groups Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Employer Groups (Centers)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Group Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Employees</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Active Loans</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Total Disbursed</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Portfolio at Risk</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockEmployerGroups.map((group, idx) => (
                <tr
                  key={group.id}
                  className={`border-b ${selectedEmployer === group.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{group.name}</td>
                  <td className="px-6 py-4 text-gray-600">{group.employeeCount}</td>
                  <td className="px-6 py-4 text-gray-600">{group.activeLoans}</td>
                  <td className="px-6 py-4 text-gray-600">
                    UGX {(group.totalDisbursed / 1_000_000).toFixed(1)}M
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
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedEmployer(group.id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <div>
          <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
          <p className="text-2xl font-bold text-blue-600">95.2%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Average Loan Size</p>
          <p className="text-2xl font-bold text-blue-600">UGX 100K</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Avg. Tenor</p>
          <p className="text-2xl font-bold text-blue-600">3.2 months</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">New Employees (This Month)</p>
          <p className="text-2xl font-bold text-blue-600">+125</p>
        </div>
      </div>
    </div>
  );
}
