/**
 * Employee Client Dashboard
 * Individual employee view with transaction history, loan schedule, limits
 * Equivalent to "Client" view in Mifos X
 */

import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertCircle, CheckCircle2, Calendar,
  Clock, FileText, Download, Edit, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

interface Transaction {
  id: string;
  date: Date;
  type: 'CHECKOUT' | 'DISBURSEMENT' | 'REPAYMENT' | 'REVERSAL';
  description: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  reference: string;
}

interface LoanSchedule {
  installment: number;
  dueDate: Date;
  dueAmount: number;
  paidAmount: number;
  status: 'DUE' | 'PAID' | 'OVERDUE';
  daysOverdue: number;
}

const mockEmployee = {
  id: 'emp-001',
  name: 'Namusoke Grace',
  email: 'grace.namusoke@ura.go.ug',
  phone: '+256 701 234567',
  employeeNumber: 'URA-45821',
  department: 'Tax Compliance',
  jobTitle: 'Senior Tax Officer',
  netSalary: 2_500_000,
  employer: 'Uganda Revenue Authority',
  kycStatus: 'APPROVED',
  crbScore: 820,
  riskTier: 'TIER_1',
};

const mockCreditProfile = {
  creditLimit: 1_000_000,
  availableLimit: 400_000,
  usedLimit: 600_000,
  existingDeductions: 250_000,
  maxDeductible: 500_000,
};

const mockTransactions: Transaction[] = [
  {
    id: 'txn-001',
    date: new Date(2026, 0, 19),
    type: 'REPAYMENT',
    description: 'Repayment for Loan #CTR-2024-001925',
    amount: 333_333,
    status: 'COMPLETED',
    reference: 'REP-2026-0001',
  },
  {
    id: 'txn-002',
    date: new Date(2026, 0, 18),
    type: 'DISBURSEMENT',
    description: 'Loan Disbursement - Samsung Store',
    amount: 400_000,
    status: 'COMPLETED',
    reference: 'DSB-2026-0452',
  },
  {
    id: 'txn-003',
    date: new Date(2026, 0, 15),
    type: 'CHECKOUT',
    description: 'Checkout approved - Jumia Electronics',
    amount: 500_000,
    status: 'COMPLETED',
    reference: 'CHK-2026-3821',
  },
  {
    id: 'txn-004',
    date: new Date(2026, 0, 12),
    type: 'REPAYMENT',
    description: 'Repayment for Loan #CTR-2024-001920',
    amount: 266_667,
    status: 'COMPLETED',
    reference: 'REP-2026-0002',
  },
];

const mockLoanSchedules: LoanSchedule[] = [
  {
    installment: 1,
    dueDate: new Date(2026, 1, 15),
    dueAmount: 333_333,
    paidAmount: 0,
    status: 'DUE',
    daysOverdue: 0,
  },
  {
    installment: 2,
    dueDate: new Date(2026, 2, 15),
    dueAmount: 333_333,
    paidAmount: 0,
    status: 'DUE',
    daysOverdue: 0,
  },
  {
    installment: 3,
    dueDate: new Date(2026, 3, 15),
    dueAmount: 333_334,
    paidAmount: 0,
    status: 'DUE',
    daysOverdue: 0,
  },
];

const repaymentTrend = [
  { month: 'Dec', paid: 600_000, due: 666_000 },
  { month: 'Jan', paid: 600_000, due: 666_000 },
  { month: 'Feb', paid: 0, due: 666_000 },
];

