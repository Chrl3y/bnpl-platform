/**
 * Employer Group Dashboard
 * Mid-level view showing all employees within an employer group
 * Equivalent to "Group" view in Mifos X
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, TrendingUp, AlertCircle, CheckCircle2, Calendar,
  Filter, Download, Plus, Search, Eye, Edit
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  name: string;
  employeeNumber: string;
  salary: number;
  activeLoans: number;
  totalBorrowed: number;
  repaymentRate: number;
  riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  status: 'ACTIVE' | 'INACTIVE';
  kycStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  crbStatus: 'APPROVED' | 'PENDING' | 'NOT_FOUND';
}

const mockEmployees: EmployeeProfile[] = [
  {
    id: 'emp-001',
    name: 'Namusoke Grace',
    employeeNumber: 'URA-45821',
    salary: 2_500_000,
    activeLoans: 2,
    totalBorrowed: 600_000,
    repaymentRate: 98,
    riskTier: 'TIER_1',
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    crbStatus: 'APPROVED',
  },
  {
    id: 'emp-002',
    name: 'Kamya Michael',
    employeeNumber: 'URA-45822',
    salary: 1_800_000,
    activeLoans: 1,
    totalBorrowed: 400_000,
    repaymentRate: 95,
    riskTier: 'TIER_2',
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    crbStatus: 'APPROVED',
  },
  {
    id: 'emp-003',
    name: 'Mwase Judith',
    employeeNumber: 'URA-45823',
    salary: 3_200_000,
    activeLoans: 3,
    totalBorrowed: 800_000,
    repaymentRate: 92,
    riskTier: 'TIER_1',
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    crbStatus: 'APPROVED',
  },
  {
    id: 'emp-004',
    name: 'Lubwama Samuel',
    employeeNumber: 'URA-45824',
    salary: 1_500_000,
    activeLoans: 0,
    totalBorrowed: 0,
    repaymentRate: 0,
    riskTier: 'TIER_3',
    status: 'ACTIVE',
    kycStatus: 'PENDING',
    crbStatus: 'PENDING',
  },
  {
    id: 'emp-005',
    name: 'Nabirye Fatima',
    employeeNumber: 'URA-45825',
    salary: 2_100_000,
    activeLoans: 1,
    totalBorrowed: 350_000,
    repaymentRate: 89,
    riskTier: 'TIER_2',
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    crbStatus: 'APPROVED',
  },
];

const salaryDistribution = [
  { range: '1-1.5M', count: 8 },
  { range: '1.5-2M', count: 15 },
  { range: '2-2.5M', count: 22 },
  { range: '2.5-3M', count: 18 },
  { range: '3M+', count: 12 },
];

const employeeRiskMatrix = [
  { salary: 1_500_000, borrowed: 0, tier: 'TIER_3', name: 'Lubwama S.' },
  { salary: 1_800_000, borrowed: 400_000, tier: 'TIER_2', name: 'Kamya M.' },
  { salary: 2_100_000, borrowed: 350_000, tier: 'TIER_2', name: 'Nabirye F.' },
  { salary: 2_500_000, borrowed: 600_000, tier: 'TIER_1', name: 'Namusoke G.' },
  { salary: 3_200_000, borrowed: 800_000, tier: 'TIER_1', name: 'Mwase J.' },
];

export default function EmployerGroupDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const filteredEmployees = mockEmployees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const groupStats = {
    totalEmployees: mockEmployees.length,
    activeLoans: mockEmployees.reduce((sum, e) => sum + e.activeLoans, 0),
    totalDisbursed: mockEmployees.reduce((sum, e) => sum + e.totalBorrowed, 0),
    avgSalary: Math.round(mockEmployees.reduce((sum, e) => sum + e.salary, 0) / mockEmployees.length),
    avgRepaymentRate: Math.round(mockEmployees.filter(e => e.repaymentRate > 0).reduce((sum, e) => sum + e.repaymentRate, 0) / mockEmployees.filter(e => e.repaymentRate > 0).length),
    kycApproved: mockEmployees.filter(e => e.kycStatus === 'APPROVED').length,
    crbApproved: mockEmployees.filter(e => e.crbStatus === 'APPROVED').length,
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER_1':
        return 'text-green-600 bg-green-100';
      case 'TIER_2':
        return 'text-amber-600 bg-amber-100';
      case 'TIER_3':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Group: Uganda Revenue Authority</h1>
          <p className="text-gray-600 mt-1">Manage employees, verify documents, track repayment performance</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
            <Download size={18} />
            <span>Export</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.totalEmployees}</p>
              <p className="text-sm text-green-600 mt-2">✓ {groupStats.kycApproved} KYC Approved</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Active Loans</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.activeLoans}</p>
              <p className="text-sm text-green-600 mt-2">↑ 8% this month</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircle2 size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Disbursed</p>
              <p className="text-3xl font-bold text-gray-900">UGX {(groupStats.totalDisbursed / 1_000_000).toFixed(1)}M</p>
              <p className="text-sm text-blue-600 mt-2">Avg Loan: {(groupStats.totalDisbursed / groupStats.activeLoans / 100_000).toFixed(0)}K</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Repayment Rate</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.avgRepaymentRate}%</p>
              <p className="text-sm text-green-600 mt-2">Collection: Excellent</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Calendar size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Salary Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salaryDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Matrix: Salary vs Borrowed */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Matrix: Salary vs Borrowed</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="salary" name="Salary (UGX)" />
              <YAxis dataKey="borrowed" name="Borrowed (UGX)" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={employeeRiskMatrix} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Employees ({filteredEmployees.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Employee</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Salary</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Tier</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Active Loans</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">KYC</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">CRB</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Repayment %</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className={`border-b ${selectedEmployee === emp.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedEmployee(emp.id)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-600">{emp.employeeNumber}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    UGX {(emp.salary / 1_000_000).toFixed(1)}M
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(emp.riskTier)}`}>
                      {emp.riskTier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{emp.activeLoans}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      emp.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      emp.kycStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {emp.kycStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      emp.crbStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      emp.crbStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {emp.crbStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${emp.repaymentRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{emp.repaymentRate}%</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-6 rounded-lg border">
        <div>
          <p className="text-sm text-gray-600 mb-1">Verified Employees</p>
          <p className="text-2xl font-bold text-blue-600">{groupStats.kycApproved}/{groupStats.totalEmployees}</p>
          <p className="text-xs text-gray-600 mt-1">{Math.round(groupStats.kycApproved / groupStats.totalEmployees * 100)}% KYC Complete</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">CRB Verified</p>
          <p className="text-2xl font-bold text-blue-600">{groupStats.crbApproved}/{groupStats.totalEmployees}</p>
          <p className="text-xs text-gray-600 mt-1">{Math.round(groupStats.crbApproved / groupStats.totalEmployees * 100)}% CRB Complete</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Average Salary</p>
          <p className="text-2xl font-bold text-blue-600">UGX {(groupStats.avgSalary / 1_000_000).toFixed(1)}M</p>
          <p className="text-xs text-gray-600 mt-1">Typical salary range in group</p>
        </div>
      </div>
    </div>
  );
}
