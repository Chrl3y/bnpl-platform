/**
 * BNPL Platform - Hierarchical Multi-Level Dashboard
 * Organizations → Employer Groups → Employees
 * 
 * Mifos X-style architecture with:
 * - Center (Organization) management
 * - Group (Employer) management
 * - Client (Employee) profiles with transaction history
 * - Employee portal for onboarding & verification
 */

import React, { useState } from 'react';
import {
  Globe, Building2, Users, Home, LogOut, Menu, X,
  ChevronDown, Bell, Settings, HelpCircle, User
} from 'lucide-react';

// Import new hierarchical components
import OptimizedHomePage from './components/OptimizedHomePage';
import OrganizationDashboard from './components/OrganizationDashboard';
import EmployerGroupDashboard from './components/EmployerGroupDashboard';
import EmployeeClientDashboard from './components/EmployeeClientDashboard';
import EmployeePortal from './components/EmployeePortal';

// Import existing components
import LiveCheckoutEngine from './components/LiveCheckoutEngine';
import LiveLenderPortfolio from './components/LiveLenderPortfolio';
import LiveStateMachineVisualizer from './components/LiveStateMachine';
import DashboardOverview from './components/DashboardOverview';
import ContractsView from './components/ContractsView';
import SystemSetup from './components/SystemSetup';

type NavItem = 'home' | 'organizations' | 'employer-groups' | 'employees' | 'portal' | 
              'live-checkout' | 'live-portfolio' | 'live-statemachine' | 'overview' | 'contracts' | 'setup';

interface NavSection {
  title: string;
  items: Array<{
    id: NavItem;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }>;
}

export default function AppHierarchical() {
  const [activeTab, setActiveTab] = useState<NavItem>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigationSections: NavSection[] = [
    {
      title: 'Hierarchy Management',
      items: [
        { id: 'home', label: 'Dashboard', icon: <Home size={20} /> },
        { id: 'organizations', label: 'Organizations (Centers)', icon: <Globe size={20} /> },
        { id: 'employer-groups', label: 'Employer Groups', icon: <Building2 size={20} /> },
        { id: 'employees', label: 'Employees (Clients)', icon: <Users size={20} /> },
      ],
    },
    {
      title: 'Employee Services',
      items: [
        { id: 'portal', label: 'Onboarding Portal', icon: <Users size={20} />, badge: 'NEW' },
      ],
    },
    {
      title: 'Live Services Demo',
      items: [
        { id: 'live-checkout', label: 'Checkout Engine', icon: <Globe size={20} /> },
        { id: 'live-portfolio', label: 'Lender Portfolio', icon: <Building2 size={20} /> },
        { id: 'live-statemachine', label: 'State Machine', icon: <Users size={20} /> },
      ],
    },
    {
      title: 'Documentation',
      items: [
        { id: 'overview', label: 'Overview', icon: <Home size={20} /> },
        { id: 'contracts', label: 'Contracts', icon: <Building2 size={20} /> },
        { id: 'setup', label: 'Setup', icon: <Settings size={20} /> },
      ],
    },
  ];

  const getComponentForTab = (tab: NavItem) => {
    switch (tab) {
      case 'home':
        return <OptimizedHomePage />;
      case 'organizations':
        return <OrganizationDashboard />;
      case 'employer-groups':
        return <EmployerGroupDashboard />;
      case 'employees':
        return <EmployeeClientDashboard />;
      case 'portal':
        return <EmployeePortal />;
      case 'live-checkout':
        return <LiveCheckoutEngine />;
      case 'live-portfolio':
        return <LiveLenderPortfolio />;
      case 'live-statemachine':
        return <LiveStateMachineVisualizer />;
      case 'overview':
        return <DashboardOverview />;
      case 'contracts':
        return <ContractsView />;
      case 'setup':
        return <SystemSetup />;
      default:
        return <OptimizedHomePage />;
    }
  };

  const getTitleForTab = (tab: NavItem): string => {
    const titles: Record<NavItem, string> = {
      home: 'Dashboard',
      organizations: 'Organizations',
      'employer-groups': 'Employer Groups',
      employees: 'Employees',
      portal: 'Employee Portal',
      'live-checkout': 'Live Checkout Engine',
      'live-portfolio': 'Live Lender Portfolio',
      'live-statemachine': 'Live State Machine',
      overview: 'Overview',
      contracts: 'Contracts',
      setup: 'Setup',
    };
    return titles[tab] || 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center font-bold">
              B
            </div>
            <div>
              <h1 className="font-bold text-lg">BNPL</h1>
              <p className="text-xs text-gray-400">Payment Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false); // Close on mobile
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-sm font-medium transition ${
                      activeTab === item.id
                        ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded flex items-center gap-2">
            <HelpCircle size={18} />
            Help & Support
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded flex items-center gap-2">
            <Settings size={18} />
            Settings
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded flex items-center gap-2">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          {/* Left: Toggle Sidebar + Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-600">BNPL Platform</p>
              <h2 className="text-lg font-bold text-gray-900">{getTitleForTab(activeTab)}</h2>
            </div>
          </div>

          {/* Right: Notifications + User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  AN
                </div>
                <span className="text-sm font-medium hidden sm:inline">Admin</span>
                <ChevronDown size={16} />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <User size={16} />
                    My Profile
                  </button>
                  <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Settings size={16} />
                    Settings
                  </button>
                  <button className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            {getComponentForTab(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}