export default function EmployeeClientDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Employee Info */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{mockEmployee.name}</h1>
            <div className="flex gap-4 text-blue-100">
              <span>📧 {mockEmployee.email}</span>
              <span>📱 {mockEmployee.phone}</span>
              <span>🏢 {mockEmployee.employer}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
            <Edit size={18} />
            Edit Profile
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-400">
          <div>
            <p className="text-sm text-blue-100">Employee ID</p>
            <p className="text-lg font-semibold">{mockEmployee.employeeNumber}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Net Salary</p>
            <p className="text-lg font-semibold">UGX {(mockEmployee.netSalary / 1_000_000).toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Risk Tier</p>
            <p className="text-lg font-semibold">{mockEmployee.riskTier}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">CRB Score</p>
            <p className="text-lg font-semibold">{mockEmployee.crbScore}/1000 ⭐</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Credit Limit</p>
              <p className="text-3xl font-bold text-gray-900">UGX {(mockCreditProfile.creditLimit / 1_000_000).toFixed(1)}M</p>
              <p className="text-sm text-green-600 mt-2">✓ Tier 1 (40% of salary)</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <DollarSign size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Available Limit</p>
              <p className="text-3xl font-bold text-green-600">UGX {(mockCreditProfile.availableLimit / 1_000_000).toFixed(1)}M</p>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(mockCreditProfile.availableLimit / mockCreditProfile.creditLimit) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Used Limit</p>
              <p className="text-3xl font-bold text-amber-600">UGX {(mockCreditProfile.usedLimit / 1_000_000).toFixed(1)}M</p>
              <p className="text-sm text-amber-600 mt-2">60% utilized</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500">
              <AlertCircle size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Deductions</p>
              <p className="text-3xl font-bold text-purple-600">UGX {(mockCreditProfile.existingDeductions / 1_000_000).toFixed(1)}M</p>
              <p className="text-sm text-purple-600 mt-2">50% of max allowed</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Clock size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-8">
        {['profile', 'transactions', 'schedule', 'loans'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verification Status */}
          <div className="lg:col-span-2 bg-white rounded-lg border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>

            <div className="space-y-4">
              {/* KYC */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">KYC Verification</p>
                    <p className="text-sm text-gray-600">Approved on Jan 10, 2026</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  ✓ Approved
                </span>
              </div>

              {/* CRB */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">CRB Verification</p>
                    <p className="text-sm text-gray-600">Score: 820/1000 (Good Standing)</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  ✓ Approved
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Apply for Loan
            </button>
            <button className="w-full px-4 py-3 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
              View All Loans
            </button>
            <button className="w-full px-4 py-3 bg-white border rounded-lg text-gray-900 hover:bg-gray-50 font-medium">
              Download Statement
            </button>
            <button className="w-full px-4 py-3 bg-white border rounded-lg text-gray-900 hover:bg-gray-50 font-medium">
              Message Support
            </button>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download size={18} />
              Export CSV
            </button>
          </div>

          <div className="space-y-2 p-6">
            {mockTransactions.map((txn) => (
              <div
                key={txn.id}
                onClick={() => setSelectedTransaction(txn.id)}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${
                  selectedTransaction === txn.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    txn.type === 'REPAYMENT' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {txn.type === 'REPAYMENT' ? (
                      <ArrowUpRight className={txn.type === 'REPAYMENT' ? 'text-red-600' : 'text-green-600'} size={20} />
                    ) : (
                      <ArrowDownLeft className="text-green-600" size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{txn.description}</p>
                    <p className="text-sm text-gray-600">{txn.reference}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-semibold ${
                    txn.type === 'REPAYMENT' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {txn.type === 'REPAYMENT' ? '-' : '+'}UGX {(txn.amount / 1_000_000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-gray-600">{txn.date.toLocaleDateString()}</p>
                </div>

                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
                  txn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  txn.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {txn.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Repayment Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Repayment Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={repaymentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `UGX ${(value / 1_000_000).toFixed(0)}M`} />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" name="Paid" />
                <Bar dataKey="due" fill="#f59e0b" name="Due" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Next Payment */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Next Payment</h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600 mb-1">Due Date</p>
                <p className="text-2xl font-bold text-yellow-600">Feb 15, 2026</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                <p className="text-2xl font-bold text-blue-600">UGX 333K</p>
              </div>
              <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loans Schedule Table */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg border mt-6">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Loan Repayment Schedule (Current Loan)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Installment</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Due Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount Due</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount Paid</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockLoanSchedules.map((schedule) => (
                  <tr key={schedule.installment} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{schedule.installment}</td>
                    <td className="px-6 py-4 text-gray-600">{schedule.dueDate.toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600">UGX {(schedule.dueAmount / 1_000_000).toFixed(1)}M</td>
                    <td className="px-6 py-4 text-gray-600">
                      {schedule.paidAmount > 0 ? `UGX ${(schedule.paidAmount / 1_000_000).toFixed(1)}M` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        schedule.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        schedule.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <div className="grid gap-4">
          {/* Active Loan */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Loan #CTR-2024-001925</h3>
                <p className="text-sm text-gray-600">Samsung Store Purchase</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Loan Amount</p>
                <p className="text-xl font-bold text-gray-900">UGX 1M</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tenor</p>
                <p className="text-xl font-bold text-gray-900">3 months</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Payment</p>
                <p className="text-xl font-bold text-gray-900">UGX 333K</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">UGX 667K</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
